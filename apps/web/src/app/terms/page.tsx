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
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TermsPage() {
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
					<h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-4 text-[#1E3A5F]">
						Terms of Service
					</h1>
					<p className="text-base text-slate-500">Last updated: March 2026</p>
				</div>
			</section>

			{/* ============================================================ */}
			{/*  LEGAL NOTICE BANNER                                          */}
			{/* ============================================================ */}
			<section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
				<div className="bg-orange-50/60 border border-orange-200/80 rounded-2xl px-6 py-5">
					<p className="text-sm text-[#1E3A5F] leading-relaxed">
						<span className="font-semibold">Important notice:</span> These terms are provided as a
						template and should be reviewed by your legal adviser before use. Abridge is an
						early-access product. Nothing in this document constitutes legal advice.
					</p>
				</div>
			</section>

			{/* ============================================================ */}
			{/*  TERMS CONTENT                                                */}
			{/* ============================================================ */}
			<section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
				<div className="prose-abridge space-y-12">
					{/* 1. Agreement to Terms */}
					<div>
						<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">1. Agreement to Terms</h2>
						<div className="space-y-4 text-base text-slate-600 leading-relaxed">
							<p>
								By accessing or using the Abridge platform (&ldquo;the Service&rdquo;), you agree to
								be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to
								these Terms, you must not access or use the Service.
							</p>
							<p>
								These Terms apply to all users of the Service, including school administrators,
								teaching and support staff, parents, and guardians. Your school&rsquo;s agreement to
								these Terms on behalf of its staff and the parents it invites constitutes acceptance
								by those users.
							</p>
							<p>
								We may update these Terms from time to time. We will give you at least 30
								days&rsquo; notice of material changes via the platform. Continued use of the
								Service after the effective date of any changes constitutes your acceptance of the
								revised Terms.
							</p>
						</div>
					</div>

					{/* 2. Description of Service */}
					<div>
						<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">2. Description of Service</h2>
						<div className="space-y-4 text-base text-slate-600 leading-relaxed">
							<p>
								Abridge is a school-parent communication platform designed for UK schools. The
								Service provides tools including, but not limited to:
							</p>
							<ul className="list-disc list-outside ml-6 space-y-2">
								<li>Direct messaging between staff and parents or guardians</li>
								<li>Attendance recording, reporting, and absence notifications</li>
								<li>
									Collection of payments for school trips, clubs, meals, and other items via Stripe
								</li>
								<li>Digital form creation, distribution, and collection</li>
								<li>Parents&rsquo; evening slot booking and management</li>
								<li>AI-assisted progress summaries and message drafting (optional, per-school)</li>
								<li>School announcements and notice boards</li>
							</ul>
							<p>
								The specific features available to your school depend on the subscription plan
								chosen and the features enabled by your school administrator.
							</p>
						</div>
					</div>

					{/* 3. User Accounts */}
					<div>
						<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">3. User Accounts</h2>
						<div className="space-y-4 text-base text-slate-600 leading-relaxed">
							<p>
								<span className="font-semibold text-[#1E3A5F]">3.1 Registration.</span> To access
								the Service you must register for an account. Staff accounts are created by school
								administrators. Parent and guardian accounts are created via an invitation or
								registration link provided by your school.
							</p>
							<p>
								<span className="font-semibold text-[#1E3A5F]">3.2 Accuracy of information.</span>{" "}
								You must provide accurate, current, and complete information during registration and
								keep that information up to date. Providing false or misleading information is a
								breach of these Terms and may result in immediate account suspension.
							</p>
							<p>
								<span className="font-semibold text-[#1E3A5F]">3.3 Account security.</span> You are
								responsible for maintaining the confidentiality of your login credentials and for
								all activity that occurs under your account. You must notify your school
								administrator and contact us at{" "}
								<a href="mailto:hello@abridge.school" className="text-[#FF7D45] hover:underline">
									hello@abridge.school
								</a>{" "}
								immediately if you suspect unauthorised access to your account.
							</p>
							<p>
								<span className="font-semibold text-[#1E3A5F]">3.4 One account per person.</span>{" "}
								Each individual must maintain only one account. You must not create accounts on
								behalf of other people without their express consent.
							</p>
						</div>
					</div>

					{/* 4. Acceptable Use */}
					<div>
						<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">4. Acceptable Use</h2>
						<div className="space-y-4 text-base text-slate-600 leading-relaxed">
							<p>You agree not to use the Service to:</p>
							<ul className="list-disc list-outside ml-6 space-y-2">
								<li>
									Harass, threaten, abuse, or intimidate any other user, staff member, parent, or
									child
								</li>
								<li>Share, disclose, or transfer your login credentials to any other person</li>
								<li>
									Use automated scripts, bots, scrapers, or any other automated means to access or
									interact with the Service without our prior written consent
								</li>
								<li>
									Upload, transmit, or share any content that is unlawful, defamatory, obscene,
									discriminatory, or otherwise objectionable
								</li>
								<li>
									Attempt to gain unauthorised access to any part of the Service, or to any other
									user&rsquo;s account or data
								</li>
								<li>
									Interfere with or disrupt the integrity or performance of the Service or its
									infrastructure
								</li>
								<li>
									Use the Service for any purpose other than legitimate school-parent communication
									and administration
								</li>
								<li>
									Violate any applicable UK law or regulation, including but not limited to data
									protection legislation
								</li>
							</ul>
							<p>
								We reserve the right to suspend or terminate any account that violates these
								acceptable use provisions, with or without prior notice depending on the severity of
								the breach.
							</p>
						</div>
					</div>

					{/* 5. School Responsibilities */}
					<div>
						<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">5. School Responsibilities</h2>
						<div className="space-y-4 text-base text-slate-600 leading-relaxed">
							<p>
								<span className="font-semibold text-[#1E3A5F]">5.1 Data controller.</span> For the
								purposes of UK GDPR and the Data Protection Act 2018, the school is the data
								controller of all personal data processed through the Service relating to its staff,
								pupils, and parents. Abridge acts as a data processor on the school&rsquo;s behalf.
								Schools must ensure they have a lawful basis for processing personal data through
								the Service.
							</p>
							<p>
								<span className="font-semibold text-[#1E3A5F]">5.2 User management.</span> School
								administrators are responsible for creating, maintaining, and deactivating staff and
								parent accounts. Schools must promptly deactivate accounts when a staff member
								leaves or a parent&rsquo;s relationship with the school ends.
							</p>
							<p>
								<span className="font-semibold text-[#1E3A5F]">5.3 Feature configuration.</span>{" "}
								Schools are responsible for configuring features appropriately for their context,
								including enabling or disabling AI features, setting payment amounts, and
								configuring access permissions for different staff roles.
							</p>
							<p>
								<span className="font-semibold text-[#1E3A5F]">5.4 Regulatory compliance.</span>{" "}
								Schools are responsible for ensuring their use of the Service complies with all
								applicable education regulations, safeguarding requirements, and sector-specific
								guidance, including but not limited to guidance from the Department for Education
								and relevant multi-academy trust policies.
							</p>
						</div>
					</div>

					{/* 6. Parent and Guardian Responsibilities */}
					<div>
						<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">
							6. Parent and Guardian Responsibilities
						</h2>
						<div className="space-y-4 text-base text-slate-600 leading-relaxed">
							<p>
								<span className="font-semibold text-[#1E3A5F]">6.1 Accurate information.</span>{" "}
								Parents and guardians must provide accurate contact details and keep them up to
								date. Inaccurate information may result in you missing important communications from
								your child&rsquo;s school.
							</p>
							<p>
								<span className="font-semibold text-[#1E3A5F]">6.2 Appropriate communication.</span>{" "}
								The messaging features of the Service are intended for legitimate communication with
								your child&rsquo;s school. All messages must be respectful and relevant. Abusive,
								threatening, or inappropriate messages may result in account suspension and may be
								shared with relevant authorities.
							</p>
							<p>
								<span className="font-semibold text-[#1E3A5F]">6.3 Account access.</span> Your
								account is personal to you. If you share parental responsibility with another
								person, each person should have their own account. You must not access another
								parent&rsquo;s account or share your credentials with anyone else.
							</p>
						</div>
					</div>

					{/* 7. Payments */}
					<div>
						<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">7. Payments</h2>
						<div className="space-y-4 text-base text-slate-600 leading-relaxed">
							<p>
								<span className="font-semibold text-[#1E3A5F]">7.1 Payment processing.</span>{" "}
								Payments made through the Service are processed by Stripe, Inc., a third-party
								payment processor. By making a payment, you agree to{" "}
								<a
									href="https://stripe.com/gb/legal"
									target="_blank"
									rel="noopener noreferrer"
									className="text-[#FF7D45] hover:underline"
								>
									Stripe&rsquo;s terms and conditions
								</a>
								. Abridge does not store your full card details.
							</p>
							<p>
								<span className="font-semibold text-[#1E3A5F]">7.2 Currency and amounts.</span> All
								amounts are denominated in pounds sterling (GBP). Prices for trips, clubs, meals,
								and other items are set by the school, not by Abridge. Any queries about specific
								amounts should be directed to your school.
							</p>
							<p>
								<span className="font-semibold text-[#1E3A5F]">7.3 Refund policy.</span> Refund
								requests for payments made through the Service are handled by your school. Abridge
								is not responsible for a school&rsquo;s refund decisions. If you have a dispute
								about a payment, please contact your school in the first instance.
							</p>
							<p>
								<span className="font-semibold text-[#1E3A5F]">7.4 Platform fees.</span> Abridge may
								apply a small transaction fee to payments processed through the Service. Where
								applicable, this will be disclosed at the point of payment.
							</p>
						</div>
					</div>

					{/* 8. Intellectual Property */}
					<div>
						<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">8. Intellectual Property</h2>
						<div className="space-y-4 text-base text-slate-600 leading-relaxed">
							<p>
								<span className="font-semibold text-[#1E3A5F]">8.1 The platform.</span> Abridge and
								all associated software, designs, trademarks, and content comprising the Service are
								owned by or licensed to Abridge. Nothing in these Terms grants you any right, title,
								or interest in the Service beyond the limited licence to use it in accordance with
								these Terms.
							</p>
							<p>
								<span className="font-semibold text-[#1E3A5F]">8.2 School data.</span> Schools
								retain ownership of all data they input into the Service, including pupil records,
								messages, form responses, and payment records (&ldquo;School Data&rdquo;). Abridge
								will not use School Data for any purpose other than providing and improving the
								Service.
							</p>
							<p>
								<span className="font-semibold text-[#1E3A5F]">8.3 User-generated content.</span> By
								submitting content to the Service (such as messages, form responses, or
								attachments), you grant Abridge a limited, non-exclusive, royalty-free licence to
								store, process, and display that content solely for the purpose of providing the
								Service to you and your school. You retain all other rights in your content.
							</p>
						</div>
					</div>

					{/* 9. AI Features */}
					<div>
						<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">9. AI Features</h2>
						<div className="space-y-4 text-base text-slate-600 leading-relaxed">
							<p>
								<span className="font-semibold text-[#1E3A5F]">9.1 Optional and configurable.</span>{" "}
								The Service includes optional AI-assisted features, such as progress summary
								generation and message drafting. These features are disabled by default and must be
								explicitly enabled by a school administrator. Schools may choose their preferred AI
								provider, including running a local model so that no data leaves their network.
							</p>
							<p>
								<span className="font-semibold text-[#1E3A5F]">9.2 Human review.</span> All
								AI-generated content — including progress summaries and draft messages — is
								presented to staff for review and approval before it is sent to parents. Abridge
								does not automatically send AI-generated content without human oversight.
							</p>
							<p>
								<span className="font-semibold text-[#1E3A5F]">9.3 No accuracy guarantee.</span>{" "}
								AI-generated content is provided as a draft aid only. Abridge makes no
								representations or warranties as to the accuracy, completeness, or suitability of
								any AI-generated content. Schools and staff are solely responsible for the content
								they choose to send.
							</p>
							<p>
								<span className="font-semibold text-[#1E3A5F]">9.4 Third-party AI providers.</span>{" "}
								Where a school chooses to use a third-party AI provider (such as Anthropic, OpenAI,
								Google, or Groq), data submitted to that provider is subject to that
								provider&rsquo;s own terms and privacy policy. Schools are responsible for ensuring
								this arrangement is compatible with their data protection obligations.
							</p>
						</div>
					</div>

					{/* 10. Service Availability */}
					<div>
						<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">10. Service Availability</h2>
						<div className="space-y-4 text-base text-slate-600 leading-relaxed">
							<p>
								<span className="font-semibold text-[#1E3A5F]">10.1 Best efforts.</span> Abridge
								will use commercially reasonable efforts to keep the Service available and
								performant. However, we do not guarantee uninterrupted or error-free operation of
								the Service.
							</p>
							<p>
								<span className="font-semibold text-[#1E3A5F]">10.2 Planned maintenance.</span> We
								will endeavour to give at least 24 hours&rsquo; notice of planned maintenance
								windows that are expected to cause significant downtime, via an in-platform
								notification or email to school administrators.
							</p>
							<p>
								<span className="font-semibold text-[#1E3A5F]">10.3 No SLA for free tier.</span> No
								uptime service level agreement (SLA) applies to schools on the free or early access
								tier. Paid plans may include uptime commitments as set out in a separate order form
								or subscription agreement.
							</p>
						</div>
					</div>

					{/* 11. Limitation of Liability */}
					<div>
						<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">11. Limitation of Liability</h2>
						<div className="space-y-4 text-base text-slate-600 leading-relaxed">
							<p>
								<span className="font-semibold text-[#1E3A5F]">11.1 Cap on liability.</span> To the
								maximum extent permitted by applicable law, Abridge&rsquo;s total aggregate
								liability to you arising out of or in connection with these Terms or your use of the
								Service (whether in contract, tort including negligence, breach of statutory duty,
								or otherwise) shall not exceed the amounts paid by your school to Abridge in the 12
								months preceding the event giving rise to the claim, or &pound;500, whichever is
								greater.
							</p>
							<p>
								<span className="font-semibold text-[#1E3A5F]">11.2 Excluded losses.</span> To the
								maximum extent permitted by law, Abridge shall not be liable for any indirect,
								consequential, special, incidental, or punitive loss or damage, or for any loss of
								profits, revenue, data, goodwill, or business opportunity.
							</p>
							<p>
								<span className="font-semibold text-[#1E3A5F]">11.3 School decisions.</span> Abridge
								provides a platform for communication and administration. We are not liable for any
								decisions made by schools, staff, or governors based on information displayed within
								the Service, including attendance data, payment records, or AI-generated progress
								summaries.
							</p>
							<p>
								<span className="font-semibold text-[#1E3A5F]">11.4 Statutory rights.</span> Nothing
								in these Terms limits or excludes liability for death or personal injury caused by
								negligence, fraud or fraudulent misrepresentation, or any other liability that
								cannot be limited or excluded by applicable UK law.
							</p>
						</div>
					</div>

					{/* 12. Changes to Terms */}
					<div>
						<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">12. Changes to Terms</h2>
						<div className="space-y-4 text-base text-slate-600 leading-relaxed">
							<p>
								We may update these Terms from time to time to reflect changes in the Service,
								applicable law, or our business practices. We will give school administrators at
								least 30 days&rsquo; notice of any material changes via an in-platform notification
								or email.
							</p>
							<p>
								Minor changes (such as typographical corrections or clarifications that do not
								affect your rights) may be made without prior notice. The &ldquo;Last updated&rdquo;
								date at the top of this page will always reflect when the Terms were last revised.
							</p>
							<p>
								If you or your school continue to use the Service after the effective date of any
								changes to these Terms, that continued use constitutes acceptance of the revised
								Terms. If you do not agree to the revised Terms, you must stop using the Service.
							</p>
						</div>
					</div>

					{/* 13. Termination */}
					<div>
						<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">13. Termination</h2>
						<div className="space-y-4 text-base text-slate-600 leading-relaxed">
							<p>
								<span className="font-semibold text-[#1E3A5F]">
									13.1 Termination by the school.
								</span>{" "}
								Schools may terminate their use of the Service at any time by contacting us at{" "}
								<a href="mailto:hello@abridge.school" className="text-[#FF7D45] hover:underline">
									hello@abridge.school
								</a>
								. Upon receipt of a termination request, we will confirm the termination date and
								provide instructions for data export.
							</p>
							<p>
								<span className="font-semibold text-[#1E3A5F]">13.2 Data export.</span> Prior to
								termination taking effect, schools may request a full export of their School Data in
								a machine-readable format. We will fulfil data export requests within 14 working
								days.
							</p>
							<p>
								<span className="font-semibold text-[#1E3A5F]">13.3 Data deletion.</span> Following
								the termination date, all School Data will be retained for 90 days to allow for any
								final export requests. After this period, all personal data associated with the
								school will be securely deleted from our systems, except where we are required to
								retain it by applicable law.
							</p>
							<p>
								<span className="font-semibold text-[#1E3A5F]">13.4 Termination by Abridge.</span>{" "}
								We may suspend or terminate your school&rsquo;s access to the Service if you
								materially breach these Terms and fail to remedy that breach within 14 days of
								written notice, or immediately if the breach is not capable of remedy or relates to
								a serious safeguarding concern.
							</p>
						</div>
					</div>

					{/* 14. Governing Law */}
					<div>
						<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">14. Governing Law</h2>
						<div className="space-y-4 text-base text-slate-600 leading-relaxed">
							<p>
								These Terms and any dispute or claim arising out of or in connection with them
								(including non-contractual disputes or claims) shall be governed by and construed in
								accordance with the laws of England and Wales.
							</p>
							<p>
								Each party irrevocably agrees that the courts of England and Wales shall have
								exclusive jurisdiction to settle any dispute or claim arising out of or in
								connection with these Terms or their subject matter or formation.
							</p>
						</div>
					</div>

					{/* 15. Contact */}
					<div>
						<h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">15. Contact</h2>
						<div className="space-y-4 text-base text-slate-600 leading-relaxed">
							<p>
								If you have any questions about these Terms, or wish to exercise any of your rights
								in connection with the Service, please contact us at:
							</p>
							<div className="bg-orange-50/40 border border-orange-100/60 rounded-2xl px-6 py-5 space-y-1">
								<p className="font-semibold text-[#1E3A5F]">Abridge</p>
								<p>
									<a href="mailto:hello@abridge.school" className="text-[#FF7D45] hover:underline">
										hello@abridge.school
									</a>
								</p>
							</div>
							<p>We aim to respond to all enquiries within 5 working days.</p>
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
