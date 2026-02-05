"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, School, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SetupPage() {
	const [name, setName] = useState("");
	const [urn, setUrn] = useState("");
	const [email, setEmail] = useState("");
	const [setupKey, setSetupKey] = useState("");
	const [success, setSuccess] = useState(false);

	const initMutation = trpc.dbInit.initTables.useMutation();

	useEffect(() => {
		initMutation.mutate(undefined, {
			onError: (err) => console.error("DB Init failed:", err),
		});
	}, [initMutation.mutate]);

	const setupMutation = trpc.setup.createInitialSchool.useMutation({
		onSuccess: () => {
			setSuccess(true);
		},
		onError: (err) => {
			alert(err.message);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setupMutation.mutate({ name, urn, adminEmail: email, setupKey });
	};

	if (success) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background p-4">
				<div className="max-w-md w-full bg-card p-8 rounded-2xl border border-border shadow-xl text-center space-y-6">
					<div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mx-auto">
						<CheckCircle2 className="w-10 h-10 text-secondary" />
					</div>
					<h1 className="text-2xl font-bold">School Created!</h1>
					<p className="text-muted-foreground">
						The school <strong>{name}</strong> has been registered. You can now register as an admin
						using the email <strong>{email}</strong>.
					</p>
					<Link href="/register" className="block">
						<Button className="w-full">Go to Registration</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-background p-4">
			<div className="max-w-md w-full bg-card p-8 rounded-2xl border border-border shadow-xl space-y-8">
				<div className="text-center space-y-2">
					<div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
						<School className="w-6 h-6 text-primary" />
					</div>
					<h1 className="text-2xl font-bold">Initial School Setup</h1>
					<p className="text-sm text-muted-foreground">
						Configure the first school and its administrator.
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="schoolName" className="text-sm font-medium">
							School Name
						</label>
						<Input
							id="schoolName"
							placeholder="e.g. Oakwood Primary"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
						/>
					</div>
					<div className="space-y-2">
						<label htmlFor="urn" className="text-sm font-medium">
							Ofsted URN
						</label>
						<Input
							id="urn"
							placeholder="6-digit unique reference number"
							value={urn}
							onChange={(e) => setUrn(e.target.value)}
							required
						/>
					</div>
					<div className="space-y-2">
						<label htmlFor="email" className="text-sm font-medium">
							Admin Email
						</label>
						<Input
							id="email"
							type="email"
							placeholder="admin@school.sch.uk"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>
					</div>
					<div className="space-y-2">
						<label htmlFor="setupKey" className="text-sm font-medium flex items-center gap-2">
							<ShieldCheck className="w-4 h-4" /> Setup Key
						</label>
						<Input
							id="setupKey"
							type="password"
							placeholder="Check your server logs or .env"
							value={setupKey}
							onChange={(e) => setSetupKey(e.target.value)}
							required
						/>
					</div>

					<Button
						type="submit"
						className="w-full h-12 text-base"
						disabled={setupMutation.isPending}
					>
						{setupMutation.isPending ? "Configuring..." : "Create School & Admin"}
					</Button>
				</form>
			</div>
		</div>
	);
}
