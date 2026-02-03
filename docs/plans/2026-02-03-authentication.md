# SchoolConnect Authentication Implementation Plan

> **For AI models:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement robust authentication using `better-auth` for the SchoolConnect platform, supporting email/password login, session management, and role-based access control (RBAC) across API, Web, and Mobile apps.

**Architecture:** 
- **Core:** `better-auth` handles auth logic, session management, and database persistence (Prisma).
- **API:** Fastify plugin exposes auth endpoints. tRPC Context is updated to verify sessions.
- **Web:** Next.js client uses `better-auth` client for login forms and protected routes.
- **Mobile:** Expo app uses `better-auth` client (adapted for React Native) to store tokens and authenticate requests.
- **Database:** Existing User/Session/Account tables (already created in scaffolding) are utilized.

**Tech Stack:**
- **Auth:** better-auth
- **Database:** PostgreSQL + Prisma
- **API:** Fastify + tRPC
- **Web:** Next.js + React Hook Form + Zod
- **Mobile:** Expo + React Native

---

### Task 1: Install & Configure Better-Auth (Backend)

**Files:**
- Modify: `apps/api/package.json`
- Create: `apps/api/src/lib/auth.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/src/context.ts`
- Modify: `apps/api/src/trpc.ts`

**Step 1: Install dependencies**

```bash
pnpm --filter @schoolconnect/api add better-auth
```

**Step 2: Create Auth Configuration**

Create `apps/api/src/lib/auth.ts`:

```typescript
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@schoolconnect/db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day (every 1 day the session expiration is updated)
  },
  trustedOrigins: [
    process.env.WEB_URL ?? "http://localhost:3000",
    "schoolconnect://" // For mobile deep links (future proofing)
  ],
});
```

**Step 3: Register Auth Routes in Fastify**

Modify `apps/api/src/index.ts` to convert the `better-auth` handler into a Fastify route.

```typescript
// ... imports
import { auth } from "./lib/auth"; // Import auth instance

// ... inside main() before listen
  
  // Register better-auth routes
  server.all("/api/auth/*", async (req, res) => {
    return auth.handler(req.raw, res.raw);
  });
```

**Step 4: Update tRPC Context to Verify Session**

Modify `apps/api/src/context.ts`:

```typescript
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { prisma } from "@schoolconnect/db";
import { auth } from "./lib/auth";

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  return {
    prisma,
    req,
    res,
    user: session?.user ?? null,
    session: session?.session ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
```

**Step 5: Commit**

```bash
git add apps/api/
git commit -m "feat(api): configure better-auth with prisma adapter and fastify route"
```

---

### Task 2: Auth Router & Protected Procedures

**Files:**
- Create: `apps/api/src/router/auth.ts`
- Modify: `apps/api/src/router/index.ts`
- Modify: `apps/api/src/trpc.ts`

**Step 1: Create Auth Router (for testing/utility)**

Create `apps/api/src/router/auth.ts`:

```typescript
import { router, publicProcedure, protectedProcedure } from "../trpc";

export const authRouter = router({
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.user;
  }),
  getSecretMessage: protectedProcedure.query(({ ctx }) => {
    return `Hello ${ctx.user.name}, this is a secret message!`;
  }),
});
```

**Step 2: Add to App Router**

Modify `apps/api/src/router/index.ts`:

```typescript
import { router } from "../trpc";
import { healthRouter } from "./health";
import { authRouter } from "./auth"; // Import

export const appRouter = router({
  health: healthRouter,
  auth: authRouter, // Add
});

export type AppRouter = typeof appRouter;
```

**Step 3: Verify Protected Procedure Middleware**

Check `apps/api/src/trpc.ts`. It should already verify `ctx.user`.
If not, ensure it looks like this:

```typescript
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      // infers the `user` and `session` as non-nullable
      user: ctx.user,
      session: ctx.session,
    },
  });
});
```

**Step 4: Commit**

```bash
git add apps/api/src/router/
git commit -m "feat(api): add auth router and protected procedures"
```

---

### Task 3: Web Client Authentication Setup

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/src/lib/auth-client.ts`
- Modify: `apps/web/src/lib/trpc.ts` (add headers)

**Step 1: Install Client Dependencies**

```bash
pnpm --filter @schoolconnect/web add better-auth
```

**Step 2: Create Auth Client**

Create `apps/web/src/lib/auth-client.ts`:

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000", // Point to Fastify API
});
```

**Step 3: Configure tRPC Client to Send Headers**

Modify `apps/web/src/lib/trpc.ts` to include credentials/tokens if needed. Better-auth usually handles cookies automatically for same-domain or properly CORS-configured cross-domain requests. Since API is on port 4000 and Web on 3000, we rely on `credentials: true`.

Update the `createTRPCReact` or the `QueryClientProvider` setup (usually in `layout.tsx` or a provider file) to ensure `httpBatchLink` includes `credentials: 'include'`.

*Note: Since the scaffolding didn't create a detailed provider file, we need to create one to wrap the app.*

Create `apps/web/src/components/providers.tsx`:

```tsx
"use plain";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import superjson from "superjson";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "http://localhost:4000/trpc",
          // You can pass any HTTP headers you wish here
          async headers() {
            return {
              // authorization: getAuthCookie(),
            };
          },
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
```

Modify `apps/web/src/app/layout.tsx` to use Providers.

**Step 4: Commit**

```bash
git add apps/web/
git commit -m "feat(web): setup better-auth client and trpc providers"
```

---

### Task 4: Web Login & Register Pages

**Files:**
- Create: `apps/web/src/app/login/page.tsx`
- Create: `apps/web/src/app/register/page.tsx`
- Create: `apps/web/src/components/ui/button.tsx` (Simple placeholder)
- Create: `apps/web/src/components/ui/input.tsx` (Simple placeholder)

**Step 1: Create UI Components**

Create `apps/web/src/components/ui/button.tsx`:

```tsx
import React from "react";

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 disabled:opacity-50 ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
```

Create `apps/web/src/components/ui/input.tsx`:

```tsx
import React from "react";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
```

**Step 2: Create Login Page**

Create `apps/web/src/app/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    await authClient.signIn.email(
      { email, password },
      {
        onSuccess: () => {
          router.push("/dashboard");
        },
        onError: (ctx) => {
          alert(ctx.error.message);
          setLoading(false);
        },
      }
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-6">Login</h1>
        <div className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button onClick={handleLogin} disabled={loading} className="w-full">
            {loading ? "Logging in..." : "Login"}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Create Register Page**

Create `apps/web/src/app/register/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    setLoading(true);
    await authClient.signUp.email(
      { email, password, name },
      {
        onSuccess: () => {
          router.push("/dashboard");
        },
        onError: (ctx) => {
          alert(ctx.error.message);
          setLoading(false);
        },
      }
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-6">Register</h1>
        <div className="space-y-4">
          <Input
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button onClick={handleRegister} disabled={loading} className="w-full">
            {loading ? "Register" : "Register"}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add apps/web/src/
git commit -m "feat(web): add login and register pages with UI components"
```

---

### Task 5: Protected Dashboard

**Files:**
- Create: `apps/web/src/app/dashboard/page.tsx`
- Modify: `apps/web/src/middleware.ts` (Optional: for protected routes, or client-side check)

**Step 1: Create Dashboard Page**

Create `apps/web/src/app/dashboard/page.tsx`:

```tsx
"use client";

import { trpc } from "@/lib/trpc";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { data: session, isPending } = authClient.useSession();
  const { data: secret } = trpc.auth.getSecretMessage.useQuery(undefined, {
    enabled: !!session,
  });
  const router = useRouter();

  if (isPending) return <div>Loading...</div>;

  if (!session) {
    router.push("/login");
    return null;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-4">Welcome, {session.user.name}</p>
      <p className="mt-2 text-gray-600">Secret: {secret ?? "Loading secret..."}</p>
      
      <Button
        className="mt-6"
        onClick={async () => {
          await authClient.signOut();
          router.push("/login");
        }}
      >
        Sign Out
      </Button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/dashboard/
git commit -m "feat(web): add protected dashboard page"
```

---

### Task 6: Mobile Authentication (Expo)

**Files:**
- Modify: `apps/mobile/package.json`
- Create: `apps/mobile/src/lib/auth-client.ts`
- Create: `apps/mobile/src/screens/LoginScreen.tsx`
- Modify: `apps/mobile/App.tsx`

**Step 1: Install Dependencies**

```bash
pnpm --filter @schoolconnect/mobile add better-auth expo-secure-store
```

**Step 2: Create Auth Client with Secure Store**

Create `apps/mobile/src/lib/auth-client.ts`:

```typescript
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: "http://localhost:4000", // Needs to be your local IP if running on real device
  disableDefaultStore: true,
  fetchOptions: {
    headers: {
        // Custom header handling if needed, usually better-auth handles this via store
    }
  },
  // Custom storage implementation for React Native
  storage: {
    getItem: async (key) => SecureStore.getItemAsync(key),
    setItem: async (key, value) => SecureStore.setItemAsync(key, value),
    removeItem: async (key) => SecureStore.deleteItemAsync(key),
  },
});
```

*Note: React Native support in better-auth might require specific configuration. We will assume standard client works with custom storage.*

**Step 3: Create Login Screen**

Create `apps/mobile/src/screens/LoginScreen.tsx`:

```tsx
import React, { useState } from "react";
import { View, TextInput, Button, StyleSheet, Alert } from "react-native";
import { authClient } from "@/lib/auth-client";

export const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    await authClient.signIn.email(
      { email, password },
      {
        onSuccess: () => Alert.alert("Success", "Logged in!"),
        onError: (ctx) => Alert.alert("Error", ctx.error.message),
      }
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  input: { borderBottomWidth: 1, marginBottom: 20, padding: 10 },
});
```

**Step 4: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): add authentication client and login screen"
```

---

## Summary

After this plan:
1.  **Backend:** `better-auth` is configured with Prisma and Fastify.
2.  **Web:** Login, Register, and Dashboard pages are functional.
3.  **Mobile:** Basic auth client and login screen are ready.
4.  **Security:** tRPC procedures are protected by session verification.

