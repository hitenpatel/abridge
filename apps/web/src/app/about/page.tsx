"use client";

import {
	ArrowRight,
	BookOpen,
	Heart,
	Lock,
	Mail,
	Menu,
	MessageCircle,
	Shield,
	Sparkles,
	Users,
	XIcon,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Navigation                                                         */
/* ------------------------------------------------------------------ */

const NAV_LINKS = [
	{ label: "Features", href: "/features" },
	{ label: "Pricing", href: "/pricing" },
	{ label: "About", href: "/about" },
	{ label: "Compare", href: "/#comparison" },
	{ label: "FAQ", href: "/#faq" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AboutPage() {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 20);
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<div className="min-h-screen bg-orange-50/20 text-[#1E293B]">
			{/* ============================================================ */}
			{/*  NAVIGATION                                                   */}
			{/* ============================================================ */}
			<nav
				className={`fixed top-0 w-full z-50 transition-all duration-300 ${
					scrolled
						? "bg-[#1E3A5F]/95 backdrop-blur-lg shadow-sm border-b border-[#1E3A5F]"
						: "bg-[#1E3A5F]"
				}`}
			>
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16 lg:h-20">
						<Link href="/" className="flex items-center gap-2.5 group">
							<div className="w-9 h-9 rounded-xl bg-[#FF7D45] flex items-center justify-center transition-transform group-hover:scale-105">
								<BookOpen className="w-5 h-5 text-white" strokeWidth={2.5} />
							</div>
							<span className="text-xl font-bold tracking-tight text-white">Abridge</span>
						</Link>
						<div className="hidden lg:flex items-center gap-8">
							{NAV_LINKS.map((link) => (
								<Link
									key={link.href}
									href={link.href}
									className="text-sm font-medium text-blue-100 hover:text-white transition-colors"
								>
									{link.label}
								</Link>
							))}
						</div>
						<div className="hidden lg:flex items-center gap-3">
							<Link
								href="/login"
								className="text-sm font-medium text-blue-100 hover:text-white transition-colors px-4 py-2"
							>
								Log in
							</Link>
							<Link
								href="/setup"
								className="inline-flex items-center gap-2 bg-[#FF7D45] hover:bg-[#E86B35] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-sm"
							>
								Apply for Early Access
								<ArrowRight className="w-4 h-4" />
							</Link>
						</div>
						<button
							type="button"
							className="lg:hidden p-2 text-blue-100"
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
							aria-label="Toggle menu"
						>
							{mobileMenuOpen ? <XIcon className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
						</button>
					</div>
				</div>
				{mobileMenuOpen && (
					<div className="lg:hidden bg-[#1E3A5F] border-t border-[#2A4D73]">
						<div className="px-4 py-4 space-y-1">
							{NAV_LINKS.map((link) => (
								<Link
									key={link.href}
									href={link.href}
									className="block px-3 py-2.5 text-sm font-medium text-blue-100 hover:text-white hover:bg-[#2A4D73] rounded-lg transition-colors"
									onClick={() => setMobileMenuOpen(false)}
								>
									{link.label}
								</Link>
							))}
							<div className="pt-3 border-t border-[#2A4D73] space-y-2">
								<Link
									href="/login"
									className="block px-3 py-2.5 text-sm font-medium text-blue-100 hover:text-white rounded-lg"
								>
									Log in
								</Link>
								<Link
									href="/setup"
									className="block text-center bg-[#FF7D45] hover:bg-[#E86B35] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
								>
									Apply for Early Access
								</Link>
							</div>
						</div>
					</div>
				)}
			</nav>

			{/* ============================================================ */}
			{/*  HERO                                                         */}
			{/* ============================================================ */}
			<section className="relative pt-28 pb-16 lg:pt-40 lg:pb-24 overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-b from-[#1E3A5F]/8 via-[#1E3A5F]/3 to-transparent pointer-events-none" />
				<div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6 text-[#1E3A5F]">
						Schools deserve
						<br />
						better tools
					</h1>
					<p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
						Abridge exists because the way schools communicate with parents is broken. We are
						building the platform to fix it.
					</p>
				</div>
			</section>

			{/* ============================================================ */}
			{/*  THE PROBLEM                                                  */}
			{/* ============================================================ */}
			<section className="py-16 lg:py-24 bg-orange-50/30">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
					<h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-8 text-[#1E3A5F]">
						The problem
					</h2>
					<div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
						<p>
							School staff spend hours every week on communication admin that adds no educational
							value. Writing individual messages to parents. Chasing absent students. Compiling
							progress reports by hand. Filing paper forms. Managing WhatsApp groups that
							technically violate GDPR.
						</p>
						<p>
							On the other side, parents feel disconnected. They hear about their child&apos;s
							progress twice a year at parents&apos; evening. They miss important announcements
							buried in email inboxes. They resort to WhatsApp groups because the school&apos;s
							official tools are clunky and slow.
						</p>
						<p>
							And the children? Their day-to-day achievements, struggles, and progress go largely
							unrecorded and uncommunicated. The gap between what happens at school and what parents
							know about it is enormous.
						</p>
					</div>
				</div>
			</section>

			{/* ============================================================ */}
			{/*  OUR APPROACH                                                 */}
			{/* ============================================================ */}
			<section className="py-16 lg:py-24">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
					<h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-8 text-[#1E3A5F]">
						Our approach
					</h2>
					<div className="space-y-6 text-lg text-muted-foreground leading-relaxed mb-12">
						<p>
							Abridge is an AI-first school communication platform. That means AI is not bolted on
							as an afterthought &mdash; it is woven into every feature. Weekly progress summaries
							are generated automatically. Messages are drafted intelligently. Attendance patterns
							are detected before they become problems.
						</p>
						<p>
							But &ldquo;AI-first&rdquo; does not mean &ldquo;AI-only&rdquo;. Every AI feature is
							optional and toggled per-school. Schools choose their AI provider &mdash; or run
							Ollama locally so no data ever leaves their network. Teachers always review AI output
							before it reaches parents.
						</p>
					</div>

					<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
						{[
							{
								icon: Shield,
								title: "Privacy by design",
								description:
									"UK data residency. GDPR compliant. Schools own their data. Full export on request.",
							},
							{
								icon: Zap,
								title: "AI that helps, not replaces",
								description:
									"AI drafts. Humans approve. Every AI feature is optional and toggled per-school.",
							},
							{
								icon: Lock,
								title: "Data sovereignty",
								description:
									"Choose your AI provider. Run Ollama on-premises. Your data never has to leave your network.",
							},
							{
								icon: Users,
								title: "Built for everyone",
								description:
									"Staff, parents, and students each get their own tailored experience. Mobile-first design.",
							},
							{
								icon: Heart,
								title: "Schools, not shareholders",
								description:
									"We are building for schools, not for an IPO. Transparent pricing. No per-pupil fees.",
							},
							{
								icon: MessageCircle,
								title: "Replace, not add to",
								description:
									"Abridge replaces WhatsApp, email newsletters, paper forms, and fragmented tools with one platform.",
							},
						].map((value) => {
							const Icon = value.icon;
							return (
								<div
									key={value.title}
									className="bg-card rounded-2xl p-6 border border-orange-100/60 shadow-sm"
								>
									<div className="w-10 h-10 rounded-xl bg-[#1E3A5F]/5 flex items-center justify-center mb-4">
										<Icon className="w-5 h-5 text-[#1E3A5F]" />
									</div>
									<h3 className="text-lg font-semibold mb-2 text-[#1E3A5F]">{value.title}</h3>
									<p className="text-sm text-slate-500 leading-relaxed">{value.description}</p>
								</div>
							);
						})}
					</div>
				</div>
			</section>

			{/* ============================================================ */}
			{/*  TEAM                                                         */}
			{/* ============================================================ */}
			<section className="py-16 lg:py-24 bg-orange-50/30">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
					<h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-[#1E3A5F]">
						The team
					</h2>
					<p className="text-lg text-slate-500 mb-10 leading-relaxed">
						Abridge was built by a developer who saw how broken school-parent communication is. No
						background in edtech — just frustration with WhatsApp groups and a belief that AI can
						help.
					</p>

					<div className="bg-orange-50/40 rounded-2xl p-8 border border-orange-100/60">
						<div className="flex items-start gap-6">
							<div className="w-16 h-16 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center shrink-0">
								<span className="text-2xl font-bold text-[#1E3A5F]">HP</span>
							</div>
							<div>
								<h3 className="text-lg font-semibold text-[#1E3A5F]">Hiten Patel</h3>
								<p className="text-sm text-[#FF7D45] font-medium mb-3">Founder & Developer</p>
								<p className="text-muted-foreground leading-relaxed">
									Software engineer passionate about making school communication better for parents
									and teachers. Building Abridge to replace WhatsApp groups with something that
									actually works for schools.
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* ============================================================ */}
			{/*  CONTACT                                                      */}
			{/* ============================================================ */}
			<section className="py-16 lg:py-24">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
					<h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-[#1E3A5F]">
						Get in touch
					</h2>
					<p className="text-lg text-slate-500 mb-8 leading-relaxed">
						Whether you are a school interested in the pilot programme, a parent with questions, or
						a developer who wants to contribute, we would love to hear from you.
					</p>

					<div className="grid sm:grid-cols-2 gap-6">
						<a
							href="mailto:hello@abridge.school"
							className="flex items-center gap-4 bg-card rounded-2xl p-6 border border-orange-100/60 shadow-sm hover:shadow-md transition-shadow group"
						>
							<div className="w-12 h-12 rounded-xl bg-[#FF7D45]/10 flex items-center justify-center shrink-0">
								<Mail className="w-6 h-6 text-[#FF7D45]" />
							</div>
							<div>
								<h3 className="font-semibold text-[#1E3A5F] group-hover:text-[#FF7D45] transition-colors">
									Email us
								</h3>
								<p className="text-sm text-slate-500">hello@abridge.school</p>
							</div>
						</a>
						<a
							href="https://github.com/hitenpatel/abridge"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-4 bg-card rounded-2xl p-6 border border-orange-100/60 shadow-sm hover:shadow-md transition-shadow group"
						>
							<div className="w-12 h-12 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center shrink-0">
								<Sparkles className="w-6 h-6 text-[#1E3A5F]" />
							</div>
							<div>
								<h3 className="font-semibold text-[#1E3A5F] group-hover:text-[#FF7D45] transition-colors">
									GitHub
								</h3>
								<p className="text-sm text-slate-500">View the source code</p>
							</div>
						</a>
					</div>
				</div>
			</section>

			{/* ============================================================ */}
			{/*  CTA                                                          */}
			{/* ============================================================ */}
			<section className="py-20 lg:py-28 bg-[#1E3A5F]">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-6">
						Join the pilot programme
					</h2>
					<p className="text-lg text-blue-100 mb-10 max-w-2xl mx-auto">
						We are looking for UK schools that want to transform how they communicate with parents.
						Apply today and help shape the future of school communication.
					</p>
					<Link
						href="/setup"
						className="inline-flex items-center justify-center gap-2 bg-[#FF7D45] hover:bg-[#E86B35] text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-black/20 text-base"
					>
						Apply for Early Access
						<ArrowRight className="w-5 h-5" />
					</Link>
				</div>
			</section>

			{/* ============================================================ */}
			{/*  FOOTER                                                       */}
			{/* ============================================================ */}
			<footer className="bg-[#1E3A5F] text-blue-200 py-16 border-t border-[#2A4D73]">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
						<div className="col-span-2 md:col-span-1">
							<div className="flex items-center gap-2.5 mb-4">
								<div className="w-8 h-8 rounded-lg bg-[#FF7D45] flex items-center justify-center">
									<BookOpen className="w-4 h-4 text-white" />
								</div>
								<span className="text-lg font-bold text-white">Abridge</span>
							</div>
							<p className="text-sm leading-relaxed">
								The AI-first school communication platform. Built for UK schools.
							</p>
						</div>
						<div>
							<h4 className="text-sm font-semibold text-white mb-4">Product</h4>
							<ul className="space-y-2.5 text-sm">
								<li>
									<Link href="/features" className="hover:text-white transition-colors">
										Features
									</Link>
								</li>
								<li>
									<Link href="/pricing" className="hover:text-white transition-colors">
										Pricing
									</Link>
								</li>
							</ul>
						</div>
						<div>
							<h4 className="text-sm font-semibold text-white mb-4">Company</h4>
							<ul className="space-y-2.5 text-sm">
								<li>
									<Link href="/about" className="hover:text-white transition-colors">
										About
									</Link>
								</li>
								<li>
									<a
										href="mailto:hello@abridge.school"
										className="flex items-center gap-1.5 hover:text-white transition-colors"
									>
										<Mail className="w-3.5 h-3.5" />
										Contact
									</a>
								</li>
							</ul>
						</div>
						<div>
							<h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
							<ul className="space-y-2.5 text-sm">
								<li>
									<a href="/privacy" className="hover:text-white transition-colors">
										Privacy Policy
									</a>
								</li>
								<li>
									<a href="/terms" className="hover:text-white transition-colors">
										Terms of Service
									</a>
								</li>
							</ul>
						</div>
					</div>
					<div className="border-t border-[#2A4D73] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
						<p className="text-sm">
							&copy; {new Date().getFullYear()} Abridge. All rights reserved.
						</p>
						<div className="flex items-center gap-6">
							<a
								href="https://github.com/hitenpatel/abridge"
								className="text-sm hover:text-white transition-colors"
								target="_blank"
								rel="noopener noreferrer"
							>
								GitHub
							</a>
							<a
								href="https://twitter.com/abridge"
								className="text-sm hover:text-white transition-colors"
								target="_blank"
								rel="noopener noreferrer"
							>
								Twitter
							</a>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
