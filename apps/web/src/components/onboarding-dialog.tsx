"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { BookOpen, GraduationCap, MessageCircle, Shield } from "lucide-react";
import { useEffect, useState } from "react";

const ONBOARDING_KEY = "abridge-onboarding-completed";

export function OnboardingDialog({ isParent }: { isParent: boolean }) {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		const completed = localStorage.getItem(ONBOARDING_KEY);
		if (!completed) {
			setOpen(true);
		}
	}, []);

	const handleComplete = () => {
		localStorage.setItem(ONBOARDING_KEY, "true");
		setOpen(false);
	};

	const steps = isParent
		? [
				{
					icon: MessageCircle,
					title: "Messages from school",
					description: "Check your messages for updates from teachers and staff.",
				},
				{
					icon: BookOpen,
					title: "Track progress",
					description:
						"View attendance, homework, reading diary, and report cards for your children.",
				},
				{
					icon: Shield,
					title: "Link your child",
					description:
						"Go to Settings and enter the invite code from your school to link your child.",
				},
			]
		: [
				{
					icon: MessageCircle,
					title: "Send messages",
					description: "Compose broadcasts to parents from the Messages section.",
				},
				{
					icon: BookOpen,
					title: "Mark attendance",
					description: "Record daily attendance for your class from the Attendance page.",
				},
				{
					icon: GraduationCap,
					title: "Invite parents",
					description:
						"Generate parent invite codes in Staff Management to connect parents to their children.",
				},
			];

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="sm:max-w-md" data-testid="onboarding-dialog">
				<DialogHeader>
					<DialogTitle className="text-center text-2xl">Welcome to Abridge</DialogTitle>
					<DialogDescription className="text-center">
						{isParent
							? "Here's how to get started as a parent."
							: "Here's how to get started as staff."}
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-4">
					{steps.map((step) => {
						const Icon = step.icon;
						return (
							<div key={step.title} className="flex items-start gap-3">
								<div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
									<Icon className="w-5 h-5 text-primary" />
								</div>
								<div>
									<p className="font-medium text-sm text-foreground">{step.title}</p>
									<p className="text-xs text-muted-foreground">{step.description}</p>
								</div>
							</div>
						);
					})}
				</div>
				<DialogFooter>
					<Button onClick={handleComplete} className="w-full" data-testid="onboarding-dismiss">
						Get Started
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
