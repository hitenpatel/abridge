"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { FeatureToggleProvider, useFeatureToggles } from "@/lib/feature-toggles";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

interface NavItem {
	name: string;
	href: string;
	icon: string; // Material Symbol name
	badge?: number;
	featureKey?:
		| "messagingEnabled"
		| "paymentsEnabled"
		| "attendanceEnabled"
		| "calendarEnabled"
		| "formsEnabled"
		| "parentsEveningEnabled"
		| "analyticsEnabled"
		| "wellbeingEnabled"
		| "emergencyCommsEnabled"
		| "mealBookingEnabled"
		| "reportCardsEnabled"
		| "communityHubEnabled";
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	const { data: session } = trpc.auth.getSession.useQuery();

	return (
		<FeatureToggleProvider schoolId={session?.schoolId}>
			<DashboardLayoutInner session={session}>{children}</DashboardLayoutInner>
		</FeatureToggleProvider>
	);
}

function DashboardLayoutInner({
	session,
	children,
}: { session: { name?: string; isParent?: boolean; staffRole?: string; schoolId?: string } | undefined; children: React.ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const userRole = session
		? {
				isParent: session.isParent,
				staffRole: session.staffRole,
			}
		: null;

	const featureToggles = useFeatureToggles();

	const parentNav: NavItem[] = [
		{ name: "Home", href: "/dashboard", icon: "home" },
		{
			name: "Messages",
			href: "/dashboard/messages",
			icon: "chat_bubble",
			badge: 3,
			featureKey: "messagingEnabled",
		},
		{
			name: "Attendance",
			href: "/dashboard/attendance",
			icon: "assignment_turned_in",
			featureKey: "attendanceEnabled",
		},
		{
			name: "Payments",
			href: "/dashboard/payments",
			icon: "payments",
			featureKey: "paymentsEnabled",
		},
		{
			name: "Calendar",
			href: "/dashboard/calendar",
			icon: "calendar_month",
			featureKey: "calendarEnabled",
		},
		{ name: "Forms", href: "/dashboard/forms", icon: "description", featureKey: "formsEnabled" },
		{
			name: "Parents' Evening",
			href: "/dashboard/parents-evening",
			icon: "groups",
			featureKey: "parentsEveningEnabled",
		},
		{
			name: "Wellbeing",
			href: "/dashboard/wellbeing",
			icon: "favorite",
			featureKey: "wellbeingEnabled",
		},
		{
			name: "Meals",
			href: "/dashboard/meals",
			icon: "restaurant",
			featureKey: "mealBookingEnabled",
		},
		{
			name: "Reports",
			href: "/dashboard/reports",
			icon: "description",
			featureKey: "reportCardsEnabled",
		},
		{
			name: "Community",
			href: "/dashboard/community",
			icon: "groups",
			featureKey: "communityHubEnabled",
		},
		{ name: "Settings", href: "/dashboard/settings", icon: "settings" },
	];

	const staffNav: NavItem[] = [
		{ name: "Home", href: "/dashboard", icon: "home" },
		{
			name: "Post to Class",
			href: "/dashboard/compose",
			icon: "edit_square",
			featureKey: "messagingEnabled",
		},
		{
			name: "Messages",
			href: "/dashboard/messages",
			icon: "chat_bubble",
			featureKey: "messagingEnabled",
		},
		{
			name: "Attendance",
			href: "/dashboard/attendance",
			icon: "assignment_turned_in",
			featureKey: "attendanceEnabled",
		},
		{
			name: "Payments",
			href: "/dashboard/payments",
			icon: "payments",
			featureKey: "paymentsEnabled",
		},
		{
			name: "Analytics",
			href: "/dashboard/analytics",
			icon: "analytics",
			featureKey: "analyticsEnabled",
		},
		{
			name: "Parents' Evening",
			href: "/dashboard/parents-evening",
			icon: "groups",
			featureKey: "parentsEveningEnabled",
		},
		{
			name: "Wellbeing",
			href: "/dashboard/wellbeing",
			icon: "favorite",
			featureKey: "wellbeingEnabled",
		},
		{
			name: "Emergency",
			href: "/dashboard/emergency",
			icon: "shield",
			featureKey: "emergencyCommsEnabled",
		},
		{
			name: "Meals",
			href: "/dashboard/meals",
			icon: "restaurant",
			featureKey: "mealBookingEnabled",
		},
		{
			name: "Reports",
			href: "/dashboard/reports",
			icon: "description",
			featureKey: "reportCardsEnabled",
		},
		{
			name: "Community",
			href: "/dashboard/community",
			icon: "groups",
			featureKey: "communityHubEnabled",
		},
		{ name: "Settings", href: "/dashboard/settings", icon: "settings" },
	];

	const adminNav: NavItem[] = [
		{ name: "Staff Management", href: "/dashboard/staff", icon: "shield_person" },
	];

	let navItems: NavItem[] = [];
	if (userRole?.staffRole === "ADMIN") {
		navItems = [...staffNav, ...adminNav];
	} else if (userRole?.staffRole) {
		navItems = staffNav;
	} else {
		navItems = parentNav;
	}

	navItems = navItems.filter((item) => !item.featureKey || featureToggles[item.featureKey]);

	const userInitials = session?.name
		? session.name
				.split(" ")
				.map((n: string) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: "U";

	const handleSignOut = async () => {
		await authClient.signOut();
		router.push("/login");
	};

	const NavContent = ({ onClick }: { onClick?: () => void }) => (
		<nav className="flex-1 space-y-2" aria-label="Main navigation">
			{navItems.map((item) => {
				const isActive = pathname === item.href;
				return (
					<Link
						key={item.href}
						href={item.href}
						onClick={onClick}
						aria-current={isActive ? "page" : undefined}
						data-testid={`${item.name.toLowerCase().replace(/\s+/g, "-")}-link`}
						className={cn(
							"flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
							isActive
								? "bg-primary/10 text-primary font-semibold"
								: "text-gray-500 hover:bg-gray-50 hover:text-slate-800",
						)}
					>
						<span
							className="material-symbols-rounded group-hover:text-primary transition-colors"
							aria-hidden="true"
						>
							{item.icon}
						</span>
						{item.name}
						{item.badge !== undefined && item.badge > 0 && (
							<span
								className="ml-auto w-5 h-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full"
								aria-label={`${item.badge} unread`}
							>
								{item.badge}
							</span>
						)}
					</Link>
				);
			})}
		</nav>
	);

	return (
			<div className="min-h-screen bg-background flex">
				{/* Desktop Sidebar */}
				<aside
					className="w-64 h-screen bg-card border-r shadow-soft fixed left-0 top-0 z-30 hidden lg:flex flex-col p-6"
					aria-label="Sidebar"
				>
					<div className="flex items-center gap-3 mb-10 px-2">
						<div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-glow">
							<span className="material-symbols-rounded text-2xl" aria-hidden="true">
								school
							</span>
						</div>
						<h1 className="text-2xl font-bold tracking-tight text-slate-800">Abridge</h1>
					</div>
					<NavContent />
					<div className="mt-auto pt-6 border-t border-gray-100">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button
									type="button"
									className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 w-full text-left transition-colors"
									data-testid="user-menu-trigger"
								>
									<Avatar className="h-10 w-10">
										<AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
											{userInitials}
										</AvatarFallback>
									</Avatar>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-semibold truncate">{session?.name || "User"}</p>
										<p className="text-xs text-gray-500 truncate">
											{userRole?.staffRole ? `Staff (${userRole.staffRole})` : "Parent Account"}
										</p>
									</div>
									<span
										className="material-symbols-rounded ml-auto text-gray-400"
										aria-hidden="true"
									>
										expand_more
									</span>
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-56">
								<DropdownMenuLabel>
									<p className="font-medium">{session?.name || "User"}</p>
									<p className="text-xs text-muted-foreground font-normal">
										{userRole?.staffRole ? `Staff (${userRole.staffRole})` : "Parent Account"}
									</p>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={handleSignOut} data-testid="logout-button">
									<span className="material-symbols-rounded mr-2 text-base" aria-hidden="true">
										logout
									</span>
									Sign Out
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</aside>

				{/* Mobile Sidebar Overlay */}
				<div
					role="button"
					tabIndex={0}
					aria-label="Close menu"
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							setIsMobileMenuOpen(false);
						}
					}}
					className={cn(
						"fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden",
						isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none",
					)}
					onClick={() => setIsMobileMenuOpen(false)}
				/>

				{/* Mobile Sidebar */}
				<aside
					className={cn(
						"fixed inset-y-0 left-0 z-50 w-64 bg-card border-r shadow-xl transition-transform duration-300 lg:hidden",
						isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
					)}
				>
					<div className="flex flex-col h-full p-6">
						<div className="flex items-center justify-between mb-10">
							<div className="flex items-center gap-2">
								<div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
									<span className="material-symbols-rounded text-lg" aria-hidden="true">
										school
									</span>
								</div>
								<h1 className="text-xl font-bold">Abridge</h1>
							</div>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setIsMobileMenuOpen(false)}
								aria-label="Close menu"
							>
								<span className="material-symbols-rounded" aria-hidden="true">
									close
								</span>
							</Button>
						</div>
						<NavContent onClick={() => setIsMobileMenuOpen(false)} />
					</div>
				</aside>

				{/* Main Content */}
				<main
					id="main-content"
					className="flex-1 ml-0 lg:ml-64 p-6 lg:p-10 overflow-y-auto h-screen"
				>
					{/* Mobile Header */}
					<div className="lg:hidden flex justify-between items-center mb-6">
						<div className="flex items-center gap-2">
							<div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
								<span className="material-symbols-rounded text-lg" aria-hidden="true">
									school
								</span>
							</div>
							<h1 className="text-xl font-bold text-slate-800">Abridge</h1>
						</div>
						<button
							type="button"
							onClick={() => setIsMobileMenuOpen(true)}
							className="p-2 rounded-lg bg-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
							aria-label="Open navigation menu"
						>
							<span className="material-symbols-rounded text-slate-800" aria-hidden="true">
								menu
							</span>
						</button>
					</div>

					{/* Page Content */}
					{children}
				</main>
			</div>
	);
}
