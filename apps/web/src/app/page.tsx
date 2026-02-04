"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, School, Shield, Zap } from "lucide-react";
import Link from "next/link";

export default function Home() {
	return (
		<div className="min-h-screen flex flex-col bg-background selection:bg-primary selection:text-white">
			{/* Navigation */}
			<header className="fixed top-0 w-full border-b border-border/40 bg-background/80 backdrop-blur-md z-50">
				<div className="container mx-auto px-4 h-16 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
							<School className="w-5 h-5 text-white" />
						</div>
						<span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
							SchoolConnect
						</span>
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
				<section className="relative overflow-hidden px-4 py-20 md:py-32">
					{/* Background Elements */}
					<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none -z-10">
						<div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-[100px]" />
						<div className="absolute bottom-20 right-10 w-72 h-72 bg-secondary/20 rounded-full blur-[100px]" />
					</div>

					<div className="container mx-auto max-w-5xl text-center space-y-8">
						<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-500">
							<span className="relative flex h-2 w-2">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
								<span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
							</span>
							Now available for all schools
						</div>

						<h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground animate-in fade-in slide-in-from-bottom-5 duration-700">
							Simplify School <br />
							<span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-secondary">
								Communication
							</span>
						</h1>

						<p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
							The all-in-one platform for schools, parents, and students. Payments, attendance,
							messages, and more—seamlessly integrated.
						</p>

						<div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-7 duration-700 delay-200">
							<Link href="/register" className="w-full sm:w-auto">
								<Button
									size="lg"
									className="w-full h-12 text-base gap-2 shadow-lg shadow-primary/20"
								>
									Start Free Trial <ArrowRight className="w-4 h-4" />
								</Button>
							</Link>
							<Link href="/#features" className="w-full sm:w-auto">
								<Button variant="outline" size="lg" className="w-full h-12 text-base">
									View Demo
								</Button>
							</Link>
						</div>
					</div>
				</section>

				{/* Features Grid */}
				<section id="features" className="px-4 py-20 bg-muted/30">
					<div className="container mx-auto max-w-6xl">
						<div className="text-center mb-16 space-y-4">
							<h2 className="text-3xl font-bold">Everything you need</h2>
							<p className="text-muted-foreground max-w-2xl mx-auto">
								Powerful features designed to make school management effortless and engaging.
							</p>
						</div>

						<div className="grid md:grid-cols-3 gap-8">
							{/* Feature 1 */}
							<div className="group relative p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors shadow-sm hover:shadow-md">
								<div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
								<div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
									<Zap className="w-6 h-6" />
								</div>
								<h3 className="text-xl font-semibold mb-3">Instant Updates</h3>
								<p className="text-muted-foreground">
									Real-time notifications for attendance, events, and important announcements
									directly to parents' devices.
								</p>
							</div>

							{/* Feature 2 */}
							<div className="group relative p-8 rounded-2xl bg-card border border-border hover:border-secondary/50 transition-colors shadow-sm hover:shadow-md">
								<div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
								<div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-6 text-secondary-700 group-hover:scale-110 transition-transform">
									<Shield className="w-6 h-6" />
								</div>
								<h3 className="text-xl font-semibold mb-3">Secure Payments</h3>
								<p className="text-muted-foreground">
									Safe and easy fee collection, trip payments, and uniform purchases with integrated
									payment processing.
								</p>
							</div>

							{/* Feature 3 */}
							<div className="group relative p-8 rounded-2xl bg-card border border-border hover:border-purple-500/50 transition-colors shadow-sm hover:shadow-md">
								<div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
								<div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-6 text-purple-600 group-hover:scale-110 transition-transform">
									<CheckCircle2 className="w-6 h-6" />
								</div>
								<h3 className="text-xl font-semibold mb-3">Smart Attendance</h3>
								<p className="text-muted-foreground">
									Digital attendance tracking with automated reports and parent alerts for
									unauthorized absences.
								</p>
							</div>
						</div>
					</div>
				</section>
			</main>

			<footer className="border-t border-border bg-card py-12 px-4">
				<div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
					<p className="text-sm text-muted-foreground">
						© {new Date().getFullYear()} SchoolConnect. All rights reserved.
					</p>
					<div className="flex gap-6 text-sm text-muted-foreground">
						<Link href="#" className="hover:text-primary transition-colors">
							Privacy
						</Link>
						<Link href="#" className="hover:text-primary transition-colors">
							Terms
						</Link>
						<Link href="#" className="hover:text-primary transition-colors">
							Contact
						</Link>
					</div>
				</div>
			</footer>
		</div>
	);
}
