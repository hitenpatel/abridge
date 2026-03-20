"use client";

import { ArrowRight, BookOpen, Mail, Menu, XIcon } from "lucide-react";
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
/*  Table of contents                                                  */
/* ------------------------------------------------------------------ */

const TOC = [
	{ id: "who-we-are", label: "Who we are" },
	{ id: "what-we-collect", label: "What data we collect" },
	{ id: "lawful-basis", label: "Lawful basis for processing" },
	{ id: "childrens-data", label: "Children's data" },
	{ id: "how-we-use", label: "How we use your data" },
	{ id: "data-sharing", label: "Data sharing" },
	{ id: "retention", label: "Data retention" },
	{ id: "your-rights", label: "Your rights" },
	{ id: "international-transfers", label: "International transfers" },
	{ id: "security", label: "Security" },
	{ id: "cookies", label: "Cookies" },
	{ id: "contact", label: "Contact us" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PrivacyPage() {
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
			<section className="relative pt-28 pb-12 lg:pt-40 lg:pb-16 overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-b from-[#1E3A5F]/8 via-[#1E3A5F]/3 to-transparent pointer-events-none" />
				<div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="inline-flex items-center gap-2 bg-[#1E3A5F]/8 text-[#1E3A5F] text-sm font-medium px-4 py-1.5 rounded-full mb-6">
						Legal
					</div>
					<h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-4 text-[#1E3A5F]">
						Privacy Policy
					</h1>
					<p className="text-base text-slate-500">Last updated: March 2026</p>
					<p className="mt-4 text-lg text-slate-600 max-w-2xl leading-relaxed">
						This policy explains what personal data Abridge collects, why we collect it, and what
						rights you have over it. We have written it in plain English, but the legal obligations
						it reflects are real. If you have any questions, email{" "}
						<a
							href="mailto:hello@abridge.school"
							className="text-[#FF7D45] hover:underline font-medium"
						>
							hello@abridge.school
						</a>
						.
					</p>
					<div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
						<strong>Note for schools:</strong> This is a template policy intended to be reviewed and
						adapted with your own legal counsel before publication. It covers Abridge as a data
						processor; your school remains the data controller for pupil and parent data.
					</div>
				</div>
			</section>

			{/* ============================================================ */}
			{/*  BODY: TOC + CONTENT                                          */}
			{/* ============================================================ */}
			<section className="pb-24">
				<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-12">
						{/* Table of contents — sticky on desktop */}
						<aside className="hidden lg:block">
							<div className="sticky top-28">
								<p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
									Contents
								</p>
								<nav className="space-y-1">
									{TOC.map((item) => (
										<a
											key={item.id}
											href={`#${item.id}`}
											className="block text-sm text-slate-500 hover:text-[#1E3A5F] py-1 transition-colors leading-snug"
										>
											{item.label}
										</a>
									))}
								</nav>
							</div>
						</aside>

						{/* Main content */}
						<div className="space-y-14 mt-8 lg:mt-0">
							{/* ------------------------------------------------ */}
							{/*  1. Who we are                                    */}
							{/* ------------------------------------------------ */}
							<article id="who-we-are">
								<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4 scroll-mt-28">
									1. Who we are
								</h2>
								<div className="space-y-4 text-slate-600 leading-relaxed">
									<p>
										Abridge is a school-parent communication platform built for UK schools. It helps
										school staff send messages, manage attendance, collect payments, run digital
										forms, book parents&apos; evenings, and share pupil progress summaries with
										parents.
									</p>
									<p>
										Abridge is operated by Hiten Patel, trading as Abridge (&ldquo;we&rdquo;,
										&ldquo;us&rdquo;, &ldquo;our&rdquo;). Our contact email for data protection
										matters is{" "}
										<a
											href="mailto:hello@abridge.school"
											className="text-[#FF7D45] hover:underline"
										>
											hello@abridge.school
										</a>
										.
									</p>
									<p>
										In data protection law, there is an important distinction between a{" "}
										<strong>data controller</strong> (who decides why and how data is processed) and
										a <strong>data processor</strong> (who processes data on the controller&apos;s
										behalf). When Abridge processes pupil, parent, and staff data on behalf of a
										school, the <strong>school is the data controller</strong> and Abridge acts as a
										data processor. For data we collect about our own users directly (e.g., account
										registration), we are the data controller.
									</p>
								</div>
							</article>

							{/* ------------------------------------------------ */}
							{/*  2. What we collect                               */}
							{/* ------------------------------------------------ */}
							<article id="what-we-collect">
								<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4 scroll-mt-28">
									2. What data we collect
								</h2>
								<div className="space-y-4 text-slate-600 leading-relaxed">
									<p>
										The data we hold depends on whether you are a school staff member, a parent, or
										a pupil (represented via a parent account).
									</p>

									<h3 className="font-semibold text-[#1E3A5F] mt-6 mb-2">
										Account and identity data
									</h3>
									<ul className="list-disc list-inside space-y-1.5 ml-2">
										<li>Full name and email address</li>
										<li>Phone number (optional, for urgent notifications)</li>
										<li>Encrypted password hash (we never store plaintext passwords)</li>
										<li>Role within the school (parent, staff, admin)</li>
									</ul>

									<h3 className="font-semibold text-[#1E3A5F] mt-6 mb-2">
										Children&apos;s information
									</h3>
									<ul className="list-disc list-inside space-y-1.5 ml-2">
										<li>Child&apos;s name, year group, and class</li>
										<li>Relationship between the parent account and the child</li>
										<li>
											Any information submitted via school forms (e.g., trip consent, medical notes)
										</li>
									</ul>

									<h3 className="font-semibold text-[#1E3A5F] mt-6 mb-2">Attendance data</h3>
									<ul className="list-disc list-inside space-y-1.5 ml-2">
										<li>Daily attendance marks (present, absent, late)</li>
										<li>Absence reasons submitted by parents</li>
										<li>Emergency contact information</li>
									</ul>

									<h3 className="font-semibold text-[#1E3A5F] mt-6 mb-2">Payment data</h3>
									<ul className="list-disc list-inside space-y-1.5 ml-2">
										<li>Payment records (amounts, dates, what they relate to)</li>
										<li>
											Payment method details are handled entirely by Stripe — we never see or store
											card numbers
										</li>
										<li>Stripe Connect account details for schools processing payments</li>
									</ul>

									<h3 className="font-semibold text-[#1E3A5F] mt-6 mb-2">
										Progress and wellbeing data
									</h3>
									<ul className="list-disc list-inside space-y-1.5 ml-2">
										<li>Progress notes and summaries added by teachers</li>
										<li>
											AI-generated progress summaries (where the school has enabled this feature)
										</li>
										<li>Behaviour and wellbeing notes (where the school uses this feature)</li>
									</ul>

									<h3 className="font-semibold text-[#1E3A5F] mt-6 mb-2">
										Usage and technical data
									</h3>
									<ul className="list-disc list-inside space-y-1.5 ml-2">
										<li>Log data and error reports (via Sentry) to help us fix bugs</li>
										<li>Device type and browser for the mobile app and web dashboard</li>
										<li>Session tokens stored in secure cookies</li>
									</ul>
								</div>
							</article>

							{/* ------------------------------------------------ */}
							{/*  3. Lawful basis                                  */}
							{/* ------------------------------------------------ */}
							<article id="lawful-basis">
								<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4 scroll-mt-28">
									3. Lawful basis for processing
								</h2>
								<div className="space-y-4 text-slate-600 leading-relaxed">
									<p>
										Under UK GDPR, we must have a lawful basis for every type of processing we carry
										out. Here is how this maps to what we do:
									</p>

									<div className="overflow-x-auto mt-4">
										<table className="w-full text-sm border-collapse">
											<thead>
												<tr className="bg-[#1E3A5F]/5 text-[#1E3A5F]">
													<th className="text-left font-semibold px-4 py-3 border border-orange-100 rounded-tl-lg">
														Processing activity
													</th>
													<th className="text-left font-semibold px-4 py-3 border border-orange-100 rounded-tr-lg">
														Lawful basis
													</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-orange-50">
												<tr>
													<td className="px-4 py-3 border border-orange-100">
														School-parent communication (messages, announcements)
													</td>
													<td className="px-4 py-3 border border-orange-100">
														Legitimate interests (school&apos;s statutory duty to communicate with
														parents)
													</td>
												</tr>
												<tr className="bg-orange-50/30">
													<td className="px-4 py-3 border border-orange-100">
														Attendance tracking and absence reporting
													</td>
													<td className="px-4 py-3 border border-orange-100">
														Legitimate interests / legal obligation (schools are required by law to
														maintain attendance records)
													</td>
												</tr>
												<tr>
													<td className="px-4 py-3 border border-orange-100">
														Payment processing for school trips, clubs, etc.
													</td>
													<td className="px-4 py-3 border border-orange-100">
														Contract (processing is necessary to fulfil the payment)
													</td>
												</tr>
												<tr className="bg-orange-50/30">
													<td className="px-4 py-3 border border-orange-100">
														AI progress summaries
													</td>
													<td className="px-4 py-3 border border-orange-100">
														Legitimate interests; parents may opt out at any time via account
														settings
													</td>
												</tr>
												<tr>
													<td className="px-4 py-3 border border-orange-100">
														Digital forms and trip consent
													</td>
													<td className="px-4 py-3 border border-orange-100">
														Consent (explicit submission of the form)
													</td>
												</tr>
												<tr className="bg-orange-50/30">
													<td className="px-4 py-3 border border-orange-100">
														Error monitoring and security logging
													</td>
													<td className="px-4 py-3 border border-orange-100">
														Legitimate interests (keeping the platform secure and reliable)
													</td>
												</tr>
											</tbody>
										</table>
									</div>
								</div>
							</article>

							{/* ------------------------------------------------ */}
							{/*  4. Children's data                               */}
							{/* ------------------------------------------------ */}
							<article id="childrens-data">
								<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4 scroll-mt-28">
									4. Children&apos;s data
								</h2>
								<div className="space-y-4 text-slate-600 leading-relaxed">
									<p>
										We take children&apos;s data seriously. Abridge has been designed with the
										ICO&apos;s Children&apos;s Code (Age Appropriate Design Code) in mind. Key
										commitments:
									</p>
									<ul className="list-disc list-inside space-y-2 ml-2">
										<li>
											<strong>Data minimisation:</strong> We only collect information about children
											that is necessary for the school to operate its communication and admin. We do
											not build profiles of children beyond what the school instructs us to record.
										</li>
										<li>
											<strong>No direct children&apos;s accounts:</strong> Children do not create
											accounts on Abridge. Data relating to a child is held under the parent&apos;s
											account and managed by the school.
										</li>
										<li>
											<strong>School as data controller:</strong> The school decides what
											information about a child is recorded. Abridge processes that information on
											the school&apos;s instructions, as a data processor.
										</li>
										<li>
											<strong>No advertising or profiling:</strong> We do not use children&apos;s
											data for advertising, behavioural profiling, or any purpose beyond supporting
											the school&apos;s communication and administration.
										</li>
										<li>
											<strong>Stronger defaults:</strong> Where a feature could involve
											children&apos;s data, privacy-protective settings are the default. Schools
											must explicitly enable features like AI progress summaries.
										</li>
									</ul>
								</div>
							</article>

							{/* ------------------------------------------------ */}
							{/*  5. How we use data                               */}
							{/* ------------------------------------------------ */}
							<article id="how-we-use">
								<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4 scroll-mt-28">
									5. How we use your data
								</h2>
								<div className="space-y-4 text-slate-600 leading-relaxed">
									<p>We use the data we hold to provide and improve the Abridge platform:</p>

									<h3 className="font-semibold text-[#1E3A5F] mt-6 mb-2">Communication</h3>
									<p>
										School staff can send messages to individual parents, whole classes, or the
										entire school. Parents receive these via the web dashboard and the Abridge
										mobile app. We also send transactional emails (e.g., payment receipts, form
										submission confirmations) via our email provider, Resend.
									</p>

									<h3 className="font-semibold text-[#1E3A5F] mt-6 mb-2">Attendance tracking</h3>
									<p>
										Staff record daily attendance marks. Parents can view their child&apos;s
										attendance record and submit absence reasons. Emergency contact information is
										stored so schools can reach the right people quickly.
									</p>

									<h3 className="font-semibold text-[#1E3A5F] mt-6 mb-2">Payments</h3>
									<p>
										Parents can pay for school trips, clubs, and other items through the platform.
										Payments are processed by Stripe. We record transaction details for accounting
										and HMRC compliance purposes.
									</p>

									<h3 className="font-semibold text-[#1E3A5F] mt-6 mb-2">AI progress summaries</h3>
									<p>
										Where a school has enabled this optional feature, Abridge can generate weekly or
										termly progress summaries using the notes added by teachers. Summaries are
										always reviewed by a member of staff before being shared with parents. Parents
										can opt out of receiving AI-generated summaries at any time via their account
										settings. Schools can also choose their AI provider, including running a local
										model (Ollama) so that no pupil data leaves the school&apos;s network.
									</p>

									<h3 className="font-semibold text-[#1E3A5F] mt-6 mb-2">Platform improvement</h3>
									<p>
										Error and performance data (via Sentry) helps us identify and fix bugs. We do
										not use personal data for A/B testing or product analytics beyond aggregate,
										anonymised usage metrics.
									</p>
								</div>
							</article>

							{/* ------------------------------------------------ */}
							{/*  6. Data sharing                                  */}
							{/* ------------------------------------------------ */}
							<article id="data-sharing">
								<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4 scroll-mt-28">
									6. Data sharing
								</h2>
								<div className="space-y-4 text-slate-600 leading-relaxed">
									<p>
										We do not sell your data. We share it only with the third-party processors
										listed below, who help us run the platform. Each processor is bound by a Data
										Processing Agreement.
									</p>

									<div className="space-y-4 mt-4">
										<div className="bg-card rounded-xl p-5 border border-orange-100/60 shadow-sm">
											<h3 className="font-semibold text-[#1E3A5F] mb-1">Stripe</h3>
											<p className="text-sm text-slate-500 mb-1">Payment processing</p>
											<p className="text-sm">
												Stripe processes all payment card data. Abridge never sees or stores card
												numbers. Stripe is PCI-DSS compliant and certified to industry standards.
												Data may be stored in the US with EU Standard Contractual Clauses in place.
											</p>
										</div>

										<div className="bg-card rounded-xl p-5 border border-orange-100/60 shadow-sm">
											<h3 className="font-semibold text-[#1E3A5F] mb-1">Resend</h3>
											<p className="text-sm text-slate-500 mb-1">Transactional email delivery</p>
											<p className="text-sm">
												We use Resend to deliver emails such as payment receipts, form
												confirmations, and account notifications. Resend only receives the
												recipient&apos;s email address and the content of the specific email being
												sent.
											</p>
										</div>

										<div className="bg-card rounded-xl p-5 border border-orange-100/60 shadow-sm">
											<h3 className="font-semibold text-[#1E3A5F] mb-1">Sentry</h3>
											<p className="text-sm text-slate-500 mb-1">Error monitoring</p>
											<p className="text-sm">
												Sentry collects error reports and stack traces to help us debug issues. We
												configure Sentry to minimise personal data in error reports. Sentry data may
												be stored in the US with appropriate safeguards.
											</p>
										</div>

										<div className="bg-card rounded-xl p-5 border border-orange-100/60 shadow-sm">
											<h3 className="font-semibold text-[#1E3A5F] mb-1">
												AI providers (optional, school-configured)
											</h3>
											<p className="text-sm text-slate-500 mb-1">Progress summary generation</p>
											<p className="text-sm">
												Where a school enables AI progress summaries, teacher notes may be sent to
												an AI provider to generate the summary text. The provider depends on the
												school&apos;s configuration and may include Anthropic (Claude), OpenAI,
												Google (Gemini), or Groq. Schools may also configure a local Ollama instance
												so no data leaves their network. The school is responsible for choosing a
												provider that meets their own data protection obligations.
											</p>
										</div>
									</div>

									<p className="mt-4">
										We may also disclose data where required by law (e.g., a court order), or to
										protect the safety of users or others.
									</p>
								</div>
							</article>

							{/* ------------------------------------------------ */}
							{/*  7. Data retention                                */}
							{/* ------------------------------------------------ */}
							<article id="retention">
								<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4 scroll-mt-28">
									7. Data retention
								</h2>
								<div className="space-y-4 text-slate-600 leading-relaxed">
									<p>
										We keep data for as long as it is needed for the purpose for which it was
										collected, and no longer.
									</p>

									<div className="overflow-x-auto mt-4">
										<table className="w-full text-sm border-collapse">
											<thead>
												<tr className="bg-[#1E3A5F]/5 text-[#1E3A5F]">
													<th className="text-left font-semibold px-4 py-3 border border-orange-100">
														Data type
													</th>
													<th className="text-left font-semibold px-4 py-3 border border-orange-100">
														Retention period
													</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-orange-50">
												<tr>
													<td className="px-4 py-3 border border-orange-100">
														Active account data (staff, parents, pupil records)
													</td>
													<td className="px-4 py-3 border border-orange-100">
														Duration of the school&apos;s active subscription, then deleted within
														90 days of contract end
													</td>
												</tr>
												<tr className="bg-orange-50/30">
													<td className="px-4 py-3 border border-orange-100">
														Deleted accounts (parent or staff requesting account deletion)
													</td>
													<td className="px-4 py-3 border border-orange-100">
														Anonymised within 30 days of deletion request
													</td>
												</tr>
												<tr>
													<td className="px-4 py-3 border border-orange-100">Payment records</td>
													<td className="px-4 py-3 border border-orange-100">
														7 years, as required by HMRC for financial record-keeping
													</td>
												</tr>
												<tr className="bg-orange-50/30">
													<td className="px-4 py-3 border border-orange-100">
														Error logs (Sentry)
													</td>
													<td className="px-4 py-3 border border-orange-100">
														90 days, then automatically purged
													</td>
												</tr>
												<tr>
													<td className="px-4 py-3 border border-orange-100">
														Email delivery logs (Resend)
													</td>
													<td className="px-4 py-3 border border-orange-100">30 days</td>
												</tr>
											</tbody>
										</table>
									</div>

									<p className="mt-4">
										When a school ends its subscription, we will work with the school to provide a
										complete export of their data before deletion.
									</p>
								</div>
							</article>

							{/* ------------------------------------------------ */}
							{/*  8. Your rights                                   */}
							{/* ------------------------------------------------ */}
							<article id="your-rights">
								<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4 scroll-mt-28">
									8. Your rights
								</h2>
								<div className="space-y-4 text-slate-600 leading-relaxed">
									<p>
										Under UK GDPR, you have the following rights over your personal data. Where
										Abridge is the data processor (i.e., for school-held data), we will refer your
										request to the relevant school, who is the data controller.
									</p>

									<div className="space-y-3 mt-4">
										<div className="flex gap-4 p-4 bg-orange-50/40 rounded-xl border border-orange-100/60">
											<div className="w-8 h-8 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center shrink-0 mt-0.5">
												<span className="text-xs font-bold text-[#1E3A5F]">01</span>
											</div>
											<div>
												<h3 className="font-semibold text-[#1E3A5F] mb-1">Right of access</h3>
												<p className="text-sm">
													You can request a copy of all personal data we hold about you. Parents can
													export their data directly from the Abridge web dashboard (Account &rarr;
													Export my data).
												</p>
											</div>
										</div>

										<div className="flex gap-4 p-4 bg-orange-50/40 rounded-xl border border-orange-100/60">
											<div className="w-8 h-8 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center shrink-0 mt-0.5">
												<span className="text-xs font-bold text-[#1E3A5F]">02</span>
											</div>
											<div>
												<h3 className="font-semibold text-[#1E3A5F] mb-1">
													Right to rectification
												</h3>
												<p className="text-sm">
													If any information we hold about you is inaccurate or incomplete, you have
													the right to have it corrected. You can update most information directly
													in your account settings.
												</p>
											</div>
										</div>

										<div className="flex gap-4 p-4 bg-orange-50/40 rounded-xl border border-orange-100/60">
											<div className="w-8 h-8 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center shrink-0 mt-0.5">
												<span className="text-xs font-bold text-[#1E3A5F]">03</span>
											</div>
											<div>
												<h3 className="font-semibold text-[#1E3A5F] mb-1">Right to erasure</h3>
												<p className="text-sm">
													You can request that your account and associated data be deleted. This is
													available in Account &rarr; Delete account. Note that payment records are
													retained for 7 years as required by HMRC, but will be anonymised with
													respect to your personal details.
												</p>
											</div>
										</div>

										<div className="flex gap-4 p-4 bg-orange-50/40 rounded-xl border border-orange-100/60">
											<div className="w-8 h-8 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center shrink-0 mt-0.5">
												<span className="text-xs font-bold text-[#1E3A5F]">04</span>
											</div>
											<div>
												<h3 className="font-semibold text-[#1E3A5F] mb-1">
													Right to data portability
												</h3>
												<p className="text-sm">
													You can request your data in a machine-readable format. Use the in-app
													export feature or contact us and we will provide a JSON or CSV export
													within 30 days.
												</p>
											</div>
										</div>

										<div className="flex gap-4 p-4 bg-orange-50/40 rounded-xl border border-orange-100/60">
											<div className="w-8 h-8 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center shrink-0 mt-0.5">
												<span className="text-xs font-bold text-[#1E3A5F]">05</span>
											</div>
											<div>
												<h3 className="font-semibold text-[#1E3A5F] mb-1">Right to object</h3>
												<p className="text-sm">
													Where we rely on legitimate interests as our lawful basis, you can object
													to the processing. For AI progress summaries specifically, you can opt out
													at any time in account settings without affecting any other service.
												</p>
											</div>
										</div>
									</div>

									<p className="mt-4">
										To exercise any of these rights, email{" "}
										<a
											href="mailto:hello@abridge.school"
											className="text-[#FF7D45] hover:underline"
										>
											hello@abridge.school
										</a>{" "}
										with the subject line &ldquo;Data rights request&rdquo;. We will respond within
										30 days. If you are unhappy with our response, you have the right to lodge a
										complaint with the Information Commissioner&apos;s Office (ICO) at{" "}
										<a
											href="https://ico.org.uk"
											target="_blank"
											rel="noopener noreferrer"
											className="text-[#FF7D45] hover:underline"
										>
											ico.org.uk
										</a>
										.
									</p>
								</div>
							</article>

							{/* ------------------------------------------------ */}
							{/*  9. International transfers                        */}
							{/* ------------------------------------------------ */}
							<article id="international-transfers">
								<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4 scroll-mt-28">
									9. International transfers
								</h2>
								<div className="space-y-4 text-slate-600 leading-relaxed">
									<p>
										Abridge&apos;s primary infrastructure is hosted in the UK and EU. Our database
										and application servers are located in the UK.
									</p>
									<p>
										Some of our third-party processors are US-based (Stripe, Sentry, some AI
										providers). Where data is transferred outside the UK or EU, we ensure adequate
										safeguards are in place:
									</p>
									<ul className="list-disc list-inside space-y-1.5 ml-2">
										<li>
											Standard Contractual Clauses (SCCs) approved by the ICO or European Commission
										</li>
										<li>UK IDTA (International Data Transfer Agreement) where applicable</li>
										<li>
											Adequacy decisions for countries recognised as providing equivalent protection
											to UK law
										</li>
									</ul>
									<p>
										Where a school configures a self-hosted AI provider (Ollama), no data leaves the
										school&apos;s own infrastructure for AI processing.
									</p>
								</div>
							</article>

							{/* ------------------------------------------------ */}
							{/*  10. Security                                     */}
							{/* ------------------------------------------------ */}
							<article id="security">
								<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4 scroll-mt-28">
									10. Security
								</h2>
								<div className="space-y-4 text-slate-600 leading-relaxed">
									<p>
										We take security seriously and apply the following measures to protect your
										data:
									</p>
									<ul className="list-disc list-inside space-y-2 ml-2">
										<li>
											<strong>Encryption in transit:</strong> All data between your browser or
											mobile app and our servers is encrypted using TLS 1.2 or higher.
										</li>
										<li>
											<strong>Encryption at rest:</strong> Database contents are encrypted at rest
											by our hosting provider.
										</li>
										<li>
											<strong>Password hashing:</strong> Passwords are never stored in plaintext. We
											use industry-standard hashing (bcrypt) via better-auth.
										</li>
										<li>
											<strong>Access controls:</strong> Role-based access controls mean staff can
											only see data relevant to their role. Admins have elevated permissions that
											are logged and audited.
										</li>
										<li>
											<strong>Session management:</strong> Secure, HttpOnly session cookies with
											short expiry. Sessions are invalidated on logout.
										</li>
										<li>
											<strong>Input validation:</strong> All API inputs are validated and sanitised
											to prevent injection attacks.
										</li>
										<li>
											<strong>Security audits:</strong> We conduct regular security reviews of the
											codebase and plan to commission an independent penetration test before the
											platform is made generally available.
										</li>
									</ul>
									<p>
										If you believe you have found a security vulnerability, please report it
										responsibly to{" "}
										<a
											href="mailto:hello@abridge.school"
											className="text-[#FF7D45] hover:underline"
										>
											hello@abridge.school
										</a>{" "}
										rather than disclosing it publicly.
									</p>
								</div>
							</article>

							{/* ------------------------------------------------ */}
							{/*  11. Cookies                                      */}
							{/* ------------------------------------------------ */}
							<article id="cookies">
								<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4 scroll-mt-28">11. Cookies</h2>
								<div className="space-y-4 text-slate-600 leading-relaxed">
									<p>
										Abridge uses cookies to keep you logged in and to keep the platform secure. We
										do not use advertising cookies or third-party tracking cookies.
									</p>

									<div className="overflow-x-auto mt-4">
										<table className="w-full text-sm border-collapse">
											<thead>
												<tr className="bg-[#1E3A5F]/5 text-[#1E3A5F]">
													<th className="text-left font-semibold px-4 py-3 border border-orange-100">
														Cookie
													</th>
													<th className="text-left font-semibold px-4 py-3 border border-orange-100">
														Purpose
													</th>
													<th className="text-left font-semibold px-4 py-3 border border-orange-100">
														Essential?
													</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-orange-50">
												<tr>
													<td className="px-4 py-3 border border-orange-100 font-mono text-xs">
														better-auth.session
													</td>
													<td className="px-4 py-3 border border-orange-100">
														Keeps you logged in between page loads
													</td>
													<td className="px-4 py-3 border border-orange-100 text-green-700 font-medium">
														Yes
													</td>
												</tr>
												<tr className="bg-orange-50/30">
													<td className="px-4 py-3 border border-orange-100 font-mono text-xs">
														cookie_consent
													</td>
													<td className="px-4 py-3 border border-orange-100">
														Remembers your cookie preference
													</td>
													<td className="px-4 py-3 border border-orange-100 text-green-700 font-medium">
														Yes
													</td>
												</tr>
											</tbody>
										</table>
									</div>

									<p className="mt-4">
										We do not set any non-essential cookies by default. If we add optional cookies
										in future (for example, to remember UI preferences), we will ask for your
										consent first via the cookie banner. You can withdraw consent at any time by
										clearing your cookies or adjusting your browser settings.
									</p>
								</div>
							</article>

							{/* ------------------------------------------------ */}
							{/*  12. Contact                                      */}
							{/* ------------------------------------------------ */}
							<article id="contact">
								<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4 scroll-mt-28">
									12. Contact us
								</h2>
								<div className="space-y-4 text-slate-600 leading-relaxed">
									<p>
										For any questions about this privacy policy, to exercise your data rights, or to
										raise a concern about how we handle your data, please contact us:
									</p>
									<div className="bg-orange-50/40 rounded-xl p-6 border border-orange-100/60">
										<p className="font-semibold text-[#1E3A5F] mb-1">Abridge — Data Protection</p>
										<a
											href="mailto:hello@abridge.school"
											className="text-[#FF7D45] hover:underline font-medium"
										>
											hello@abridge.school
										</a>
										<p className="text-sm text-slate-500 mt-3">
											We aim to respond to all data-related enquiries within 5 working days, and no
											later than 30 days for formal rights requests.
										</p>
									</div>
									<p>
										If you are not satisfied with our response, you have the right to complain to
										the UK supervisory authority:
									</p>
									<div className="bg-orange-50/40 rounded-xl p-6 border border-orange-100/60">
										<p className="font-semibold text-[#1E3A5F] mb-1">
											Information Commissioner&apos;s Office (ICO)
										</p>
										<a
											href="https://ico.org.uk"
											target="_blank"
											rel="noopener noreferrer"
											className="text-[#FF7D45] hover:underline"
										>
											ico.org.uk
										</a>
										<p className="text-sm text-slate-500 mt-1">0303 123 1113</p>
									</div>
									<p className="text-sm text-slate-500 mt-6">
										This privacy policy was last reviewed in March 2026. We may update it from time
										to time to reflect changes in law or our practices. When we make significant
										changes, we will notify active users via email or an in-app notice.
									</p>
								</div>
							</article>
						</div>
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
