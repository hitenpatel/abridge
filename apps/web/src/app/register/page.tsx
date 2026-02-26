"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

function RegisterForm() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get("token");

	// Fetch invitation info if token exists
	const {
		data: inviteInfo,
		isLoading: loadingInvite,
		error: inviteError,
	} = trpc.invitation.verify.useQuery(
		{ token: token as string },
		{ enabled: !!token, retry: false },
	);

	useEffect(() => {
		if (inviteInfo?.email) {
			setEmail(inviteInfo.email);
		}
	}, [inviteInfo]);

	const handleRegister = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			await authClient.signUp.email(
				{ email, password, name },
				{
					onSuccess: () => {
						router.push("/dashboard");
					},
					onError: (ctx) => {
						const errorMessage =
							ctx.error?.message ||
							ctx.error?.statusText ||
							"Registration failed. Please try again.";
						setError(errorMessage);
						toast.error(errorMessage);
						setLoading(false);
					},
				},
			);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Registration failed. Please try again.";
			setError(message);
			toast.error(message);
			setLoading(false);
		}
	};

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="text-center space-y-4">
				<div className="flex items-center justify-center gap-2 mb-2">
					<div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
						<span className="material-symbols-rounded text-white text-[20px]" aria-hidden="true">
							school
						</span>
					</div>
					<span className="text-xl font-bold font-heading">Abridge</span>
				</div>
				<CardTitle className="text-2xl">Create Account</CardTitle>
				<CardDescription>Join Abridge today</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{token && inviteError && (
					<Alert variant="destructive" data-testid="invitation-error" role="alert">
						<span className="material-symbols-rounded text-base" aria-hidden="true">
							error
						</span>
						<AlertDescription>{inviteError.message}</AlertDescription>
					</Alert>
				)}

				{inviteInfo && (
					<Alert variant="info" data-testid="invitation-school-name" role="status">
						<span className="material-symbols-rounded text-base" aria-hidden="true">
							verified_user
						</span>
						<AlertDescription>
							You&apos;ve been invited to join <strong>{inviteInfo.schoolName}</strong> as a{" "}
							<strong>{inviteInfo.role}</strong>.
						</AlertDescription>
					</Alert>
				)}

				<form onSubmit={handleRegister} className="space-y-4">
					{error && (
						<p
							role="alert"
							data-testid="register-error"
							className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20"
						>
							{error}
						</p>
					)}
					<div className="space-y-2">
						<Label htmlFor="name">Full Name</Label>
						<Input
							id="name"
							data-testid="register-name-input"
							placeholder="John Doe"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="email">Email Address</Label>
						<Input
							id="email"
							data-testid="register-email-input"
							type="email"
							placeholder="john@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							disabled={!!inviteInfo?.email}
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="password">Password</Label>
						<Input
							id="password"
							data-testid="register-password-input"
							type="password"
							placeholder="Choose a password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
						/>
					</div>
					<Button
						type="submit"
						data-testid="register-button"
						disabled={loading || loadingInvite}
						className="w-full h-12 text-base"
					>
						{loading ? "Creating account..." : "Register"}
					</Button>
					<p className="text-center text-sm text-muted-foreground">
						Already have an account?{" "}
						<Link href="/login" className="text-primary font-medium hover:underline">
							Login
						</Link>
					</p>
				</form>
			</CardContent>
		</Card>
	);
}

export default function RegisterPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
				<RegisterForm />
			</Suspense>
		</div>
	);
}
