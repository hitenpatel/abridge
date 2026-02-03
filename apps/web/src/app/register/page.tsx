"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const router = useRouter();

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
					alert(ctx.error.message);
					setLoading(false);
				},
			},
		);
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50">
			<div className="w-full max-w-md p-8 bg-white rounded shadow">
				<h1 className="text-2xl font-bold mb-6">Register</h1>
				<form onSubmit={handleRegister} className="space-y-4">
					<Input
						placeholder="Full Name"
						aria-label="Full Name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="w-full"
						required
					/>
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
						{loading ? "Registering..." : "Register"}
					</Button>
					<p className="text-center text-sm text-gray-600">
						Already have an account?{" "}
						<Link href="/login" className="text-primary-600 hover:underline">
							Login
						</Link>
					</p>
				</form>
			</div>
		</div>
	);
}
