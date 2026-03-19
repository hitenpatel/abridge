"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { CheckCircle2, GraduationCap } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ResetPasswordForm() {
	const searchParams = useSearchParams();
	const token = searchParams.get("token");
	const errorParam = searchParams.get("error");

	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState<string | null>(
		errorParam === "INVALID_TOKEN" ? "This reset link is invalid or has expired." : null,
	);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (password !== confirmPassword) {
			setError("Passwords do not match.");
			return;
		}

		if (password.length < 8) {
			setError("Password must be at least 8 characters.");
			return;
		}

		if (!token) {
			setError("Missing reset token. Please request a new reset link.");
			return;
		}

		setLoading(true);

		const { error: resetError } = await authClient.resetPassword({
			newPassword: password,
			token,
		});

		if (resetError) {
			setError(resetError.message || "Failed to reset password. The link may have expired.");
			setLoading(false);
			return;
		}

		setSuccess(true);
		setLoading(false);
	};

	if (success) {
		return (
			<Card className="page-enter glass-card shadow-sanctuary w-full max-w-md">
				<CardHeader className="text-center space-y-4">
					<div className="flex items-center justify-center gap-2 mb-2">
						<div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
							<GraduationCap className="w-5 h-5 text-white" aria-hidden="true" />
						</div>
						<span className="text-xl font-bold font-heading">Abridge</span>
					</div>
					<CardTitle className="text-2xl">Password reset</CardTitle>
					<CardDescription>Your password has been updated successfully.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex justify-center">
						<div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
							<CheckCircle2 className="w-8 h-8 text-success" />
						</div>
					</div>
					<Link href="/login" className="block">
						<Button className="w-full" data-testid="reset-login-button">
							Sign in with new password
						</Button>
					</Link>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="page-enter glass-card shadow-sanctuary w-full max-w-md">
			<CardHeader className="text-center space-y-4">
				<div className="flex items-center justify-center gap-2 mb-2">
					<div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
						<GraduationCap className="w-5 h-5 text-white" aria-hidden="true" />
					</div>
					<span className="text-xl font-bold font-heading">Abridge</span>
				</div>
				<CardTitle className="text-2xl">Set new password</CardTitle>
				<CardDescription>Choose a new password for your account.</CardDescription>
			</CardHeader>
			<CardContent>
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
						<Label htmlFor="password">New Password</Label>
						<Input
							id="password"
							type="password"
							placeholder="At least 8 characters"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full"
							data-testid="reset-password-input"
							required
							minLength={8}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="confirm-password">Confirm Password</Label>
						<Input
							id="confirm-password"
							type="password"
							placeholder="Re-enter your password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							className="w-full"
							data-testid="reset-confirm-password-input"
							required
							minLength={8}
						/>
					</div>
					<Button
						type="submit"
						disabled={loading || !token}
						className="w-full"
						data-testid="reset-submit-button"
					>
						{loading ? "Resetting..." : "Reset Password"}
					</Button>
					<p className="text-center text-sm text-muted-foreground">
						<Link href="/forgot-password" className="text-primary font-medium hover:underline">
							Request a new reset link
						</Link>
					</p>
				</form>
			</CardContent>
		</Card>
	);
}

export default function ResetPasswordPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-orange-100/30 to-amber-50/20 dark:via-orange-950/20 dark:to-amber-950/10 p-4">
			<Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
				<ResetPasswordForm />
			</Suspense>
		</div>
	);
}
