"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);
		await authClient.signIn.email(
			{ email, password },
			{
				onSuccess: () => {
					router.push("/dashboard");
				},
				onError: (ctx) => {
					const errorMessage = ctx.error?.message || "Login failed. Please try again.";
					setError(errorMessage);
					toast.error(errorMessage);
					setLoading(false);
				},
			},
		);
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-orange-100/30 to-amber-50/20 dark:via-orange-950/20 dark:to-amber-950/10 p-4">
			<Card className="page-enter glass-card shadow-sanctuary w-full max-w-md">
				<CardHeader className="text-center space-y-4">
					<div className="flex items-center justify-center gap-2 mb-2">
						<div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
							<GraduationCap className="w-5 h-5 text-white" aria-hidden="true" />
						</div>
						<span className="text-xl font-bold font-heading">Abridge</span>
					</div>
					<CardTitle className="text-2xl">Welcome back</CardTitle>
					<CardDescription>Sign in to your account to continue</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleLogin} className="space-y-4">
						{error && (
							<p
								role="alert"
								data-testid="login-error"
								className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20"
							>
								{error}
							</p>
						)}
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="you@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="w-full"
								data-testid="email-input"
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								placeholder="Enter your password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="w-full"
								data-testid="password-input"
								required
							/>
						</div>
						<div className="flex justify-end">
							<Link
								href="/forgot-password"
								className="text-sm text-muted-foreground hover:text-primary transition-colors"
								data-testid="forgot-password-link"
							>
								Forgot password?
							</Link>
						</div>
						<Button type="submit" disabled={loading} className="w-full" data-testid="login-button">
							{loading ? "Signing in..." : "Sign In"}
						</Button>
						<p className="text-center text-sm text-muted-foreground">
							Don&apos;t have an account?{" "}
							<Link href="/register" className="text-primary font-medium hover:underline">
								Register
							</Link>
						</p>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
