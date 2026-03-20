"use client";

import { ArrowRight, BookOpen, Download, Mail, Menu, XIcon } from "lucide-react";
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
	{ id: "parties", label: "1. Parties" },
	{ id: "subject-matter", label: "2. Subject matter and duration" },
	{ id: "nature-purpose", label: "3. Nature and purpose of processing" },
	{ id: "personal-data", label: "4. Types of personal data" },
	{ id: "data-subjects", label: "5. Categories of data subjects" },
	{ id: "processor-obligations", label: "6. Obligations of the Processor" },
	{ id: "sub-processors", label: "7. Sub-processors" },
	{ id: "international-transfers", label: "8. International transfers" },
	{ id: "security-measures", label: "9. Security measures" },
	{ id: "breach-notification", label: "10. Data breach notification" },
	{ id: "audit-rights", label: "11. Audit rights" },
	{ id: "termination", label: "12. Termination and data return" },
	{ id: "signatures", label: "13. Signatures" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DpaPage() {
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
						Data Processing Agreement
					</h1>
					<p className="text-base text-slate-500">Template version: March 2026</p>
					<p className="mt-4 text-lg text-slate-600 max-w-2xl leading-relaxed">
						This agreement is made between your school (the Data Controller) and Abridge (the Data
						Processor) in accordance with Article 28 of UK GDPR. It governs how Abridge processes
						personal data on behalf of your school.
					</p>

					{/* Template warning banner */}
					<div className="mt-6 p-5 bg-amber-50 border border-amber-300 rounded-xl">
						<div className="flex gap-3">
							<div className="shrink-0 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center mt-0.5">
								<span className="text-white text-xs font-bold">!</span>
							</div>
							<div>
								<p className="font-semibold text-amber-900 mb-1">
									Template Document — Legal Review Required
								</p>
								<p className="text-sm text-amber-800 leading-relaxed">
									This is a template Data Processing Agreement. It must be reviewed and adapted by
									your school&apos;s legal adviser before use. Placeholders such as{" "}
									<code className="bg-amber-100 px-1 py-0.5 rounded text-xs font-mono">
										[SCHOOL NAME]
									</code>{" "}
									and{" "}
									<code className="bg-amber-100 px-1 py-0.5 rounded text-xs font-mono">
										[SCHOOL ADDRESS]
									</code>{" "}
									must be completed. This document does not constitute legal advice.
								</p>
							</div>
						</div>
					</div>

					<div className="mt-4 flex items-center gap-3">
						<button
							type="button"
							onClick={() => window.print()}
							className="inline-flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#162d4a] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-sm"
						>
							<Download className="w-4 h-4" />
							Download / Print as PDF
						</button>
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
							{/*  1. Parties                                        */}
							{/* ------------------------------------------------ */}
							<article id="parties">
								<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4 scroll-mt-28">1. Parties</h2>
								<div className="space-y-4 text-slate-600 leading-relaxed">
									<p>
										This Data Processing Agreement (&ldquo;Agreement&rdquo;) is entered into
										between:
									</p>

									<div className="space-y-4 mt-4">
										<div className="bg-orange-50/40 rounded-xl p-5 border border-orange-100/60">
											<h3 className="font-semibold text-[#1E3A5F] mb-2">Data Controller</h3>
											<p className="text-sm space-y-1">
												<span className="block">
													<strong>Name:</strong>{" "}
													<span className="font-mono bg-orange-100/60 px-1.5 py-0.5 rounded text-xs">
														[SCHOOL NAME]
													</span>
												</span>
												<span className="block mt-1">
													<strong>Address:</strong>{" "}
													<span className="font-mono bg-orange-100/60 px-1.5 py-0.5 rounded text-xs">
														[SCHOOL ADDRESS]
													</span>
												</span>
												<span className="block mt-1">
													<strong>ICO Registration Number:</strong>{" "}
													<span className="font-mono bg-orange-100/60 px-1.5 py-0.5 rounded text-xs">
														[ICO REGISTRATION NUMBER]
													</span>
												</span>
												<span className="block mt-1">
													<strong>Data Protection Lead / DPO:</strong>{" "}
													<span className="font-mono bg-orange-100/60 px-1.5 py-0.5 rounded text-xs">
														[NAME AND EMAIL]
													</span>
												</span>
											</p>
											<p className="text-sm mt-3 text-slate-500">
												(hereinafter &ldquo;the Controller&rdquo; or &ldquo;the School&rdquo;)
											</p>
										</div>

										<div className="bg-orange-50/40 rounded-xl p-5 border border-orange-100/60">
											<h3 className="font-semibold text-[#1E3A5F] mb-2">Data Processor</h3>
											<p className="text-sm space-y-1">
												<span className="block">
													<strong>Name:</strong> Hiten Patel, trading as Abridge
												</span>
												<span className="block mt-1">
													<strong>Contact email:</strong>{" "}
													<a
														href="mailto:hello@abridge.school"
														className="text-[#FF7D45] hover:underline"
													>
														hello@abridge.school
													</a>
												</span>
											</p>
											<p className="text-sm mt-3 text-slate-500">
												(hereinafter &ldquo;the Processor&rdquo; or &ldquo;Abridge&rdquo;)
											</p>
										</div>
									</div>

									<p>
										This Agreement supplements and forms part of the service agreement between the
										School and Abridge (&ldquo;the Principal Agreement&rdquo;). In the event of
										conflict between this Agreement and the Principal Agreement, this Agreement
										shall prevail in respect of data protection matters.
									</p>
								</div>
							</article>

							{/* ------------------------------------------------ */}
							{/*  2. Subject matter and duration                    */}
							{/* ------------------------------------------------ */}
							<article id="subject-matter">
								<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4 scroll-mt-28">
									2. Subject matter and duration
								</h2>
								<div className="space-y-4 text-slate-600 leading-relaxed">
									<p>
										The subject matter of this Agreement is the provision by Abridge of a
										school-parent communication and administration platform to the School.
									</p>
									<p>
										The Processor shall process personal data on behalf of the Controller for the
										duration of the Principal Agreement, unless this Agreement is terminated earlier
										in accordance with clause 12 below, or unless the parties agree otherwise in
										writing.
									</p>
									<p>
										This Agreement shall remain in force for as long as the Processor holds, stores,
										or otherwise processes personal data on behalf of the Controller.
									</p>
								</div>
							</article>

							{/* ------------------------------------------------ */}
							{/*  3. Nature and purpose of processing               */}
							{/* ------------------------------------------------ */}
							<article id="nature-purpose">
								<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4 scroll-mt-28">
									3. Nature and purpose of processing
								</h2>
								<div className="space-y-4 text-slate-600 leading-relaxed">
									<p>
										The Processor processes personal data for the following purposes, strictly on
										the documented instructions of the Controller:
									</p>
									<ul className="list-disc list-inside space-y-2 ml-2 mt-2">
										<li>
											<strong>School-parent communication:</strong> Delivering messages,
											announcements, and notifications from school staff to parents and guardians
											via the web dashboard and mobile application.
										</li>
										<li>
											<strong>Attendance tracking:</strong> Recording and displaying daily
											attendance marks (present, absent, late), absence reasons submitted by
											parents, and emergency contact information.
										</li>
										<li>
											<strong>Payment processing:</strong> Facilitating payments for school trips,
											clubs, and other items; recording transaction details for accounting purposes;
											managing Stripe Connect accounts for the school.
										</li>
										<li>
											<strong>Digital forms and consent:</strong> Presenting, collecting, and
											storing responses to digital forms created by the school, including trip
											consent, medical disclosure, and general data collection forms.
										</li>
										<li>
											<strong>Parents&apos; evening booking:</strong> Managing appointment slots
											created by staff and bookings made by parents for parents&apos; evening
											meetings.
										</li>
										<li>
											<strong>Progress reporting:</strong> Storing teacher notes and progress
											records; optionally generating AI-assisted progress summaries where the school
											has enabled this feature.
										</li>
										<li>
											<strong>Platform operation and security:</strong> Error monitoring, security
											logging, session management, and technical operation of the platform.
										</li>
									</ul>
									<p>
										The Processor shall not process personal data for any purpose other than those
										listed above, except where required by applicable law, in which case the
										Processor shall (to the extent permitted by law) inform the Controller before
										processing.
									</p>
								</div>
							</article>

							{/* ------------------------------------------------ */}
							{/*  4. Types of personal data                         */}
							{/* ------------------------------------------------ */}
							<article id="personal-data">
								<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4 scroll-mt-28">
									4. Types of personal data
								</h2>
								<div className="space-y-4 text-slate-600 leading-relaxed">
									<p>
										The Processor processes the following categories of personal data on behalf of
										the Controller:
									</p>

									<h3 className="font-semibold text-[#1E3A5F] mt-6 mb-2">
										Identity and contact data
									</h3>
									<ul className="list-disc list-inside space-y-1.5 ml-2">
										<li>Full name</li>
										<li>Email address</li>
										<li>Phone number</li>
										<li>Role within the school (parent, staff, admin)</li>
									</ul>

									<h3 className="font-semibold text-[#1E3A5F] mt-6 mb-2">Children&apos;s data</h3>
									<ul className="list-disc list-inside space-y-1.5 ml-2">
										<li>Child&apos;s full name</li>
										<li>Date of birth</li>
										<li>Year group and class</li>
										<li>Parent/guardian relationship</li>
									</ul>

									<h3 className="font-semibold text-[#1E3A5F] mt-6 mb-2">Attendance records</h3>
									<ul className="list-disc list-inside space-y-1.5 ml-2">
										<li>Daily attendance marks (present, absent, late)</li>
										<li>Absence reasons submitted by parents</li>
										<li>Emergency contact names and numbers</li>
									</ul>

									<h3 className="font-semibold text-[#1E3A5F] mt-6 mb-2">Payment records</h3>
									<ul className="list-disc list-inside space-y-1.5 ml-2">
										<li>Payment amounts and dates</li>
										<li>Description of items paid for</li>
										<li>Payment status (paid, pending, refunded)</li>
										<li>Stripe transaction and customer identifiers</li>
									</ul>

									<h3 className="font-semibold text-[#1E3A5F] mt-6 mb-2">Form responses</h3>
									<ul className="list-disc list-inside space-y-1.5 ml-2">
										<li>Responses to digital forms created by the school</li>
										<li>Trip consent decisions</li>
										<li>Any information voluntarily submitted by parents via school forms</li>
									</ul>

									<h3 className="font-semibold text-[#1E3A5F] mt-6 mb-2">
										Progress and wellbeing data
									</h3>
									<ul className="list-disc list-inside space-y-1.5 ml-2">
										<li>Teacher progress notes and observations</li>
										<li>AI-generated progress summaries (where enabled by the school)</li>
										<li>Homework records (where the school uses this feature)</li>
										<li>Wellbeing and behaviour notes (where the school uses this feature)</li>
									</ul>

									<h3 className="font-semibold text-[#1E3A5F] mt-6 mb-2">Technical data</h3>
									<ul className="list-disc list-inside space-y-1.5 ml-2">
										<li>Session tokens and authentication credentials (hashed)</li>
										<li>IP addresses and device identifiers (in error logs)</li>
										<li>Browser and device type</li>
									</ul>

									<div className="mt-4 p-4 bg-blue-50/40 border border-blue-100 rounded-xl">
										<p className="text-sm text-slate-600">
											<strong className="text-[#1E3A5F]">Special category data:</strong> The
											Controller acknowledges that form responses may incidentally contain special
											category data (e.g., health information in medical disclosure forms). The
											Controller remains responsible for ensuring an appropriate legal basis exists
											for collecting such data, and for instructing the Processor accordingly.
										</p>
									</div>
								</div>
							</article>

							{/* ------------------------------------------------ */}
							{/*  5. Categories of data subjects                   */}
							{/* ------------------------------------------------ */}
							<article id="data-subjects">
								<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4 scroll-mt-28">
									5. Categories of data subjects
								</h2>
								<div className="space-y-4 text-slate-600 leading-relaxed">
									<p>
										The personal data processed under this Agreement relates to the following
										categories of data subjects:
									</p>
									<div className="space-y-3 mt-4">
										<div className="flex gap-4 p-4 bg-orange-50/40 rounded-xl border border-orange-100/60">
											<div className="w-8 h-8 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center shrink-0 mt-0.5">
												<span className="text-xs font-bold text-[#1E3A5F]">A</span>
											</div>
											<div>
												<h3 className="font-semibold text-[#1E3A5F] mb-1">School staff</h3>
												<p className="text-sm">
													Teaching staff, support staff, and administrators who use the Abridge
													platform in the course of their employment at the School.
												</p>
											</div>
										</div>

										<div className="flex gap-4 p-4 bg-orange-50/40 rounded-xl border border-orange-100/60">
											<div className="w-8 h-8 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center shrink-0 mt-0.5">
												<span className="text-xs font-bold text-[#1E3A5F]">B</span>
											</div>
											<div>
												<h3 className="font-semibold text-[#1E3A5F] mb-1">Parents and guardians</h3>
												<p className="text-sm">
													Parents, legal guardians, and other carers who have been granted access to
													the platform by the School in connection with their child&apos;s
													education.
												</p>
											</div>
										</div>

										<div className="flex gap-4 p-4 bg-orange-50/40 rounded-xl border border-orange-100/60">
											<div className="w-8 h-8 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center shrink-0 mt-0.5">
												<span className="text-xs font-bold text-[#1E3A5F]">C</span>
											</div>
											<div>
												<h3 className="font-semibold text-[#1E3A5F] mb-1">Pupils</h3>
												<p className="text-sm">
													Current pupils of the School whose data is held in connection with their
													education. Pupils do not hold accounts on Abridge directly; their data is
													managed by the School and linked to parent/guardian accounts. Given the
													age of the data subjects, the Processor applies heightened data
													minimisation and protection standards.
												</p>
											</div>
										</div>
									</div>
								</div>
							</article>

							{/* ------------------------------------------------ */}
							{/*  6. Obligations of the Processor                  */}
							{/* ------------------------------------------------ */}
							<article id="processor-obligations">
								<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4 scroll-mt-28">
									6. Obligations of the Processor
								</h2>
								<div className="space-y-4 text-slate-600 leading-relaxed">
									<p>
										In accordance with Article 28(3) of UK GDPR, the Processor agrees to the
										following obligations:
									</p>

									<div className="space-y-4 mt-2">
										<div className="border-l-4 border-[#FF7D45] pl-4">
											<h3 className="font-semibold text-[#1E3A5F] mb-1">
												6.1 Processing only on instructions
											</h3>
											<p className="text-sm">
												The Processor shall process personal data only on documented instructions
												from the Controller, including with regard to transfers of personal data to
												a third country, unless required to do so by applicable law. In such cases,
												the Processor shall inform the Controller of that legal requirement before
												processing, unless the law prohibits this.
											</p>
										</div>

										<div className="border-l-4 border-[#FF7D45] pl-4">
											<h3 className="font-semibold text-[#1E3A5F] mb-1">6.2 Confidentiality</h3>
											<p className="text-sm">
												The Processor shall ensure that all persons authorised to process personal
												data on its behalf are subject to a binding obligation of confidentiality in
												respect of such data, whether by contract or by operation of law.
											</p>
										</div>

										<div className="border-l-4 border-[#FF7D45] pl-4">
											<h3 className="font-semibold text-[#1E3A5F] mb-1">6.3 Security measures</h3>
											<p className="text-sm">
												The Processor shall implement and maintain appropriate technical and
												organisational measures to protect personal data against unauthorised or
												unlawful processing and against accidental loss, destruction, or damage.
												These measures are described in clause 9.
											</p>
										</div>

										<div className="border-l-4 border-[#FF7D45] pl-4">
											<h3 className="font-semibold text-[#1E3A5F] mb-1">6.4 Sub-processors</h3>
											<p className="text-sm">
												The Processor shall not engage a sub-processor without prior written
												authorisation from the Controller, except as listed in clause 7 of this
												Agreement, which constitutes the Controller&apos;s general written
												authorisation for those sub-processors. The Processor shall notify the
												Controller of any intended changes concerning the addition or replacement of
												sub-processors, giving the Controller the opportunity to object to such
												changes.
											</p>
										</div>

										<div className="border-l-4 border-[#FF7D45] pl-4">
											<h3 className="font-semibold text-[#1E3A5F] mb-1">
												6.5 Assistance with data subject rights
											</h3>
											<p className="text-sm">
												Taking into account the nature of the processing, the Processor shall assist
												the Controller by appropriate technical and organisational measures, insofar
												as possible, in fulfilling the Controller&apos;s obligation to respond to
												requests from data subjects exercising their rights under UK GDPR, including
												rights of access, rectification, erasure, restriction, portability, and
												objection. The Processor shall notify the Controller without undue delay if
												it receives a data subject request relating to data processed under this
												Agreement.
											</p>
										</div>

										<div className="border-l-4 border-[#FF7D45] pl-4">
											<h3 className="font-semibold text-[#1E3A5F] mb-1">
												6.6 Assistance with compliance obligations
											</h3>
											<p className="text-sm">
												The Processor shall assist the Controller in ensuring compliance with
												obligations relating to security of processing, notification of personal
												data breaches, data protection impact assessments, and prior consultation
												with supervisory authorities, taking into account the nature of processing
												and the information available to the Processor.
											</p>
										</div>

										<div className="border-l-4 border-[#FF7D45] pl-4">
											<h3 className="font-semibold text-[#1E3A5F] mb-1">
												6.7 Deletion or return of data
											</h3>
											<p className="text-sm">
												At the choice of the Controller, the Processor shall delete or return all
												personal data to the Controller after the end of the provision of the
												services, and shall delete existing copies of the personal data, unless
												applicable law requires storage of such data. The process for this is
												described in clause 12.
											</p>
										</div>

										<div className="border-l-4 border-[#FF7D45] pl-4">
											<h3 className="font-semibold text-[#1E3A5F] mb-1">6.8 Audit information</h3>
											<p className="text-sm">
												The Processor shall make available to the Controller all information
												necessary to demonstrate compliance with the obligations laid down in
												Article 28 of UK GDPR and allow for and contribute to audits, including
												inspections, conducted by the Controller or an auditor mandated by the
												Controller. See clause 11 for audit rights.
											</p>
										</div>
									</div>
								</div>
							</article>

							{/* ------------------------------------------------ */}
							{/*  7. Sub-processors                                 */}
							{/* ------------------------------------------------ */}
							<article id="sub-processors">
								<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4 scroll-mt-28">
									7. Sub-processors
								</h2>
								<div className="space-y-4 text-slate-600 leading-relaxed">
									<p>
										The Controller grants general written authorisation for the Processor to use the
										following sub-processors, subject to the conditions in this clause:
									</p>

									<div className="space-y-4 mt-4">
										<div className="bg-card rounded-xl p-5 border border-orange-100/60 shadow-sm">
											<div className="flex items-start justify-between gap-4 flex-wrap">
												<div>
													<h3 className="font-semibold text-[#1E3A5F] mb-1">Stripe</h3>
													<p className="text-sm text-slate-500 mb-2">Payment processing</p>
												</div>
												<span className="text-xs bg-[#1E3A5F]/8 text-[#1E3A5F] px-2.5 py-1 rounded-full font-medium shrink-0">
													UK/EU + US (SCCs)
												</span>
											</div>
											<p className="text-sm text-slate-600">
												Stripe processes payment card data on behalf of the School. Abridge never
												stores card numbers or full payment credentials. Stripe is PCI-DSS
												compliant. Data may be processed in the United States under Standard
												Contractual Clauses.
											</p>
										</div>

										<div className="bg-card rounded-xl p-5 border border-orange-100/60 shadow-sm">
											<div className="flex items-start justify-between gap-4 flex-wrap">
												<div>
													<h3 className="font-semibold text-[#1E3A5F] mb-1">Resend</h3>
													<p className="text-sm text-slate-500 mb-2">
														Transactional email delivery
													</p>
												</div>
												<span className="text-xs bg-[#1E3A5F]/8 text-[#1E3A5F] px-2.5 py-1 rounded-full font-medium shrink-0">
													UK/EU + US (SCCs)
												</span>
											</div>
											<p className="text-sm text-slate-600">
												Resend delivers transactional emails such as payment receipts, form
												submission confirmations, and account notifications. Resend receives only
												the recipient&apos;s email address and the content of the specific email
												being sent.
											</p>
										</div>

										<div className="bg-card rounded-xl p-5 border border-orange-100/60 shadow-sm">
											<div className="flex items-start justify-between gap-4 flex-wrap">
												<div>
													<h3 className="font-semibold text-[#1E3A5F] mb-1">Sentry</h3>
													<p className="text-sm text-slate-500 mb-2">Error monitoring</p>
												</div>
												<span className="text-xs bg-[#1E3A5F]/8 text-[#1E3A5F] px-2.5 py-1 rounded-full font-medium shrink-0">
													US (SCCs)
												</span>
											</div>
											<p className="text-sm text-slate-600">
												Sentry collects application error reports and stack traces to support
												platform reliability and debugging. Abridge configures Sentry to minimise
												personal data in error reports. Error logs are retained for 90 days.
											</p>
										</div>

										<div className="bg-card rounded-xl p-5 border border-orange-100/60 shadow-sm">
											<div className="flex items-start justify-between gap-4 flex-wrap">
												<div>
													<h3 className="font-semibold text-[#1E3A5F] mb-1">
														AI providers (school-configured, optional)
													</h3>
													<p className="text-sm text-slate-500 mb-2">Progress summary generation</p>
												</div>
												<span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-medium shrink-0">
													Varies by configuration
												</span>
											</div>
											<p className="text-sm text-slate-600">
												Where the School enables the AI progress summaries feature, teacher notes
												may be transmitted to an AI language model provider to generate summary
												text. The provider is configured by the School and may include Anthropic
												(Claude), OpenAI (GPT), Google (Gemini), or Groq. Schools may also configure
												a self-hosted Ollama instance, in which case no data leaves the
												School&apos;s own network. The School is responsible for selecting a
												provider that meets their data protection obligations and for notifying
												Abridge of their chosen provider.
											</p>
											<p className="text-sm text-slate-500 mt-2">
												<strong>Note:</strong> If the AI progress summaries feature is not enabled
												by the School, no data is transmitted to any AI provider.
											</p>
										</div>
									</div>

									<div className="mt-4 p-4 bg-blue-50/40 border border-blue-100 rounded-xl">
										<p className="text-sm text-slate-600">
											<strong className="text-[#1E3A5F]">Changes to sub-processors:</strong> The
											Processor shall give the Controller at least 30 days&apos; written notice of
											any intended addition or replacement of a sub-processor. The Controller may
											object to any such change within that period. If the Controller objects and
											the parties cannot agree, either party may terminate the Principal Agreement
											on written notice.
										</p>
									</div>

									<p>
										The Processor shall ensure that each sub-processor is subject to data protection
										obligations equivalent to those set out in this Agreement, by way of a binding
										written contract.
									</p>
								</div>
							</article>

							{/* ------------------------------------------------ */}
							{/*  8. International transfers                        */}
							{/* ------------------------------------------------ */}
							<article id="international-transfers">
								<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4 scroll-mt-28">
									8. International transfers
								</h2>
								<div className="space-y-4 text-slate-600 leading-relaxed">
									<p>
										Abridge&apos;s primary infrastructure is hosted in the United Kingdom and the
										European Union. Database and application servers are located in the UK. The
										Processor shall not transfer personal data to a country outside the UK or EU
										except as described in this clause.
									</p>
									<p>
										Where data is processed by sub-processors based in the United States (Stripe,
										Sentry, and certain AI providers), such transfers are made subject to one or
										more of the following safeguards:
									</p>
									<ul className="list-disc list-inside space-y-2 ml-2">
										<li>
											<strong>Standard Contractual Clauses (SCCs)</strong> approved by the European
											Commission and the ICO&apos;s UK Addendum, providing appropriate safeguards as
											required by Article 46 of UK GDPR.
										</li>
										<li>
											<strong>UK International Data Transfer Agreement (IDTA)</strong> where
											applicable, as issued by the ICO.
										</li>
										<li>
											<strong>Adequacy decisions</strong> where the destination country has been
											recognised by the UK Government as providing an equivalent level of protection
											to UK data protection law.
										</li>
									</ul>
									<p>
										Where the School configures a self-hosted AI provider (such as Ollama running on
										school infrastructure), no personal data is transferred outside the
										School&apos;s own network for AI processing.
									</p>
									<p>
										The Processor shall not permit any sub-processor to transfer personal data
										outside the UK or EU without ensuring that the same level of protection is
										afforded as required by this Agreement.
									</p>
								</div>
							</article>

							{/* ------------------------------------------------ */}
							{/*  9. Security measures                              */}
							{/* ------------------------------------------------ */}
							<article id="security-measures">
								<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4 scroll-mt-28">
									9. Security measures
								</h2>
								<div className="space-y-4 text-slate-600 leading-relaxed">
									<p>
										The Processor implements and maintains the following technical and
										organisational measures to protect personal data, taking into account the state
										of the art, the costs of implementation, and the nature, scope, context, and
										purposes of processing:
									</p>

									<div className="space-y-3 mt-4">
										<div className="flex gap-4 p-4 bg-orange-50/40 rounded-xl border border-orange-100/60">
											<div className="w-8 h-8 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center shrink-0 mt-0.5">
												<span className="text-xs font-bold text-[#1E3A5F]">1</span>
											</div>
											<div>
												<h3 className="font-semibold text-[#1E3A5F] mb-1">Encryption in transit</h3>
												<p className="text-sm">
													All communications between user devices and Abridge servers are encrypted
													using TLS 1.2 or higher. API endpoints are accessible only over HTTPS.
												</p>
											</div>
										</div>

										<div className="flex gap-4 p-4 bg-orange-50/40 rounded-xl border border-orange-100/60">
											<div className="w-8 h-8 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center shrink-0 mt-0.5">
												<span className="text-xs font-bold text-[#1E3A5F]">2</span>
											</div>
											<div>
												<h3 className="font-semibold text-[#1E3A5F] mb-1">Encryption at rest</h3>
												<p className="text-sm">
													Database contents are encrypted at rest by the hosting provider. Passwords
													are stored exclusively as hashed values (bcrypt) and are never stored in
													plaintext.
												</p>
											</div>
										</div>

										<div className="flex gap-4 p-4 bg-orange-50/40 rounded-xl border border-orange-100/60">
											<div className="w-8 h-8 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center shrink-0 mt-0.5">
												<span className="text-xs font-bold text-[#1E3A5F]">3</span>
											</div>
											<div>
												<h3 className="font-semibold text-[#1E3A5F] mb-1">Access controls</h3>
												<p className="text-sm">
													Role-based access controls ensure that staff can only access data relevant
													to their role. Admin-level actions are logged. Access to production
													systems is restricted to authorised personnel only.
												</p>
											</div>
										</div>

										<div className="flex gap-4 p-4 bg-orange-50/40 rounded-xl border border-orange-100/60">
											<div className="w-8 h-8 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center shrink-0 mt-0.5">
												<span className="text-xs font-bold text-[#1E3A5F]">4</span>
											</div>
											<div>
												<h3 className="font-semibold text-[#1E3A5F] mb-1">Regular backups</h3>
												<p className="text-sm">
													The database is backed up regularly. Backups are encrypted and stored
													securely. Restoration procedures are tested periodically.
												</p>
											</div>
										</div>

										<div className="flex gap-4 p-4 bg-orange-50/40 rounded-xl border border-orange-100/60">
											<div className="w-8 h-8 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center shrink-0 mt-0.5">
												<span className="text-xs font-bold text-[#1E3A5F]">5</span>
											</div>
											<div>
												<h3 className="font-semibold text-[#1E3A5F] mb-1">
													Input validation and injection prevention
												</h3>
												<p className="text-sm">
													All API inputs are validated and sanitised using a typed schema
													(Zod/tRPC). The platform employs parameterised queries to prevent SQL
													injection. CSRF protections are applied to all state-changing operations.
												</p>
											</div>
										</div>

										<div className="flex gap-4 p-4 bg-orange-50/40 rounded-xl border border-orange-100/60">
											<div className="w-8 h-8 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center shrink-0 mt-0.5">
												<span className="text-xs font-bold text-[#1E3A5F]">6</span>
											</div>
											<div>
												<h3 className="font-semibold text-[#1E3A5F] mb-1">Incident response</h3>
												<p className="text-sm">
													The Processor maintains an incident response procedure. In the event of a
													suspected security incident, the Processor will immediately investigate,
													contain, and remediate. Notification obligations are described in clause
													10.
												</p>
											</div>
										</div>

										<div className="flex gap-4 p-4 bg-orange-50/40 rounded-xl border border-orange-100/60">
											<div className="w-8 h-8 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center shrink-0 mt-0.5">
												<span className="text-xs font-bold text-[#1E3A5F]">7</span>
											</div>
											<div>
												<h3 className="font-semibold text-[#1E3A5F] mb-1">Security reviews</h3>
												<p className="text-sm">
													The Processor conducts regular security reviews of the codebase and
													infrastructure, and intends to commission independent penetration testing
													prior to general availability of the platform.
												</p>
											</div>
										</div>
									</div>
								</div>
							</article>

							{/* ------------------------------------------------ */}
							{/*  10. Data breach notification                      */}
							{/* ------------------------------------------------ */}
							<article id="breach-notification">
								<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4 scroll-mt-28">
									10. Data breach notification
								</h2>
								<div className="space-y-4 text-slate-600 leading-relaxed">
									<p>
										In the event that the Processor becomes aware of a personal data breach
										affecting data processed under this Agreement, the Processor shall:
									</p>
									<ul className="list-disc list-inside space-y-2 ml-2">
										<li>
											Notify the Controller without undue delay and, where feasible, within{" "}
											<strong>72 hours</strong> of becoming aware of the breach;
										</li>
										<li>
											Provide the Controller with sufficient information to allow the Controller to
											meet its own notification obligations to the ICO and, where applicable, to
											affected data subjects;
										</li>
										<li>
											Include in the notification, as far as possible: the nature of the breach; the
											categories and approximate number of data subjects and records concerned; the
											likely consequences of the breach; and the measures taken or proposed to
											address it.
										</li>
									</ul>
									<p>
										Notification shall be made by email to the Controller&apos;s Data Protection
										Lead or DPO as identified in clause 1. The Processor shall cooperate fully with
										the Controller in investigating and remediating any breach.
									</p>
									<p>
										The Controller acknowledges that it bears ultimate responsibility for notifying
										the ICO and affected individuals where required by UK GDPR. Abridge&apos;s
										notification to the Controller is intended to assist the Controller in
										discharging this obligation; it does not replace it.
									</p>
								</div>
							</article>

							{/* ------------------------------------------------ */}
							{/*  11. Audit rights                                  */}
							{/* ------------------------------------------------ */}
							<article id="audit-rights">
								<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4 scroll-mt-28">
									11. Audit rights
								</h2>
								<div className="space-y-4 text-slate-600 leading-relaxed">
									<p>
										The Processor shall make available to the Controller all information reasonably
										necessary to demonstrate compliance with the obligations set out in Article 28
										of UK GDPR and this Agreement.
									</p>
									<p>
										The Controller (or an auditor mandated by the Controller) may conduct an audit
										of the Processor&apos;s compliance with this Agreement, subject to the following
										conditions:
									</p>
									<ul className="list-disc list-inside space-y-2 ml-2">
										<li>
											The Controller shall give the Processor at least 30 days&apos; prior written
											notice of any intended audit;
										</li>
										<li>
											Audits shall be conducted during normal business hours, no more than once per
											calendar year (except where a personal data breach or regulatory investigation
											requires more frequent auditing);
										</li>
										<li>
											The Controller shall bear the costs of any third-party auditor it appoints;
										</li>
										<li>
											Any auditor appointed by the Controller shall be bound by an obligation of
											confidentiality equivalent to the confidentiality provisions of this
											Agreement;
										</li>
										<li>
											Audits shall be conducted in a manner that minimises disruption to the
											Processor&apos;s operations.
										</li>
									</ul>
									<p>
										The Processor may satisfy audit obligations by providing relevant
										certifications, third-party audit reports, or evidence of security practices,
										where the Controller agrees that such documentation is sufficient.
									</p>
								</div>
							</article>

							{/* ------------------------------------------------ */}
							{/*  12. Termination and data return                   */}
							{/* ------------------------------------------------ */}
							<article id="termination">
								<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4 scroll-mt-28">
									12. Termination and data return
								</h2>
								<div className="space-y-4 text-slate-600 leading-relaxed">
									<p>
										Upon termination or expiry of the Principal Agreement, or upon written request
										from the Controller, the Processor shall:
									</p>
									<ul className="list-disc list-inside space-y-2 ml-2">
										<li>
											Provide the Controller with a complete export of all personal data held under
											this Agreement, in a commonly used machine-readable format (JSON or CSV),
											within <strong>30 days</strong> of the date of termination or request;
										</li>
										<li>
											Following confirmation by the Controller that the data export has been
											received, securely delete or destroy all personal data processed under this
											Agreement within <strong>90 days</strong> of the date of termination;
										</li>
										<li>
											Provide the Controller with written confirmation that all personal data has
											been deleted, including confirmation from any sub-processors where applicable;
										</li>
										<li>
											Retain only such data as is required by applicable law (for example, payment
											records retained for HMRC compliance), which shall be clearly identified and
											held in a segregated manner.
										</li>
									</ul>
									<p>
										The Processor shall ensure that all sub-processors delete personal data
										processed under this Agreement in accordance with the Processor&apos;s own
										deletion obligations, unless applicable law requires continued storage.
									</p>
								</div>
							</article>

							{/* ------------------------------------------------ */}
							{/*  13. Signatures                                    */}
							{/* ------------------------------------------------ */}
							<article id="signatures">
								<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4 scroll-mt-28">
									13. Signatures
								</h2>
								<div className="space-y-4 text-slate-600 leading-relaxed">
									<p>
										By signing below, both parties agree to be bound by the terms of this Data
										Processing Agreement, which forms part of the Principal Agreement between them.
									</p>

									<div className="mt-8 grid sm:grid-cols-2 gap-8">
										{/* Controller signature block */}
										<div className="border border-orange-100/80 rounded-xl p-6 space-y-6">
											<h3 className="font-semibold text-[#1E3A5F] text-base">
												For and on behalf of the Controller
											</h3>

											<div className="space-y-4">
												<div>
													<p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
														Name
													</p>
													<div className="h-9 border-b border-dashed border-slate-300" />
												</div>
												<div>
													<p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
														Position / title
													</p>
													<div className="h-9 border-b border-dashed border-slate-300" />
												</div>
												<div>
													<p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
														Signature
													</p>
													<div className="h-16 border-b border-dashed border-slate-300" />
												</div>
												<div>
													<p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
														Date
													</p>
													<div className="h-9 border-b border-dashed border-slate-300" />
												</div>
												<div>
													<p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
														On behalf of
													</p>
													<p className="font-mono text-xs bg-orange-100/60 px-2 py-1.5 rounded">
														[SCHOOL NAME]
													</p>
												</div>
											</div>
										</div>

										{/* Processor signature block */}
										<div className="border border-orange-100/80 rounded-xl p-6 space-y-6">
											<h3 className="font-semibold text-[#1E3A5F] text-base">
												For and on behalf of the Processor
											</h3>

											<div className="space-y-4">
												<div>
													<p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
														Name
													</p>
													<p className="text-sm text-slate-600 pt-1 border-b border-dashed border-slate-300 pb-2">
														Hiten Patel
													</p>
												</div>
												<div>
													<p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
														Position / title
													</p>
													<p className="text-sm text-slate-600 pt-1 border-b border-dashed border-slate-300 pb-2">
														Founder, Abridge
													</p>
												</div>
												<div>
													<p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
														Signature
													</p>
													<div className="h-16 border-b border-dashed border-slate-300" />
												</div>
												<div>
													<p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
														Date
													</p>
													<div className="h-9 border-b border-dashed border-slate-300" />
												</div>
												<div>
													<p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
														On behalf of
													</p>
													<p className="text-sm text-slate-600">Hiten Patel, trading as Abridge</p>
												</div>
											</div>
										</div>
									</div>

									<div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
										<strong>Reminder:</strong> This document should be printed, signed by an
										authorised signatory of the School, and returned to{" "}
										<a
											href="mailto:hello@abridge.school"
											className="text-[#FF7D45] hover:underline font-medium"
										>
											hello@abridge.school
										</a>{" "}
										before the School begins processing personal data through the Abridge platform.
										A countersigned copy will be returned within 5 working days.
									</div>
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
								<li>
									<a href="/dpa" className="hover:text-white transition-colors">
										Data Processing Agreement
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
