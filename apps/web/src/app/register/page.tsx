"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { School, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

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
						toast.error(errorMessage);
						setLoading(false);
					},
				},
			);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Registration failed. Please try again.";
			toast.error(message);
			setLoading(false);
		}
	};

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="text-center space-y-4">
				<div className="flex items-center justify-center gap-2 mb-2">
					<div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
						<School className="w-5 h-5 text-white" />
					</div>
					<span className="text-xl font-bold font-heading">SchoolConnect</span>
				</div>
				<CardTitle className="text-2xl">Create Account</CardTitle>
				<CardDescription>Join SchoolConnect today</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{inviteInfo && (
					<Alert variant="info">
						<ShieldCheck className="w-4 h-4" />
						<AlertDescription>
							You&apos;ve been invited to join <strong>{inviteInfo.schoolName}</strong> as a{" "}
							<strong>{inviteInfo.role}</strong>.
						</AlertDescription>
					</Alert>
				)}

				<form onSubmit={handleRegister} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">Full Name</Label>
						<Input
							id="name"
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
							type="password"
							placeholder="Choose a password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
						/>
					</div>
					<Button
						type="submit"
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
