"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { ArrowLeft, GraduationCap, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);

		const { error: resetError } = await authClient.requestPasswordReset({
			email,
			redirectTo: `${window.location.origin}/reset-password`,
		});

		if (resetError) {
			setError(resetError.message || "Failed to send reset email. Please try again.");
			setLoading(false);
			return;
		}

		setSent(true);
		setLoading(false);
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
					<CardTitle className="text-2xl">
						{sent ? "Check your email" : "Forgot password?"}
					</CardTitle>
					<CardDescription>
						{sent
							? "If an account exists with that email, we've sent a password reset link."
							: "Enter your email and we'll send you a reset link."}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{sent ? (
						<div className="space-y-4">
							<div className="flex justify-center">
								<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
									<Mail className="w-8 h-8 text-primary" />
								</div>
							</div>
							<p className="text-center text-sm text-muted-foreground">
								Didn&apos;t receive the email? Check your spam folder or{" "}
								<button
									type="button"
									onClick={() => {
										setSent(false);
										setError(null);
									}}
									className="text-primary font-medium hover:underline"
								>
									try again
								</button>
								.
							</p>
							<Link href="/login" className="block">
								<Button variant="outline" className="w-full">
									<ArrowLeft className="w-4 h-4 mr-2" />
									Back to login
								</Button>
							</Link>
						</div>
					) : (
						<form onSubmit={handleSubmit} className="space-y-4">
							{error && (
								<p
									role="alert"
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
									data-testid="forgot-email-input"
									required
								/>
							</div>
							<Button
								type="submit"
								disabled={loading}
								className="w-full"
								data-testid="forgot-submit-button"
							>
								{loading ? "Sending..." : "Send Reset Link"}
							</Button>
							<p className="text-center text-sm text-muted-foreground">
								<Link href="/login" className="text-primary font-medium hover:underline">
									<ArrowLeft className="w-3 h-3 inline mr-1" />
									Back to login
								</Link>
							</p>
						</form>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
