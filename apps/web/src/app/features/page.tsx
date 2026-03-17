"use client";

import {
	ArrowRight,
	BookOpen,
	Camera,
	Check,
	CheckCircle,
	GraduationCap,
	Mail,
	Menu,
	MessageCircle,
	Sparkles,
	Trophy,
	XIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Navigation (shared pattern)                                        */
/* ------------------------------------------------------------------ */

const NAV_LINKS = [
	{ label: "Features", href: "/features" },
	{ label: "Pricing", href: "/pricing" },
	{ label: "About", href: "/about" },
	{ label: "Compare", href: "/#comparison" },
	{ label: "FAQ", href: "/#faq" },
];

/* ------------------------------------------------------------------ */
/*  Features Data                                                      */
/* ------------------------------------------------------------------ */

const FEATURES = [
	{
		icon: Sparkles,
		title: "AI Progress Summaries",
		color: "text-[#FF7D45]",
		bg: "bg-[#FF7D45]/10",
		badge: "AI-Powered",
		headline: "Weekly insights, automatically generated",
		paragraphs: [
			"Every week, Abridge analyses each child\u2019s attendance, homework completion, reading diary entries, achievement points, and teacher notes. It then generates a clear, concise summary that parents can read in under two minutes.",
			"Teachers review and approve summaries before they go out. The AI drafts; humans decide. Schools choose which AI provider to use \u2014 Claude, GPT-4, Gemini, Groq, or run Ollama locally so no data leaves the network.",
			"No other school communication platform offers AI-generated progress reports. This is the feature that makes Abridge different.",
		],
		highlights: [
			"Personalised per-child insights",
			"Teacher review before sending",
			"Works with any AI provider",
			"Trend detection across weeks",
		],
	},
	{
		icon: MessageCircle,
		title: "Real-time Chat",
		color: "text-[#1E3A5F]",
		bg: "bg-[#1E3A5F]/10",
		badge: null,
		headline: "Replace WhatsApp with something better",
		paragraphs: [
			"WhatsApp groups are a GDPR nightmare. Personal phone numbers shared, no audit trail, no way for the school to moderate. Abridge gives schools a proper messaging system: real-time, fully auditable, and GDPR-compliant.",
			"Staff can message individual parents or entire year groups. Parents reply from the mobile app or web dashboard. Every message is logged and stored securely on UK servers. No personal phone numbers required.",
			"Unlike email, chat is instant. Unlike WhatsApp, it is professional and controlled. Schools can archive conversations, search message history, and export audit trails for Ofsted.",
		],
		highlights: [
			"No personal phone numbers",
			"Full audit trail",
			"Individual and group messaging",
			"GDPR-compliant storage",
		],
	},
	{
		icon: CheckCircle,
		title: "Smart Attendance",
		color: "text-emerald-600",
		bg: "bg-emerald-600/10",
		badge: "AI-Powered",
		headline: "Spot concerning patterns before they escalate",
		paragraphs: [
			"Abridge tracks daily attendance with morning and afternoon marks. Parents receive instant notifications when their child is marked absent, keeping them informed in real time rather than waiting for a letter home.",
			"The smart pattern detection system analyses attendance data across days and weeks. It flags concerning trends \u2014 like a gradual decline in attendance or recurring Monday absences \u2014 so staff can intervene early.",
			"Attendance data feeds directly into AI progress summaries, giving parents a complete picture of their child\u2019s engagement with school life.",
		],
		highlights: [
			"Instant absence notifications",
			"Pattern detection algorithms",
			"AM/PM session tracking",
			"Feeds into progress reports",
		],
	},
	{
		icon: Trophy,
		title: "Achievement System",
		color: "text-amber-500",
		bg: "bg-amber-500/10",
		badge: null,
		headline: "Celebrate every child, every day",
		paragraphs: [
			"Points, badges, and leaderboards that make positive reinforcement visible. Teachers award points in seconds from the dashboard or mobile app. Children see their progress in real time via the student portal.",
			"Parents receive notifications when their child earns points. Weekly achievement summaries are included in AI progress reports, so parents always know what their child is doing well.",
			"Schools configure their own point categories \u2014 kindness, effort, maths, reading, whatever matters to them. The system is flexible enough for any school\u2019s behaviour policy.",
		],
		highlights: [
			"Customisable point categories",
			"Class and school leaderboards",
			"Parent notifications",
			"Included in AI summaries",
		],
	},
	{
		icon: Camera,
		title: "Photo Gallery",
		color: "text-pink-500",
		bg: "bg-pink-500/10",
		badge: null,
		headline: "Share school moments safely",
		paragraphs: [
			"Schools want to share photos of trips, assemblies, and class activities with parents \u2014 but social media is risky and email attachments are clumsy. Abridge provides a private, permission-controlled photo gallery.",
			"Staff upload photos to school-wide or class-specific albums. Parents with photo permissions can view and download images from the mobile app. No public links, no social media exposure.",
			"The gallery respects per-child photo consent settings. If a child does not have photo permission, their images are automatically excluded from shared albums.",
		],
		highlights: [
			"Per-child consent controls",
			"School-wide and class albums",
			"Mobile app viewing",
			"No social media required",
		],
	},
	{
		icon: GraduationCap,
		title: "Student Portal",
		color: "text-violet-600",
		bg: "bg-violet-600/10",
		badge: null,
		headline: "Build responsibility and independence",
		paragraphs: [
			"For older students, Abridge provides a dedicated student login. Students can view their homework assignments, check their timetable, log reading diary entries, and track their achievement points.",
			"Schools control which year groups have access to the student portal via feature toggles. Primary schools might enable it for Year 5 and 6; secondaries might open it to all students.",
			"The student portal is deliberately separate from the parent view. Students see their own data; parents see their child\u2019s data. Both have read-only access to grades and attendance, but students manage their own homework and reading logs.",
		],
		highlights: [
			"Homework management",
			"Timetable access",
			"Reading diary logging",
			"Controlled by year group",
		],
	},
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function FeaturesPage() {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
						<Link href="/" className="flex items-center gap-2.5 group">
							<div className="w-9 h-9 rounded-xl bg-[#FF7D45] flex items-center justify-center transition-transform group-hover:scale-105">
								<BookOpen className="w-5 h-5 text-white" strokeWidth={2.5} />
							</div>
							<span className="text-xl font-bold tracking-tight text-white">
								Abridge
							</span>
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
							{mobileMenuOpen ? (
								<XIcon className="w-6 h-6" />
							) : (
								<Menu className="w-6 h-6" />
							)}
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
				<div className="absolute inset-0 bg-gradient-to-b from-[#1E3A5F]/8 via-[#1E3A5F]/3 to-white pointer-events-none" />
				<div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6 text-[#1E3A5F]">
						Features built for
						<br />
						real schools
					</h1>
					<p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
						Six powerful modules that replace fragmented tools with one unified,
						AI-enhanced platform. Every feature designed with UK schools in mind.
					</p>
				</div>
			</section>

			{/* ============================================================ */}
			{/*  FEATURE SECTIONS                                             */}
			{/* ============================================================ */}
			{FEATURES.map((feature, i) => {
				const Icon = feature.icon;
				const isReversed = i % 2 === 1;
				const sectionBg = i % 2 === 0 ? "bg-white" : "bg-[#F8FAFC]";

				return (
					<section key={feature.title} className={`py-16 lg:py-24 ${sectionBg}`}>
						<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
							<div
								className={`flex flex-col lg:flex-row items-start gap-10 lg:gap-20 ${
									isReversed ? "lg:flex-row-reverse" : ""
								}`}
							>
								{/* Visual */}
								<div className="w-full lg:w-5/12 shrink-0">
									<div
										className={`${feature.bg} rounded-2xl aspect-[4/3] flex items-center justify-center relative overflow-hidden`}
									>
										<Icon
											className={`w-24 h-24 ${feature.color} opacity-15`}
										/>
										{feature.badge && (
											<div className="absolute top-4 right-4 bg-[#FF7D45]/10 text-[#FF7D45] text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
												<Sparkles className="w-3 h-3" />
												{feature.badge}
											</div>
										)}
									</div>
								</div>

								{/* Content */}
								<div className="w-full lg:w-7/12">
									<div
										className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-5`}
									>
										<Icon className={`w-6 h-6 ${feature.color}`} />
									</div>
									<h2 className="text-3xl sm:text-4xl font-bold mb-2 text-[#1E3A5F]">
										{feature.title}
									</h2>
									<p className="text-lg text-slate-500 mb-6">
										{feature.headline}
									</p>

									<div className="space-y-4 mb-8">
										{feature.paragraphs.map((p) => (
											<p
												key={p.slice(0, 40)}
												className="text-slate-600 leading-relaxed"
											>
												{p}
											</p>
										))}
									</div>

									<ul className="grid sm:grid-cols-2 gap-3">
										{feature.highlights.map((h) => (
											<li
												key={h}
												className="flex items-center gap-2.5 text-sm"
											>
												<Check className="w-4 h-4 text-[#FF7D45] shrink-0" />
												<span className="text-slate-700">{h}</span>
											</li>
										))}
									</ul>
								</div>
							</div>
						</div>
					</section>
				);
			})}

			{/* ============================================================ */}
			{/*  CTA                                                          */}
			{/* ============================================================ */}
			<section className="py-20 lg:py-28 bg-[#1E3A5F]">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
					<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-6">
						See it in action
					</h2>
					<p className="text-lg text-blue-100 mb-10 max-w-2xl mx-auto">
						Apply for the pilot programme and get full access to every feature at
						no cost. No credit card required.
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
								The AI-first school communication platform. Built for UK
								schools.
							</p>
						</div>
						<div>
							<h4 className="text-sm font-semibold text-white mb-4">
								Product
							</h4>
							<ul className="space-y-2.5 text-sm">
								<li>
									<Link
										href="/features"
										className="hover:text-white transition-colors"
									>
										Features
									</Link>
								</li>
								<li>
									<Link
										href="/pricing"
										className="hover:text-white transition-colors"
									>
										Pricing
									</Link>
								</li>
							</ul>
						</div>
						<div>
							<h4 className="text-sm font-semibold text-white mb-4">
								Company
							</h4>
							<ul className="space-y-2.5 text-sm">
								<li>
									<Link
										href="/about"
										className="hover:text-white transition-colors"
									>
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
									<a
										href="/privacy"
										className="hover:text-white transition-colors"
									>
										Privacy Policy
									</a>
								</li>
								<li>
									<a
										href="/terms"
										className="hover:text-white transition-colors"
									>
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
