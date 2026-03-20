"use client";

import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const CONSENT_KEY = "abridge-cookie-consent";

type ConsentValue = "accepted" | "rejected";

export function useConsent() {
	const [consent, setConsent] = useState<ConsentValue | null>(null);

	useEffect(() => {
		const stored = localStorage.getItem(CONSENT_KEY) as ConsentValue | null;
		setConsent(stored);
	}, []);

	const accept = () => {
		localStorage.setItem(CONSENT_KEY, "accepted");
		setConsent("accepted");
	};

	const reject = () => {
		localStorage.setItem(CONSENT_KEY, "rejected");
		setConsent("rejected");
	};

	const reset = () => {
		localStorage.removeItem(CONSENT_KEY);
		setConsent(null);
	};

	return { consent, accept, reject, reset };
}

export function ConsentBanner() {
	const [mounted, setMounted] = useState(false);
	const { consent, accept, reject } = useConsent();

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted || consent !== null) return null;

	return (
		<div
			className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-fade-in-up"
			data-testid="consent-banner"
		>
			<div className="mx-auto max-w-2xl rounded-2xl border border-orange-100/60 bg-card/95 backdrop-blur-sm shadow-sanctuary p-5">
				<div className="flex items-start gap-3">
					<Cookie className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
					<div className="flex-1 space-y-3">
						<p className="text-sm text-foreground">
							We use essential cookies to keep you signed in and make the platform work.
							Non-essential cookies help us improve your experience.{" "}
							<Link href="/privacy" className="text-primary hover:underline">
								Privacy Policy
							</Link>
						</p>
						<div className="flex gap-2">
							<Button size="sm" onClick={accept} data-testid="consent-accept">
								Accept All
							</Button>
							<Button size="sm" variant="outline" onClick={reject} data-testid="consent-reject">
								Essential Only
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
