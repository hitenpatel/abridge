"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function RegisterForm() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get("token");

	// Fetch invitation info if token exists
	const { data: inviteInfo, isLoading: loadingInvite } = trpc.invitation.verify.useQuery(
		{ token: token as string },
		{ enabled: !!token },
	);

	useEffect(() => {
		if (inviteInfo?.email) {
			setEmail(inviteInfo.email);
		}
	}, [inviteInfo]);

	const handleRegister = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		await authClient.signUp.email(
			{ email, password, name },
			{
				onSuccess: () => {
					router.push("/dashboard");
				},
				onError: (ctx) => {
					const errorMessage = ctx.error?.message || "Registration failed. Please try again.";
					alert(errorMessage);
					setLoading(false);
				},
			},
		);
	};

	return (
		<div className="w-full max-w-md p-8 bg-card rounded-2xl border border-border shadow-xl space-y-6">
			<div className="text-center space-y-2">
				<h1 className="text-3xl font-bold">Create Account</h1>
				<p className="text-muted-foreground">Join SchoolConnect today</p>
			</div>

			{inviteInfo && (
				<div className="p-4 bg-primary/10 rounded-xl border border-primary/20 space-y-2">
					<div className="flex items-center gap-2 text-primary font-semibold">
						<ShieldCheck className="w-5 h-5" />
						<span>Staff Invitation</span>
					</div>
					<p className="text-sm">
						You've been invited to join <strong>{inviteInfo.schoolName}</strong> as a{" "}
						<strong>{inviteInfo.role}</strong>.
					</p>
				</div>
			)}

			<form onSubmit={handleRegister} className="space-y-4">
				<div className="space-y-2">
					<label htmlFor="name" className="text-sm font-medium">
						Full Name
					</label>
					<Input
						id="name"
						placeholder="John Doe"
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
					/>
				</div>
				<div className="space-y-2">
					<label htmlFor="email" className="text-sm font-medium">
						Email Address
					</label>
					<Input
						id="email"
						type="email"
						placeholder="john@example.com"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						disabled={!!inviteInfo?.email}
						required
					/>
				</div>
				<div className="space-y-2">
					<label htmlFor="password" title="Password" className="text-sm font-medium">
						Password
					</label>
					<Input
						id="password"
						type="password"
						placeholder="••••••••"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>
				</div>
				<Button type="submit" disabled={loading || loadingInvite} className="w-full h-12 text-base">
					{loading ? "Creating account..." : "Register"}
				</Button>
				<p className="text-center text-sm text-muted-foreground">
					Already have an account?{" "}
					<Link href="/login" className="text-primary font-medium hover:underline">
						Login
					</Link>
				</p>
			</form>
		</div>
	);
}

export default function RegisterPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<Suspense fallback={<div>Loading...</div>}>
				<RegisterForm />
			</Suspense>
		</div>
	);
}
