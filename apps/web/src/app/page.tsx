"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function Home() {
	return (
		<div className="min-h-screen flex flex-col bg-background">
			{/* Navigation */}
			<header className="fixed top-0 w-full border-b border-border bg-background/80 backdrop-blur-md z-50">
				<div className="container mx-auto px-4 h-16 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
							<span className="material-symbols-rounded text-white text-[20px]" aria-hidden="true">
								school
							</span>
						</div>
						<span className="text-xl font-bold text-foreground font-heading">Abridge</span>
					</div>
					<div className="flex items-center gap-4">
						<Link href="/login">
							<Button variant="ghost">Log in</Button>
						</Link>
						<Link href="/register">
							<Button>Get Started</Button>
						</Link>
					</div>
				</div>
			</header>

			<main className="flex-1 pt-24">
				{/* Hero Section */}
				<section className="px-4 py-20 md:py-32">
					<div className="container mx-auto max-w-4xl text-center space-y-8">
						<h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground font-heading">
							School communications, <br />
							<span className="text-primary">simplified.</span>
						</h1>

						<p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
							The all-in-one platform for schools, parents, and students. Payments, attendance,
							messages, and more — seamlessly integrated.
						</p>

						<div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
							<Link href="/register" className="w-full sm:w-auto">
								<Button size="lg" className="w-full h-12 text-base gap-2">
									Start Free Trial{" "}
									<span className="material-symbols-rounded text-base" aria-hidden="true">
										arrow_forward
									</span>
								</Button>
							</Link>
							<Link href="/#features" className="w-full sm:w-auto">
								<Button variant="outline" size="lg" className="w-full h-12 text-base">
									View Features
								</Button>
							</Link>
						</div>
					</div>
				</section>

				{/* Features Grid */}
				<section id="features" className="px-4 py-20 bg-muted/50">
					<div className="container mx-auto max-w-6xl">
						<div className="text-center mb-16 space-y-4">
							<h2 className="text-3xl font-bold font-heading">Everything you need</h2>
							<p className="text-muted-foreground max-w-2xl mx-auto">
								Powerful features designed to make school management effortless and engaging.
							</p>
						</div>

						<div className="grid md:grid-cols-3 gap-8">
							<Card className="group hover:shadow-md transition-shadow">
								<CardContent className="p-8">
									<div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 text-primary">
										<span className="material-symbols-rounded text-2xl" aria-hidden="true">
											bolt
										</span>
									</div>
									<h3 className="text-xl font-semibold mb-3">Instant Updates</h3>
									<p className="text-muted-foreground">
										Real-time notifications for attendance, events, and important announcements
										directly to parents' devices.
									</p>
								</CardContent>
							</Card>

							<Card className="group hover:shadow-md transition-shadow">
								<CardContent className="p-8">
									<div className="w-12 h-12 rounded-lg bg-info/10 flex items-center justify-center mb-6 text-info">
										<span className="material-symbols-rounded text-2xl" aria-hidden="true">
											shield
										</span>
									</div>
									<h3 className="text-xl font-semibold mb-3">Secure Payments</h3>
									<p className="text-muted-foreground">
										Safe and easy fee collection, trip payments, and uniform purchases with
										integrated payment processing.
									</p>
								</CardContent>
							</Card>

							<Card className="group hover:shadow-md transition-shadow">
								<CardContent className="p-8">
									<div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center mb-6 text-warning">
										<span className="material-symbols-rounded text-2xl" aria-hidden="true">
											check_circle
										</span>
									</div>
									<h3 className="text-xl font-semibold mb-3">Smart Attendance</h3>
									<p className="text-muted-foreground">
										Digital attendance tracking with automated reports and parent alerts for
										unauthorised absences.
									</p>
								</CardContent>
							</Card>
						</div>
					</div>
				</section>
			</main>

			<footer className="border-t border-border bg-card py-12 px-4">
				<div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
					<p className="text-sm text-muted-foreground">
						&copy; {new Date().getFullYear()} Abridge. All rights reserved.
					</p>
					<div className="flex gap-6 text-sm text-muted-foreground">
						<Link href="#" className="hover:text-foreground transition-colors">
							Privacy
						</Link>
						<Link href="#" className="hover:text-foreground transition-colors">
							Terms
						</Link>
						<Link href="#" className="hover:text-foreground transition-colors">
							Contact
						</Link>
					</div>
				</div>
			</footer>
		</div>
	);
}
