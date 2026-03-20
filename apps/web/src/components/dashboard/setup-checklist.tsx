"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Circle, CreditCard, MessageCircle, Settings, Users, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function SetupChecklist({ schoolId }: { schoolId: string }) {
	const { data } = trpc.dashboard.getSetupStatus.useQuery({ schoolId });
	const [dismissed, setDismissed] = useState(false);

	if (!data || dismissed) return null;

	const items = [
		{
			label: "Connect Stripe for payments",
			done: data.stripeConnected,
			href: "/dashboard/settings",
		},
		{
			label: "Invite staff members",
			done: data.staffInvited,
			href: "/dashboard/staff",
		},
		{
			label: "Import children (MIS or manual)",
			done: data.childrenImported,
			href: "/dashboard/mis",
		},
		{
			label: "Send your first message",
			done: data.firstMessageSent,
			href: "/dashboard/compose",
		},
	];

	const completedCount = items.filter((i) => i.done).length;
	const allDone = completedCount === items.length;

	if (allDone) return null;

	return (
		<Card
			className="rounded-2xl border border-primary/20 bg-primary/5"
			data-testid="setup-checklist"
		>
			<CardHeader className="pb-2 flex flex-row items-center justify-between">
				<CardTitle className="flex items-center gap-2 text-base">
					<Settings className="w-5 h-5 text-primary" aria-hidden="true" />
					Setup Checklist ({completedCount}/{items.length})
				</CardTitle>
				<button
					type="button"
					onClick={() => setDismissed(true)}
					className="text-muted-foreground hover:text-foreground transition-colors"
					aria-label="Dismiss checklist"
				>
					<X className="w-4 h-4" />
				</button>
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					{items.map((item) => (
						<Link
							key={item.label}
							href={item.href}
							className="flex items-center gap-3 p-2 rounded-lg hover:bg-primary/5 transition-colors group"
						>
							{item.done ? (
								<CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
							) : (
								<Circle className="w-5 h-5 text-muted-foreground/40 shrink-0" />
							)}
							<span
								className={`text-sm ${item.done ? "text-muted-foreground line-through" : "text-foreground group-hover:text-primary"}`}
							>
								{item.label}
							</span>
						</Link>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
