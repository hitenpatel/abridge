"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { CheckCircle2, GraduationCap, Loader2, Mail, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

function VerifyEmailContent() {
	const searchParams = useSearchParams();
	const token = searchParams.get("token");
	const router = useRouter();

	const [status, setStatus] = useState<"verifying" | "success" | "error" | "no-token">(
		token ? "verifying" : "no-token",
	);
	const [error, setError] = useState<string | null>(null);

	const verify = useCallback(async () => {
		if (!token) return;

		const { error: verifyError } = await authClient.verifyEmail({
			query: { token },
		});

		if (verifyError) {
			setError(verifyError.message || "Verification failed. The link may have expired.");
			setStatus("error");
		} else {
			setStatus("success");
			setTimeout(() => router.push("/dashboard"), 3000);
		}
	}, [token, router]);

	useEffect(() => {
		if (token) {
			verify();
		}
	}, [token, verify]);

	return (
		<Card className="page-enter glass-card shadow-sanctuary w-full max-w-md">
			<CardHeader className="text-center space-y-4">
				<div className="flex items-center justify-center gap-2 mb-2">
					<div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
						<GraduationCap className="w-5 h-5 text-white" aria-hidden="true" />
					</div>
					<span className="text-xl font-bold font-heading">Abridge</span>
				</div>

				{status === "verifying" && (
					<>
						<CardTitle className="text-2xl">Verifying your email...</CardTitle>
						<CardDescription>Please wait a moment.</CardDescription>
					</>
				)}
				{status === "success" && (
					<>
						<CardTitle className="text-2xl">Email verified</CardTitle>
						<CardDescription>
							Your email has been verified. Redirecting to dashboard...
						</CardDescription>
					</>
				)}
				{status === "error" && (
					<>
						<CardTitle className="text-2xl">Verification failed</CardTitle>
						<CardDescription>We couldn't verify your email address.</CardDescription>
					</>
				)}
				{status === "no-token" && (
					<>
						<CardTitle className="text-2xl">Check your email</CardTitle>
						<CardDescription>
							We've sent a verification link to your email address. Click the link to verify your
							account.
						</CardDescription>
					</>
				)}
			</CardHeader>
			<CardContent className="space-y-4">
				{status === "verifying" && (
					<div className="flex justify-center">
						<Loader2 className="w-12 h-12 text-primary animate-spin" />
					</div>
				)}

				{status === "success" && (
					<>
						<div className="flex justify-center">
							<div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
								<CheckCircle2 className="w-8 h-8 text-success" />
							</div>
						</div>
						<Link href="/dashboard" className="block">
							<Button className="w-full">Go to Dashboard</Button>
						</Link>
					</>
				)}

				{status === "error" && (
					<>
						<div className="flex justify-center">
							<div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
								<XCircle className="w-8 h-8 text-destructive" />
							</div>
						</div>
						{error && (
							<p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20 text-center">
								{error}
							</p>
						)}
						<Link href="/login" className="block">
							<Button variant="outline" className="w-full">
								Back to Login
							</Button>
						</Link>
					</>
				)}

				{status === "no-token" && (
					<>
						<div className="flex justify-center">
							<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
								<Mail className="w-8 h-8 text-primary" />
							</div>
						</div>
						<p className="text-center text-sm text-muted-foreground">
							Didn't receive the email? Check your spam folder or sign in to resend it.
						</p>
						<Link href="/login" className="block">
							<Button variant="outline" className="w-full">
								Back to Login
							</Button>
						</Link>
					</>
				)}
			</CardContent>
		</Card>
	);
}

export default function VerifyEmailPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-orange-100/30 to-amber-50/20 dark:via-orange-950/20 dark:to-amber-950/10 p-4">
			<Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
				<VerifyEmailContent />
			</Suspense>
		</div>
	);
}
