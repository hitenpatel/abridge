"use client";

import {
	ArrowRight,
	BookOpen,
	Brain,
	Building2,
	Camera,
	Check,
	CheckCircle,
	ChevronDown,
	Globe,
	GraduationCap,
	Lock,
	Mail,
	Menu,
	MessageCircle,
	Server,
	Shield,
	Sparkles,
	Trophy,
	X,
	XIcon,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const NAV_LINKS = [
	{ label: "Features", href: "#features" },
	{ label: "AI", href: "#ai-showcase" },
	{ label: "Compare", href: "#comparison" },
	{ label: "Pricing", href: "#pricing" },
	{ label: "FAQ", href: "#faq" },
];

const FEATURES = [
	{
		icon: Sparkles,
		title: "AI Progress Summaries",
		description:
			"Weekly reports enriched with AI-generated insights. Highlight trends, celebrate wins, and flag concerns automatically. No competitor offers this.",
		color: "text-[#2567EB]",
		bg: "bg-[#2567EB]/10",
	},
	{
		icon: MessageCircle,
		title: "Real-time Chat",
		description:
			"Replace WhatsApp groups with GDPR-compliant, auditable parent-teacher messaging. Instant delivery, full control.",
		color: "text-[#3B82F6]",
		bg: "bg-[#3B82F6]/10",
	},
	{
		icon: CheckCircle,
		title: "Smart Attendance",
		description:
			"Pattern-detection algorithms alert staff to concerning absence trends before they escalate. Parents receive instant notifications.",
		color: "text-emerald-600",
		bg: "bg-emerald-600/10",
	},
	{
		icon: Trophy,
		title: "Achievement System",
		description:
			"Points, badges, and leaderboards that celebrate every child. Motivate positive behaviour and keep parents in the loop.",
		color: "text-amber-500",
		bg: "bg-amber-500/10",
	},
	{
		icon: Camera,
		title: "Photo Gallery",
		description:
			"Share school moments safely without social media. Parents view approved photos in a private, permission-controlled gallery.",
		color: "text-pink-500",
		bg: "bg-pink-500/10",
	},
	{
		icon: GraduationCap,
		title: "Student Portal",
		description:
			"Older students manage their own homework, timetable, and reading diary. Build responsibility and independence.",
		color: "text-violet-600",
		bg: "bg-violet-600/10",
	},
];

const COMPARISON_FEATURES = [
	"AI Insights",
	"Real-time Chat",
	"Achievement System",
	"Photo Gallery",
	"Student Portal",
	"MIS Integration",
	"Feature Toggles",
	"Self-Host Option",
	"Security Audit",
];

const COMPETITORS = ["ClassDojo", "ParentMail", "Weduc", "Arbor"];

// true = has feature, false = missing
const COMPETITOR_DATA: Record<string, boolean[]> = {
	Abridge: [true, true, true, true, true, true, true, true, true],
	ClassDojo: [false, true, true, true, false, false, false, false, false],
	ParentMail: [false, false, false, false, false, true, false, false, true],
	Weduc: [false, true, false, true, false, true, false, false, false],
	Arbor: [false, false, false, false, false, true, false, false, true],
};

const FAQS = [
	{
		question: "Is Abridge GDPR compliant?",
		answer:
			"Yes. All data is stored on UK-based servers and processed in accordance with UK GDPR and the Data Protection Act 2018. We provide a full Data Processing Agreement (DPA) and have completed a thorough security audit. Schools remain the data controller at all times.",
	},
	{
		question: "Can we use our own AI provider?",
		answer:
			"Absolutely. Abridge supports Claude (Anthropic), OpenAI, Google Gemini, Groq, and Ollama. If data sovereignty is a priority, run Ollama on-premises so no student data ever leaves your network. All AI features are optional and toggled per-school.",
	},
	{
		question: "How does Abridge replace WhatsApp?",
		answer:
			"Abridge provides real-time, GDPR-compliant chat between staff and parents with full audit trails. Unlike WhatsApp, messages are stored securely, staff can manage conversations centrally, and there is no need to share personal phone numbers. Schools retain full control of all communications.",
	},
	{
		question: "What's included in the free tier?",
		answer:
			"The Starter plan includes one admin account, basic messaging and announcements, attendance tracking, calendar events, and a parent mobile app. It is designed to let schools try Abridge risk-free before upgrading.",
	},
	{
		question: "Can students log in?",
		answer:
			"Yes. The Student Portal lets older students access their homework assignments, timetable, reading diary, and achievement points. Schools control which year groups have student access via feature toggles.",
	},
	{
		question: "Is there a mobile app?",
		answer:
			"Yes. Abridge has a native mobile app for iOS and Android built with Expo (React Native). Parents and students can receive push notifications, view messages, check attendance, and browse the photo gallery on the go.",
	},
];

const PRICING_TIERS = [
	{
		name: "Starter",
		price: "Free",
		period: "",
		description: "For schools getting started",
		features: [
			"1 admin account",
			"Basic messaging & announcements",
			"Attendance tracking",
			"Calendar events",
			"Parent mobile app",
		],
		cta: "Start Free",
		highlighted: false,
	},
	{
		name: "Pro",
		price: "\u00A3500",
		period: "/year",
		description: "For engaged schools",
		features: [
			"Everything in Starter",
			"AI progress summaries",
			"Real-time parent-teacher chat",
			"Achievement system & leaderboards",
			"Photo gallery",
			"Student portal",
			"Unlimited staff accounts",
			"Payment collection (Stripe)",
		],
		cta: "Start Trial",
		highlighted: true,
	},
	{
		name: "Enterprise",
		price: "Contact us",
		period: "",
		description: "For MATs & large schools",
		features: [
			"Everything in Pro",
			"Self-hosting option",
			"Priority support & SLA",
			"Custom integrations",
			"Dedicated account manager",
			"On-premises AI (Ollama)",
			"Multi-school management",
		],
		cta: "Contact Sales",
		highlighted: false,
	},
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Home() {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [openFaq, setOpenFaq] = useState<number | null>(null);
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 20);
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<div className="min-h-screen bg-[#F8FAFC] text-[#1E293B]">
			{/* ============================================================ */}
			{/*  NAVIGATION                                                   */}
			{/* ============================================================ */}
			<nav
				className={`fixed top-0 w-full z-50 transition-all duration-300 ${
					scrolled
						? "bg-white/90 backdrop-blur-lg shadow-sm border-b border-slate-200"
						: "bg-transparent"
				}`}
			>
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16 lg:h-20">
						{/* Logo */}
						<a href="/" className="flex items-center gap-2.5 group">
							<div className="w-9 h-9 rounded-xl bg-[#2567EB] flex items-center justify-center transition-transform group-hover:scale-105">
								<BookOpen className="w-5 h-5 text-white" strokeWidth={2.5} />
							</div>
							<span className="text-xl font-bold tracking-tight">Abridge</span>
						</a>

						{/* Desktop links */}
						<div className="hidden lg:flex items-center gap-8">
							{NAV_LINKS.map((link) => (
								<a
									key={link.href}
									href={link.href}
									className="text-sm font-medium text-slate-600 hover:text-[#2567EB] transition-colors"
								>
									{link.label}
								</a>
							))}
						</div>

						{/* Desktop CTA */}
						<div className="hidden lg:flex items-center gap-3">
							<Link
								href="/login"
								className="text-sm font-medium text-slate-600 hover:text-[#2567EB] transition-colors px-4 py-2"
							>
								Log in
							</Link>
							<Link
								href="/register"
								className="inline-flex items-center gap-2 bg-[#F97316] hover:bg-[#EA6C10] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-sm"
							>
								Get Started Free
								<ArrowRight className="w-4 h-4" />
							</Link>
						</div>

						{/* Mobile menu toggle */}
						<button
							type="button"
							className="lg:hidden p-2 text-slate-600"
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
							aria-label="Toggle menu"
						>
							{mobileMenuOpen ? <XIcon className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
						</button>
					</div>
				</div>

				{/* Mobile menu */}
				{mobileMenuOpen && (
					<div className="lg:hidden bg-white border-t border-slate-200 shadow-lg">
						<div className="px-4 py-4 space-y-1">
							{NAV_LINKS.map((link) => (
								<a
									key={link.href}
									href={link.href}
									className="block px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-[#2567EB] hover:bg-slate-50 rounded-lg transition-colors"
									onClick={() => setMobileMenuOpen(false)}
								>
									{link.label}
								</a>
							))}
							<div className="pt-3 border-t border-slate-100 space-y-2">
								<Link
									href="/login"
									className="block px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-[#2567EB] rounded-lg"
								>
									Log in
								</Link>
								<Link
									href="/register"
									className="block text-center bg-[#F97316] hover:bg-[#EA6C10] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
								>
									Get Started Free
								</Link>
							</div>
						</div>
					</div>
				)}
			</nav>

			{/* ============================================================ */}
			{/*  1. HERO SECTION                                              */}
			{/* ============================================================ */}
			<section className="relative pt-28 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
				{/* Gradient background */}
				<div className="absolute inset-0 bg-gradient-to-b from-[#2567EB]/5 via-[#3B82F6]/3 to-white pointer-events-none" />
				<div className="absolute top-20 right-0 w-[600px] h-[600px] bg-[#2567EB]/5 rounded-full blur-3xl pointer-events-none" />
				<div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#3B82F6]/5 rounded-full blur-3xl pointer-events-none" />

				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					<div className="max-w-4xl mx-auto">
						<div className="inline-flex items-center gap-2 bg-[#2567EB]/10 text-[#2567EB] text-sm font-medium px-4 py-1.5 rounded-full mb-8">
							<Zap className="w-4 h-4" />
							AI-powered school communications
						</div>

						<h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
							The AI-first school <span className="text-[#2567EB]">communication</span> platform
						</h1>

						<p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
							Replace WhatsApp groups. Automate progress reports. Keep parents engaged. All in one
							app that schools actually love.
						</p>

						<div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
							<Link
								href="/register"
								className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#F97316] hover:bg-[#EA6C10] text-white font-semibold px-8 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 text-base"
							>
								Get Started Free
								<ArrowRight className="w-5 h-5" />
							</Link>
							<a
								href="#pricing"
								className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border-2 border-[#2567EB] text-[#2567EB] hover:bg-[#2567EB] hover:text-white font-semibold px-8 py-3.5 rounded-xl transition-all duration-200 text-base"
							>
								Book a Demo
							</a>
						</div>

						{/* Trust badges */}
						<div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-slate-400">
							<div className="flex items-center gap-2">
								<Globe className="w-4 h-4" />
								<span>Used by schools across the UK</span>
							</div>
							<div className="flex items-center gap-2">
								<Shield className="w-4 h-4" />
								<span>Cyber Essentials Ready</span>
							</div>
							<div className="flex items-center gap-2">
								<Lock className="w-4 h-4" />
								<span>GDPR Compliant</span>
							</div>
							<div className="flex items-center gap-2">
								<Server className="w-4 h-4" />
								<span>Data stays in the UK</span>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* ============================================================ */}
			{/*  2. SOCIAL PROOF BAR                                          */}
			{/* ============================================================ */}
			<section className="py-16 bg-white border-y border-slate-100">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<p className="text-center text-sm font-medium text-slate-400 uppercase tracking-wider mb-10">
						Trusted by 50+ schools across the UK
					</p>

					{/* Placeholder school logos */}
					<div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16 mb-12">
						{[
							"Oakwood Primary",
							"St Mary's Academy",
							"Riverside School",
							"The Grammar School",
							"Hillcrest MAT",
							"Westfield College",
						].map((school) => (
							<div key={school} className="flex items-center gap-2 text-slate-300">
								<Building2 className="w-6 h-6" />
								<span className="text-sm font-medium whitespace-nowrap">{school}</span>
							</div>
						))}
					</div>

					{/* Stats */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
						{[
							{ value: "10,000+", label: "Parents connected" },
							{ value: "50,000+", label: "Messages sent" },
							{ value: "99.9%", label: "Uptime" },
						].map((stat) => (
							<div key={stat.label} className="text-center">
								<div className="text-3xl lg:text-4xl font-bold text-[#2567EB]">{stat.value}</div>
								<div className="text-sm text-slate-500 mt-1">{stat.label}</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ============================================================ */}
			{/*  3. FEATURES GRID                                             */}
			{/* ============================================================ */}
			<section id="features" className="py-20 lg:py-28">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center max-w-3xl mx-auto mb-16">
						<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
							Everything your school needs
						</h2>
						<p className="text-lg text-slate-500">
							Six powerful modules that replace fragmented tools with one unified, AI-enhanced
							platform.
						</p>
					</div>

					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
						{FEATURES.map((feature) => {
							const Icon = feature.icon;
							return (
								<div
									key={feature.title}
									className="group bg-white rounded-2xl p-8 border border-slate-100 hover:border-[#2567EB]/20 hover:shadow-lg hover:shadow-[#2567EB]/5 transition-all duration-300"
								>
									<div
										className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-5`}
									>
										<Icon className={`w-6 h-6 ${feature.color}`} />
									</div>
									<h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
									<p className="text-slate-500 leading-relaxed">{feature.description}</p>
								</div>
							);
						})}
					</div>
				</div>
			</section>

			{/* ============================================================ */}
			{/*  4. AI SHOWCASE                                               */}
			{/* ============================================================ */}
			<section id="ai-showcase" className="py-20 lg:py-28 bg-gradient-to-b from-white to-slate-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center max-w-3xl mx-auto mb-16">
						<div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
							<Brain className="w-4 h-4" />
							Responsible AI
						</div>
						<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
							AI that works for schools, not against them
						</h2>
						<p className="text-lg text-slate-500">
							All AI features are optional. Schools control everything via feature toggles.
						</p>
					</div>

					<div className="grid lg:grid-cols-3 gap-8">
						{/* Choose Your AI Provider */}
						<div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
							<h3 className="text-lg font-semibold mb-2">Choose Your AI Provider</h3>
							<p className="text-sm text-slate-500 mb-6">
								Your data, your rules. Run AI locally with Ollama for complete privacy.
							</p>
							<div className="grid grid-cols-2 gap-3">
								{[
									{ name: "Claude", sub: "Anthropic" },
									{ name: "GPT-4", sub: "OpenAI" },
									{ name: "Gemini", sub: "Google" },
									{ name: "Ollama", sub: "Self-hosted" },
								].map((provider) => (
									<div
										key={provider.name}
										className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100"
									>
										<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2567EB]/20 to-violet-500/20 flex items-center justify-center">
											<Brain className="w-4 h-4 text-[#2567EB]" />
										</div>
										<div>
											<div className="text-sm font-medium">{provider.name}</div>
											<div className="text-xs text-slate-400">{provider.sub}</div>
										</div>
									</div>
								))}
							</div>
							<div className="mt-5 flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
								<Lock className="w-3.5 h-3.5" />
								<span>On-premises option keeps data on your network</span>
							</div>
						</div>

						{/* Weekly Progress Summaries */}
						<div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
							<h3 className="text-lg font-semibold mb-2">Weekly Progress Summaries</h3>
							<p className="text-sm text-slate-500 mb-6">
								AI-generated insights delivered to parents every week.
							</p>
							<div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-4">
								<div className="flex items-center justify-between text-sm">
									<span className="font-medium">Week of 10 Mar 2026</span>
									<span className="text-xs bg-[#2567EB]/10 text-[#2567EB] px-2 py-0.5 rounded-full font-medium">
										AI Generated
									</span>
								</div>
								<div className="grid grid-cols-3 gap-3">
									<div className="text-center">
										<div className="text-2xl font-bold text-[#2567EB]">96%</div>
										<div className="text-xs text-slate-400">Attendance</div>
									</div>
									<div className="text-center">
										<div className="text-2xl font-bold text-emerald-600">12</div>
										<div className="text-xs text-slate-400">Merits</div>
									</div>
									<div className="text-center">
										<div className="text-2xl font-bold text-amber-500">3</div>
										<div className="text-xs text-slate-400">Homework</div>
									</div>
								</div>
								<div className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-100">
									<Sparkles className="w-4 h-4 text-[#2567EB] inline mr-1.5" />
									<span className="italic">
										"Excellent week. Attendance improved from 90% to 96%. Strong participation in
										maths — consider advanced problem sets."
									</span>
								</div>
							</div>
						</div>

						{/* Smart Drafting */}
						<div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
							<h3 className="text-lg font-semibold mb-2">Smart Drafting</h3>
							<p className="text-sm text-slate-500 mb-6">
								Staff type a quick prompt, AI generates a professional message.
							</p>
							<div className="space-y-4">
								<div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
									<div className="text-xs text-slate-400 mb-2">Staff types:</div>
									<div className="text-sm text-slate-700">
										"remind year 4 parents about the trip on friday, need packed lunch and
										waterproofs"
									</div>
								</div>
								<div className="flex justify-center">
									<div className="flex items-center gap-1 text-[#2567EB]">
										<Sparkles className="w-4 h-4" />
										<span className="text-xs font-medium">AI generates</span>
										<ArrowRight className="w-3 h-3" />
									</div>
								</div>
								<div className="bg-[#2567EB]/5 rounded-xl p-4 border border-[#2567EB]/10">
									<div className="text-xs text-[#2567EB] mb-2 font-medium">Generated message:</div>
									<div className="text-sm text-slate-700 leading-relaxed">
										Dear Year 4 Parents,
										<br />
										<br />A reminder that our school trip takes place this Friday. Please ensure
										your child brings a packed lunch and waterproof clothing. We look forward to a
										wonderful day out.
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* ============================================================ */}
			{/*  5. COMPETITOR COMPARISON                                     */}
			{/* ============================================================ */}
			<section id="comparison" className="py-20 lg:py-28">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center max-w-3xl mx-auto mb-16">
						<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
							See how Abridge compares
						</h2>
						<p className="text-lg text-slate-500">
							The only platform that combines AI insights, real-time chat, and full school
							management in one place.
						</p>
					</div>

					{/* Desktop table */}
					<div className="hidden lg:block overflow-hidden rounded-2xl border border-slate-200 bg-white">
						<table className="w-full">
							<thead>
								<tr className="border-b border-slate-200">
									<th className="text-left py-4 px-6 text-sm font-medium text-slate-500">
										Feature
									</th>
									<th className="py-4 px-6 text-sm font-semibold text-white bg-[#2567EB] text-center">
										Abridge
									</th>
									{COMPETITORS.map((c) => (
										<th
											key={c}
											className="py-4 px-6 text-sm font-medium text-slate-500 text-center"
										>
											{c}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{COMPARISON_FEATURES.map((feature, i) => (
									<tr
										key={feature}
										className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
									>
										<td className="py-4 px-6 text-sm font-medium">{feature}</td>
										<td className="py-4 px-6 text-center bg-[#2567EB]/5">
											{COMPETITOR_DATA.Abridge[i] ? (
												<Check className="w-5 h-5 text-[#2567EB] mx-auto" />
											) : (
												<X className="w-5 h-5 text-slate-300 mx-auto" />
											)}
										</td>
										{COMPETITORS.map((c) => (
											<td key={c} className="py-4 px-6 text-center">
												{COMPETITOR_DATA[c]?.[i] ? (
													<Check className="w-5 h-5 text-emerald-500 mx-auto" />
												) : (
													<X className="w-5 h-5 text-slate-300 mx-auto" />
												)}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Mobile comparison cards */}
					<div className="lg:hidden space-y-4">
						{COMPARISON_FEATURES.map((feature, i) => (
							<div key={feature} className="bg-white rounded-xl border border-slate-200 p-4">
								<div className="text-sm font-medium mb-3">{feature}</div>
								<div className="grid grid-cols-5 gap-2 text-center">
									{["Abridge", ...COMPETITORS].map((name) => (
										<div key={name}>
											<div
												className={`text-xs mb-1 ${name === "Abridge" ? "font-semibold text-[#2567EB]" : "text-slate-400"}`}
											>
												{name}
											</div>
											{COMPETITOR_DATA[name]?.[i] ? (
												<Check
													className={`w-4 h-4 mx-auto ${name === "Abridge" ? "text-[#2567EB]" : "text-emerald-500"}`}
												/>
											) : (
												<X className="w-4 h-4 text-slate-300 mx-auto" />
											)}
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ============================================================ */}
			{/*  6. PRICING                                                   */}
			{/* ============================================================ */}
			<section id="pricing" className="py-20 lg:py-28 bg-gradient-to-b from-slate-50 to-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center max-w-3xl mx-auto mb-16">
						<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
							Simple, transparent pricing
						</h2>
						<p className="text-lg text-slate-500">
							No hidden fees. No per-pupil charges. Start free and upgrade when you are ready.
						</p>
					</div>

					<div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
						{PRICING_TIERS.map((tier) => (
							<div
								key={tier.name}
								className={`relative bg-white rounded-2xl p-8 border-2 transition-shadow ${
									tier.highlighted
										? "border-[#2567EB] shadow-xl shadow-[#2567EB]/10"
										: "border-slate-200 hover:shadow-lg"
								}`}
							>
								{tier.highlighted && (
									<div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#2567EB] text-white text-xs font-semibold px-4 py-1 rounded-full">
										Most Popular
									</div>
								)}
								<div className="mb-6">
									<h3 className="text-lg font-semibold mb-1">{tier.name}</h3>
									<p className="text-sm text-slate-500">{tier.description}</p>
								</div>
								<div className="mb-6">
									<span className="text-4xl font-bold">{tier.price}</span>
									{tier.period && <span className="text-slate-500 ml-1">{tier.period}</span>}
								</div>
								<ul className="space-y-3 mb-8">
									{tier.features.map((feature) => (
										<li key={feature} className="flex items-start gap-3 text-sm">
											<Check className="w-4 h-4 text-[#2567EB] mt-0.5 shrink-0" />
											<span>{feature}</span>
										</li>
									))}
								</ul>
								<Link
									href={tier.name === "Enterprise" ? "#footer" : "/register"}
									className={`block text-center font-semibold py-3 px-6 rounded-xl transition-all duration-200 text-sm ${
										tier.highlighted
											? "bg-[#F97316] hover:bg-[#EA6C10] text-white shadow-lg shadow-orange-500/25"
											: "bg-slate-100 hover:bg-slate-200 text-slate-700"
									}`}
								>
									{tier.cta}
								</Link>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ============================================================ */}
			{/*  7. FAQ                                                       */}
			{/* ============================================================ */}
			<section id="faq" className="py-20 lg:py-28">
				<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
							Frequently asked questions
						</h2>
						<p className="text-lg text-slate-500">Everything you need to know about Abridge.</p>
					</div>

					<div className="space-y-3">
						{FAQS.map((faq, i) => (
							<div
								key={faq.question}
								className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-shadow hover:shadow-sm"
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
			{/*  8. FOOTER CTA + FOOTER                                      */}
			{/* ============================================================ */}

			{/* Final CTA */}
			<section className="py-20 lg:py-28 bg-[#2567EB]">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-6">
						Ready to transform your school?
					</h2>
					<p className="text-lg text-blue-100 mb-10 max-w-2xl mx-auto">
						Join schools across the UK that have replaced fragmented tools with one AI-powered
						platform. Get started in under five minutes.
					</p>
					<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
						<Link
							href="/register"
							className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#F97316] hover:bg-[#EA6C10] text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-black/20 text-base"
						>
							Get Started Free
							<ArrowRight className="w-5 h-5" />
						</Link>
						<a
							href="#pricing"
							className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white hover:bg-white/10 font-semibold px-8 py-4 rounded-xl transition-all duration-200 text-base"
						>
							Book a Demo
						</a>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer id="footer" className="bg-slate-900 text-slate-400 py-16">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
						{/* Brand */}
						<div className="col-span-2 md:col-span-4 lg:col-span-1 mb-4 lg:mb-0">
							<div className="flex items-center gap-2.5 mb-4">
								<div className="w-8 h-8 rounded-lg bg-[#2567EB] flex items-center justify-center">
									<BookOpen className="w-4 h-4 text-white" />
								</div>
								<span className="text-lg font-bold text-white">Abridge</span>
							</div>
							<p className="text-sm leading-relaxed">
								AI-first school communication platform. Built for UK schools.
							</p>
						</div>

						{/* Product */}
						<div>
							<h4 className="text-sm font-semibold text-white mb-4">Product</h4>
							<ul className="space-y-2.5 text-sm">
								<li>
									<a href="#features" className="hover:text-white transition-colors">
										Features
									</a>
								</li>
								<li>
									<a href="#ai-showcase" className="hover:text-white transition-colors">
										AI Showcase
									</a>
								</li>
								<li>
									<a href="#pricing" className="hover:text-white transition-colors">
										Pricing
									</a>
								</li>
								<li>
									<a href="#comparison" className="hover:text-white transition-colors">
										Compare
									</a>
								</li>
							</ul>
						</div>

						{/* Company */}
						<div>
							<h4 className="text-sm font-semibold text-white mb-4">Company</h4>
							<ul className="space-y-2.5 text-sm">
								<li>
									<a href="/about" className="hover:text-white transition-colors">
										About
									</a>
								</li>
								<li>
									<a href="/blog" className="hover:text-white transition-colors">
										Blog
									</a>
								</li>
								<li>
									<a href="/careers" className="hover:text-white transition-colors">
										Careers
									</a>
								</li>
								<li>
									<a href="/contact" className="hover:text-white transition-colors">
										Contact
									</a>
								</li>
							</ul>
						</div>

						{/* Legal */}
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
								<li>
									<a href="/dpa" className="hover:text-white transition-colors">
										Data Processing
									</a>
								</li>
								<li>
									<a href="/cookies" className="hover:text-white transition-colors">
										Cookie Policy
									</a>
								</li>
							</ul>
						</div>

						{/* Support */}
						<div>
							<h4 className="text-sm font-semibold text-white mb-4">Support</h4>
							<ul className="space-y-2.5 text-sm">
								<li>
									<a href="#faq" className="hover:text-white transition-colors">
										FAQ
									</a>
								</li>
								<li>
									<a href="/docs" className="hover:text-white transition-colors">
										Documentation
									</a>
								</li>
								<li>
									<a href="/status" className="hover:text-white transition-colors">
										Status Page
									</a>
								</li>
								<li>
									<a
										href="mailto:hello@abridge.school"
										className="flex items-center gap-1.5 hover:text-white transition-colors"
									>
										<Mail className="w-3.5 h-3.5" />
										hello@abridge.school
									</a>
								</li>
							</ul>
						</div>
					</div>

					{/* Bottom bar */}
					<div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
						<p className="text-sm">
							&copy; {new Date().getFullYear()} Abridge. All rights reserved.
						</p>
						<div className="flex items-center gap-6">
							{/* Social placeholder links */}
							{[
								{ name: "Twitter", url: "https://twitter.com/abridge" },
								{ name: "LinkedIn", url: "https://linkedin.com/company/abridge" },
								{ name: "GitHub", url: "https://github.com/abridge" },
							].map((platform) => (
								<a
									key={platform.name}
									href={platform.url}
									className="text-sm hover:text-white transition-colors"
									aria-label={platform.name}
									target="_blank"
									rel="noopener noreferrer"
								>
									{platform.name}
								</a>
							))}
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
