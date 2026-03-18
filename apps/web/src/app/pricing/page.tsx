"use client";

import { ArrowRight, BookOpen, Check, ChevronDown, Mail, Menu, XIcon } from "lucide-react";
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
/*  FAQ Data                                                           */
/* ------------------------------------------------------------------ */

const FAQS = [
	{
		question: "What is the pilot programme?",
		answer:
			"We are onboarding a small number of schools to help shape Abridge before wider launch. Pilot schools get full access to every feature at no cost. In return, we ask for honest feedback and a willingness to work with us on improvements.",
	},
	{
		question: "How long does the pilot last?",
		answer:
			"The pilot runs for the current academic year. At the end, pilot schools can transition to the Pro plan or continue on a negotiated basis. We will never cut off access without plenty of notice.",
	},
	{
		question: "What happens to our data if we stop using Abridge?",
		answer:
			"You own your data. If you decide to leave, we provide a full data export in standard formats (CSV, JSON). We delete all school data from our servers within 30 days of your request, in compliance with UK GDPR.",
	},
	{
		question: "Are there per-pupil charges?",
		answer:
			"No. Pricing is per school, not per pupil. Whether you have 100 or 1,000 students, the price is the same. No hidden fees, no surprise invoices.",
	},
	{
		question: "Can we pay monthly instead of annually?",
		answer:
			"The Pro plan is billed annually at \u00A3500/year (\u00A342/month). We do not currently offer month-to-month billing, but pilot schools pay nothing until the pilot ends.",
	},
	{
		question: "Is there a setup fee?",
		answer:
			"No. Setup is free. We provide onboarding support including data migration assistance, staff training, and parent communication templates to help you launch smoothly.",
	},
	{
		question: "Do you offer discounts for MATs?",
		answer:
			"Yes. Multi-academy trusts and school groups receive volume discounts. Contact us at hello@abridge.school to discuss your needs.",
	},
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PricingPage() {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	const [openFaq, setOpenFaq] = useState<number | null>(null);

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
						Simple, transparent pricing
					</h1>
					<p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
						Free during the pilot programme. No credit card required. No per-pupil charges. Ever.
					</p>
				</div>
			</section>

			{/* ============================================================ */}
			{/*  PRICING CARDS                                                */}
			{/* ============================================================ */}
			<section className="pb-20 lg:pb-28">
				<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid md:grid-cols-2 gap-8">
						{/* Free tier */}
						<div className="relative bg-card rounded-2xl p-8 border-2 border-orange-100/60 hover:shadow-lg transition-shadow">
							<div className="mb-6">
								<h2 className="text-xl font-bold mb-1 text-[#1E3A5F]">Free</h2>
								<p className="text-sm text-slate-500">For pilot programme schools</p>
							</div>
							<div className="mb-6">
								<span className="text-5xl font-bold text-[#1E3A5F]">{"\u00A3"}0</span>
								<span className="text-slate-500 ml-1">/month</span>
							</div>
							<p className="text-sm text-slate-400 mb-6">
								Full access to every feature while the pilot runs. No credit card required.
							</p>
							<ul className="space-y-3 mb-8">
								{[
									"All features included",
									"Unlimited staff accounts",
									"Unlimited parent accounts",
									"AI progress summaries",
									"Real-time chat",
									"Achievement system",
									"Photo gallery",
									"Student portal",
									"Parent mobile app",
									"Priority onboarding support",
								].map((feature) => (
									<li key={feature} className="flex items-start gap-3 text-sm">
										<Check className="w-4 h-4 text-[#FF7D45] mt-0.5 shrink-0" />
										<span>{feature}</span>
									</li>
								))}
							</ul>
							<Link
								href="/setup"
								className="block text-center font-semibold py-3 px-6 rounded-xl transition-all duration-200 text-sm bg-orange-100/50 hover:bg-orange-100 text-[#1E3A5F]"
							>
								Apply for Pilot
							</Link>
						</div>

						{/* Pro tier */}
						<div className="relative bg-card rounded-2xl p-8 border-2 border-[#FF7D45] shadow-xl shadow-orange-500/10">
							<div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#FF7D45] text-white text-xs font-semibold px-4 py-1 rounded-full">
								After Pilot
							</div>
							<div className="mb-6">
								<h2 className="text-xl font-bold mb-1 text-[#1E3A5F]">Pro</h2>
								<p className="text-sm text-slate-500">For schools ready to commit</p>
							</div>
							<div className="mb-2">
								<span className="text-5xl font-bold text-[#1E3A5F]">{"\u00A3"}42</span>
								<span className="text-slate-500 ml-1">/month</span>
							</div>
							<p className="text-sm text-slate-400 mb-6">
								Billed annually at {"\u00A3"}500/year. Volume discounts for MATs.
							</p>
							<ul className="space-y-3 mb-8">
								{[
									"Everything in Free",
									"Payment collection (Stripe)",
									"Data export tools",
									"Priority support",
									"Volume discounts for MATs",
								].map((feature) => (
									<li key={feature} className="flex items-start gap-3 text-sm">
										<Check className="w-4 h-4 text-[#FF7D45] mt-0.5 shrink-0" />
										<span>{feature}</span>
									</li>
								))}
							</ul>
							<Link
								href="/setup"
								className="block text-center font-semibold py-3 px-6 rounded-xl transition-all duration-200 text-sm bg-[#FF7D45] hover:bg-[#E86B35] text-white shadow-lg shadow-orange-500/25"
							>
								Apply for Early Access
							</Link>
						</div>
					</div>
				</div>
			</section>

			{/* ============================================================ */}
			{/*  FAQ                                                          */}
			{/* ============================================================ */}
			<section className="py-20 lg:py-28 bg-orange-50/30">
				<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-[#1E3A5F]">
							Pricing FAQ
						</h2>
						<p className="text-lg text-slate-500">
							Common questions about pricing, billing, and the pilot programme.
						</p>
					</div>

					<div className="space-y-3">
						{FAQS.map((faq, i) => (
							<div
								key={faq.question}
								className="bg-orange-50/40 rounded-xl border border-orange-100/60 overflow-hidden transition-shadow hover:shadow-sm"
							>
								<button
									type="button"
									className="w-full flex items-center justify-between px-6 py-5 text-left"
									onClick={() => setOpenFaq(openFaq === i ? null : i)}
									aria-expanded={openFaq === i}
								>
									<span className="font-medium pr-4">{faq.question}</span>
									<ChevronDown
										className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
											openFaq === i ? "rotate-180" : ""
										}`}
									/>
								</button>
								<div
									className={`overflow-hidden transition-all duration-300 ${
										openFaq === i ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
									}`}
								>
									<div className="px-6 pb-5 text-sm text-slate-500 leading-relaxed">
										{faq.answer}
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ============================================================ */}
			{/*  CTA                                                          */}
			{/* ============================================================ */}
			<section className="py-20 lg:py-28 bg-[#1E3A5F]">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-6">
						Ready to get started?
					</h2>
					<p className="text-lg text-blue-100 mb-10 max-w-2xl mx-auto">
						Apply for the pilot programme today. Full access, no cost, no credit card.
					</p>
					<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
						<Link
							href="/setup"
							className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#FF7D45] hover:bg-[#E86B35] text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-black/20 text-base"
						>
							Apply for Early Access
							<ArrowRight className="w-5 h-5" />
						</Link>
						<a
							href="mailto:hello@abridge.school"
							className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white hover:bg-white/10 font-semibold px-8 py-4 rounded-xl transition-all duration-200 text-base"
						>
							<Mail className="w-5 h-5" />
							Contact Us
						</a>
					</div>
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
