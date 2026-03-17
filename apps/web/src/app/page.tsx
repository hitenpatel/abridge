"use client";

import {
	ArrowRight,
	BookOpen,
	Brain,
	Camera,
	Check,
	CheckCircle,
	ChevronDown,
	GraduationCap,
	Lock,
	Mail,
	Menu,
	MessageCircle,
	Shield,
	ShieldCheck,
	Sparkles,
	Trophy,
	XIcon,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const NAV_LINKS = [
	{ label: "Features", href: "/features" },
	{ label: "Pricing", href: "/pricing" },
	{ label: "About", href: "/about" },
	{ label: "Compare", href: "#comparison" },
	{ label: "FAQ", href: "#faq" },
];

const FEATURES = [
	{
		icon: Sparkles,
		title: "AI Progress Summaries",
		description:
			"Weekly reports enriched with AI-generated insights. Highlight trends, celebrate wins, and flag concerns automatically.",
		detail: "No competitor offers this.",
		color: "text-[#FF7D45]",
		bg: "bg-[#FF7D45]/10",
		badge: "AI-Powered",
	},
	{
		icon: MessageCircle,
		title: "Real-time Chat",
		description:
			"Replace WhatsApp groups with GDPR-compliant, auditable parent-teacher messaging. Instant delivery, full control.",
		detail: "No personal phone numbers required.",
		color: "text-[#1E3A5F]",
		bg: "bg-[#1E3A5F]/10",
		badge: null,
	},
	{
		icon: CheckCircle,
		title: "Smart Attendance",
		description:
			"Pattern-detection algorithms alert staff to concerning absence trends before they escalate.",
		detail: "Parents receive instant notifications.",
		color: "text-emerald-600",
		bg: "bg-emerald-600/10",
		badge: "AI-Powered",
	},
	{
		icon: Trophy,
		title: "Achievement System",
		description:
			"Points, badges, and leaderboards that celebrate every child. Motivate positive behaviour and keep parents informed.",
		detail: "Gamification that actually works.",
		color: "text-amber-500",
		bg: "bg-amber-500/10",
		badge: null,
	},
	{
		icon: Camera,
		title: "Photo Gallery",
		description:
			"Share school moments safely without social media. Parents view approved photos in a private, permission-controlled gallery.",
		detail: "No social media required.",
		color: "text-pink-500",
		bg: "bg-pink-500/10",
		badge: null,
	},
	{
		icon: GraduationCap,
		title: "Student Portal",
		description:
			"Older students manage their own homework, timetable, and reading diary. Build responsibility and independence.",
		detail: "Controlled by year group.",
		color: "text-violet-600",
		bg: "bg-violet-600/10",
		badge: null,
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
	"Security Audit",
];

const COMPETITORS = ["ClassDojo", "ParentMail", "Weduc", "Arbor"];

const COMPETITOR_DATA: Record<string, boolean[]> = {
	Abridge: [true, true, true, true, true, true, true, true],
	ClassDojo: [false, true, true, true, false, false, false, false],
	ParentMail: [false, false, false, false, false, true, false, true],
	Weduc: [false, true, false, true, false, true, false, false],
	Arbor: [false, false, false, false, false, true, false, true],
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
		question: "What happens after the pilot programme?",
		answer:
			"Pilot schools get full access to every feature at no cost. When the pilot ends, you can continue on the Pro plan at \u00A342/month (billed annually at \u00A3500/year). No surprise charges, and you keep all your data.",
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
						? "bg-[#1E3A5F]/95 backdrop-blur-lg shadow-sm border-b border-[#1E3A5F]"
						: "bg-[#1E3A5F]"
				}`}
			>
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16 lg:h-20">
						{/* Logo */}
						<Link href="/" className="flex items-center gap-2.5 group">
							<div className="w-9 h-9 rounded-xl bg-[#FF7D45] flex items-center justify-center transition-transform group-hover:scale-105">
								<BookOpen className="w-5 h-5 text-white" strokeWidth={2.5} />
							</div>
							<span className="text-xl font-bold tracking-tight text-white">Abridge</span>
						</Link>

						{/* Desktop links */}
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

						{/* Desktop CTA */}
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

						{/* Mobile menu toggle */}
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

				{/* Mobile menu */}
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
			{/*  1. HERO SECTION                                              */}
			{/* ============================================================ */}
			<section className="relative pt-28 pb-20 lg:pt-40 lg:pb-32 overflow-hidden bg-gradient-to-b from-orange-50/50 to-background dark:from-orange-950/20">
				{/* Gradient background */}
				<div className="absolute inset-0 bg-gradient-to-b from-[#1E3A5F]/8 via-[#1E3A5F]/3 to-white pointer-events-none" />
				<div className="absolute top-20 right-0 w-[600px] h-[600px] bg-[#1E3A5F]/5 rounded-full blur-3xl pointer-events-none" />
				<div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#FF7D45]/5 rounded-full blur-3xl pointer-events-none" />

				<div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					<div className="max-w-4xl mx-auto">
						<div className="inline-flex items-center gap-2 bg-[#FF7D45]/10 text-[#FF7D45] text-sm font-medium px-4 py-1.5 rounded-full mb-8">
							<Zap className="w-4 h-4" />
							Now accepting pilot schools
						</div>

						<h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.1] mb-6 text-[#1E3A5F]">
							Every child&apos;s progress,
							<br />
							in every parent&apos;s hands
						</h1>

						<p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
							Abridge is the AI-first school communication platform. Replace WhatsApp. Automate
							reports. Keep every parent engaged.
						</p>

						<div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
							<Link
								href="/setup"
								className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#FF7D45] hover:bg-[#E86B35] text-white font-semibold px-8 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 text-base"
							>
								Apply for Early Access
								<ArrowRight className="w-5 h-5" />
							</Link>
							<a
								href="#features"
								className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-[#1E3A5F] hover:text-[#FF7D45] font-semibold px-8 py-3.5 transition-all duration-200 text-base"
							>
								See How It Works
								<ChevronDown className="w-4 h-4" />
							</a>
						</div>

						{/* Hero dashboard screenshot */}
						<div className="mt-4 [perspective:1000px] max-w-5xl mx-auto">
							<img
								src="/screenshots/dashboard.png"
								alt="Abridge dashboard"
								className="rounded-xl shadow-2xl border border-slate-200 w-full [transform:rotateX(2deg)] block"
							/>
						</div>
					</div>
				</div>
			</section>

			{/* ============================================================ */}
			{/*  2. TRUST BADGES                                              */}
			{/* ============================================================ */}
			<section className="py-14 bg-white border-y border-slate-100">
				<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
						{[
							{
								icon: ShieldCheck,
								label: "Cyber Essentials Ready",
								color: "text-[#1E3A5F]",
								bg: "bg-[#1E3A5F]/5",
							},
							{
								icon: Shield,
								label: "GDPR Compliant",
								color: "text-emerald-600",
								bg: "bg-emerald-50",
							},
							{
								icon: Lock,
								label: "UK Data Residency",
								color: "text-[#1E3A5F]",
								bg: "bg-[#1E3A5F]/5",
							},
							{
								icon: CheckCircle,
								label: "Security-First Design",
								color: "text-[#FF7D45]",
								bg: "bg-[#FF7D45]/5",
							},
						].map((badge) => {
							const Icon = badge.icon;
							return (
								<div
									key={badge.label}
									className={`flex flex-col items-center text-center gap-3 ${badge.bg} rounded-xl py-5 px-4`}
								>
									<Icon className={`w-7 h-7 ${badge.color}`} />
									<span className="text-sm font-semibold text-slate-700">{badge.label}</span>
								</div>
							);
						})}
					</div>
					<p className="text-center text-sm text-slate-400 mt-8">
						Currently onboarding pilot schools — apply for early access
					</p>
				</div>
			</section>

			{/* ============================================================ */}
			{/*  3. MISSION SECTION                                           */}
			{/* ============================================================ */}
			<section className="py-20 lg:py-28">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="max-w-3xl mx-auto text-center mb-16">
						<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6 text-[#1E3A5F]">
							Why Abridge exists
						</h2>
						<p className="text-lg text-slate-500 leading-relaxed">
							Schools spend hours on admin that could be automated. Parents miss updates buried in
							WhatsApp groups. Children&apos;s progress goes unreported until parents&apos; evening.
							We built Abridge to fix all three.
						</p>
					</div>

					<div className="grid md:grid-cols-3 gap-6 lg:gap-8">
						{[
							{
								key: "whatsapp",
								description: "Most UK schools rely on WhatsApp groups despite GDPR concerns",
							},
							{
								key: "admin",
								description: "Teachers spend hours every week on parent communication admin",
							},
							{
								key: "progress",
								description:
									"Too many parents only hear about their child\u2019s progress at parents\u2019 evening",
							},
						].map((card) => (
							<div
								key={card.key}
								className="bg-white rounded-2xl p-8 border border-slate-100 text-center shadow-sm"
							>
								<p className="text-slate-600 leading-relaxed">{card.description}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ============================================================ */}
			{/*  3b. SCREENSHOT GALLERY — "SEE THE PLATFORM"                  */}
			{/* ============================================================ */}
			<section className="py-20 lg:py-28 bg-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					{/* Section header */}
					<div className="max-w-3xl mx-auto text-center mb-14">
						<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 text-[#1E3A5F]">
							See the platform
						</h2>
						<p className="text-lg text-slate-500">
							Built for parents, teachers, and school admins. Here&apos;s what it looks like.
						</p>
					</div>

					{/* Main 2x2 grid */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
						{(
							[
								{ src: "dashboard", alt: "Parent Dashboard", label: "Parent Dashboard" },
								{ src: "homework", alt: "Homework Tracker", label: "Homework Tracker" },
								{ src: "progress", alt: "AI Progress Summaries", label: "AI Progress Summaries" },
								{ src: "achievements", alt: "Achievement Wall", label: "Achievement Wall" },
							] as const
						).map((shot) => (
							<div key={shot.src} className="flex flex-col gap-3">
								{/* Browser-window frame */}
								<div className="rounded-xl overflow-hidden shadow-lg border border-slate-200">
									{/* macOS-style title bar */}
									<div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center gap-1.5">
										<span className="w-3 h-3 rounded-full bg-red-400 block" />
										<span className="w-3 h-3 rounded-full bg-yellow-400 block" />
										<span className="w-3 h-3 rounded-full bg-green-400 block" />
									</div>
									<img
										src={`/screenshots/${shot.src}.png`}
										alt={shot.alt}
										className="w-full block"
									/>
								</div>
								<p className="text-sm font-medium text-slate-600 text-center">{shot.label}</p>
							</div>
						))}
					</div>

					{/* "See more" row — 4 smaller thumbnails */}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
						{(
							[
								{ src: "reading", alt: "Reading Diary", label: "Reading Diary" },
								{ src: "calendar", alt: "School Calendar", label: "School Calendar" },
								{ src: "messages", alt: "Messages", label: "Messages" },
								{ src: "attendance", alt: "Attendance", label: "Attendance" },
							] as const
						).map((shot) => (
							<div key={shot.src} className="flex flex-col gap-2">
								<div className="rounded-lg overflow-hidden shadow-md border border-slate-200">
									<div className="bg-slate-100 border-b border-slate-200 px-3 py-2 flex items-center gap-1">
										<span className="w-2 h-2 rounded-full bg-red-400 block" />
										<span className="w-2 h-2 rounded-full bg-yellow-400 block" />
										<span className="w-2 h-2 rounded-full bg-green-400 block" />
									</div>
									<img
										src={`/screenshots/${shot.src}.png`}
										alt={shot.alt}
										className="w-full block"
									/>
								</div>
								<p className="text-xs font-medium text-slate-500 text-center">{shot.label}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ============================================================ */}
			{/*  4. FEATURES — ALTERNATING LAYOUT                             */}
			{/* ============================================================ */}
			<section id="features" className="py-20 lg:py-28 bg-gradient-to-b from-white to-slate-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center max-w-3xl mx-auto mb-16">
						<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 text-[#1E3A5F]">
							Everything your school needs
						</h2>
						<p className="text-lg text-slate-500">
							Six powerful modules that replace fragmented tools with one unified, AI-enhanced
							platform.
						</p>
					</div>

					<div className="space-y-12 lg:space-y-20">
						{FEATURES.map((feature, i) => {
							const Icon = feature.icon;
							const isReversed = i % 2 === 1;
							return (
								<div
									key={feature.title}
									className={`stagger-child flex flex-col lg:flex-row items-center gap-8 lg:gap-16 ${
										isReversed ? "lg:flex-row-reverse" : ""
									}`}
									style={{ "--stagger-index": i } as React.CSSProperties}
								>
									{/* Visual placeholder */}
									<div className="w-full lg:w-1/2">
										<div
											className={`${feature.bg} rounded-2xl aspect-[4/3] flex items-center justify-center relative overflow-hidden`}
										>
											<Icon className={`w-20 h-20 ${feature.color} opacity-20`} />
											{feature.badge && (
												<div className="absolute top-4 right-4 bg-[#FF7D45]/10 text-[#FF7D45] text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
													<Sparkles className="w-3 h-3" />
													{feature.badge}
												</div>
											)}
										</div>
									</div>
									{/* Text content */}
									<div className="w-full lg:w-1/2">
										<div
											className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-5`}
										>
											<Icon className={`w-6 h-6 ${feature.color}`} />
										</div>
										<h3 className="text-2xl font-bold mb-3 text-[#1E3A5F]">{feature.title}</h3>
										<p className="text-slate-500 leading-relaxed mb-2">{feature.description}</p>
										<p className="text-sm text-slate-400 mb-4">{feature.detail}</p>
										<Link
											href="/features"
											className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#FF7D45] hover:text-[#E86B35] transition-colors"
										>
											Learn more
											<ArrowRight className="w-4 h-4" />
										</Link>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</section>

			{/* ============================================================ */}
			{/*  5. AI SHOWCASE                                               */}
			{/* ============================================================ */}
			<section id="ai-showcase" className="py-20 lg:py-28 bg-gradient-to-b from-slate-50 to-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="max-w-3xl mx-auto text-center mb-16">
						<div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
							<Brain className="w-4 h-4" />
							Responsible AI
						</div>
						<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 text-[#1E3A5F]">
							AI that respects your data
						</h2>
						<p className="text-lg text-slate-500">
							Choose your provider. Run locally with Ollama. Or turn AI off entirely. You are always
							in control.
						</p>
					</div>

					<div className="max-w-2xl mx-auto">
						{/* Provider selection card */}
						<div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
							<h3 className="text-lg font-semibold mb-2 text-[#1E3A5F]">Choose your AI provider</h3>
							<p className="text-sm text-slate-500 mb-6">
								Your data, your rules. Run AI locally with Ollama for complete data sovereignty.
							</p>
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
								{[
									{ name: "Claude", sub: "Anthropic" },
									{ name: "GPT-4", sub: "OpenAI" },
									{ name: "Gemini", sub: "Google" },
									{ name: "Ollama", sub: "On-premises" },
								].map((provider) => (
									<div
										key={provider.name}
										className="flex flex-col items-center gap-2 bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-[#1E3A5F]/20 transition-colors"
									>
										<div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1E3A5F]/10 to-violet-500/10 flex items-center justify-center">
											<Brain className="w-5 h-5 text-[#1E3A5F]" />
										</div>
										<div className="text-center">
											<div className="text-sm font-medium">{provider.name}</div>
											<div className="text-xs text-slate-400">{provider.sub}</div>
										</div>
									</div>
								))}
							</div>
							<div className="mt-6 flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-4 py-2.5 rounded-lg">
								<Lock className="w-3.5 h-3.5 shrink-0" />
								<span>On-premises option keeps all student data on your network</span>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* ============================================================ */}
			{/*  6. COMPETITOR COMPARISON                                     */}
			{/* ============================================================ */}
			<section id="comparison" className="py-20 lg:py-28">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center max-w-3xl mx-auto mb-16">
						<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 text-[#1E3A5F]">
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
									<th className="py-4 px-6 text-sm font-semibold text-white bg-[#1E3A5F] text-center">
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
										<td className="py-4 px-6 text-center bg-[#1E3A5F]/5">
											{COMPETITOR_DATA.Abridge?.[i] ? (
												<Check className="w-5 h-5 text-[#FF7D45] mx-auto" />
											) : (
												<span className="text-slate-300">&mdash;</span>
											)}
										</td>
										{COMPETITORS.map((c) => (
											<td key={c} className="py-4 px-6 text-center">
												{COMPETITOR_DATA[c]?.[i] ? (
													<Check className="w-5 h-5 text-emerald-500 mx-auto" />
												) : (
													<span className="text-slate-300">&mdash;</span>
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
												className={`text-xs mb-1 ${name === "Abridge" ? "font-semibold text-[#1E3A5F]" : "text-slate-400"}`}
											>
												{name}
											</div>
											{COMPETITOR_DATA[name]?.[i] ? (
												<Check
													className={`w-4 h-4 mx-auto ${name === "Abridge" ? "text-[#FF7D45]" : "text-emerald-500"}`}
												/>
											) : (
												<span className="text-slate-300 text-sm">&mdash;</span>
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
			{/*  7. PRICING                                                   */}
			{/* ============================================================ */}
			<section id="pricing" className="py-20 lg:py-28 bg-gradient-to-b from-slate-50 to-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center max-w-3xl mx-auto mb-16">
						<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 text-[#1E3A5F]">
							Simple, transparent pricing
						</h2>
						<p className="text-lg text-slate-500">
							Free during the pilot programme. No credit card required.
						</p>
					</div>

					<div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
						{/* Free tier */}
						<div className="relative bg-white rounded-2xl p-8 border-2 border-slate-200 hover:shadow-lg transition-shadow">
							<div className="mb-6">
								<h3 className="text-lg font-semibold mb-1 text-[#1E3A5F]">Free</h3>
								<p className="text-sm text-slate-500">For pilot programme schools</p>
							</div>
							<div className="mb-6">
								<span className="text-4xl font-bold text-[#1E3A5F]">{"\u00A3"}0</span>
								<span className="text-slate-500 ml-1">/month</span>
							</div>
							<ul className="space-y-3 mb-8">
								{[
									"All features included",
									"Unlimited staff accounts",
									"AI progress summaries",
									"Real-time chat",
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
								className="block text-center font-semibold py-3 px-6 rounded-xl transition-all duration-200 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700"
							>
								Apply for Pilot
							</Link>
						</div>

						{/* Pro tier */}
						<div className="relative bg-white rounded-2xl p-8 border-2 border-[#FF7D45] shadow-xl shadow-orange-500/10">
							<div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#FF7D45] text-white text-xs font-semibold px-4 py-1 rounded-full">
								After Pilot
							</div>
							<div className="mb-6">
								<h3 className="text-lg font-semibold mb-1 text-[#1E3A5F]">Pro</h3>
								<p className="text-sm text-slate-500">For schools ready to commit</p>
							</div>
							<div className="mb-6">
								<span className="text-4xl font-bold text-[#1E3A5F]">{"\u00A3"}42</span>
								<span className="text-slate-500 ml-1">/month</span>
								<p className="text-xs text-slate-400 mt-1">Billed annually at {"\u00A3"}500/year</p>
							</div>
							<ul className="space-y-3 mb-8">
								{[
									"Everything in Free",
									"Payment collection (Stripe)",
									"Photo gallery",
									"Student portal",
									"Achievement system & leaderboards",
									"Dedicated support",
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
			{/*  8. FAQ                                                       */}
			{/* ============================================================ */}
			<section id="faq" className="py-20 lg:py-28">
				<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 text-[#1E3A5F]">
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
			{/*  9. EARLY ACCESS CTA                                          */}
			{/* ============================================================ */}
			<section className="py-20 lg:py-28 bg-[#1E3A5F]">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-6">
						Built for UK schools.
						<br />
						Ready for yours.
					</h2>
					<p className="text-lg text-blue-100 mb-10 max-w-2xl mx-auto">
						We are onboarding a small number of pilot schools to help shape the platform. Apply
						today and get full access at no cost.
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
						{/* Brand */}
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

						{/* Product */}
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
							</ul>
						</div>
					</div>

					{/* Bottom bar */}
					<div className="border-t border-[#2A4D73] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
						<p className="text-sm">
							&copy; {new Date().getFullYear()} Abridge. All rights reserved.
						</p>
						<div className="flex items-center gap-6">
							{[
								{
									name: "GitHub",
									url: "https://github.com/hitenpatel/abridge",
								},
								{
									name: "Twitter",
									url: "https://twitter.com/abridge",
								},
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
