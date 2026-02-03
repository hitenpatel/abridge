"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
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
			},
		);
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50">
			<div className="w-full max-w-md p-8 bg-white rounded shadow">
				<h1 className="text-2xl font-bold mb-6">Login</h1>
				<form onSubmit={handleLogin} className="space-y-4">
					<Input
						type="email"
						placeholder="Email"
						aria-label="Email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="w-full"
						required
					/>
					<Input
						type="password"
						placeholder="Password"
						aria-label="Password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className="w-full"
						required
					/>
					<Button type="submit" disabled={loading} className="w-full">
						{loading ? "Logging in..." : "Login"}
					</Button>
					<p className="text-center text-sm text-gray-600">
						Don't have an account?{" "}
						<Link href="/register" className="text-primary-600 hover:underline">
							Register
						</Link>
					</p>
				</form>
			</div>
		</div>
	);
}
