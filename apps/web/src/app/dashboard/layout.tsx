"use client";

import { OnboardingDialog } from "@/components/onboarding-dialog";
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
import { navIcons } from "@/lib/nav-icons";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Bell, GraduationCap, LogOut, Menu, X } from "lucide-react";
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
		| "clubBookingEnabled"
		| "reportCardsEnabled"
		| "communityHubEnabled"
		| "homeworkEnabled"
		| "readingDiaryEnabled"
		| "visitorManagementEnabled"
		| "misIntegrationEnabled"
		| "achievementsEnabled"
		| "galleryEnabled"
		| "progressSummariesEnabled"
		| "liveChatEnabled"
		| "studentPortalEnabled";
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	const { data: session } = trpc.auth.getSession.useQuery();

	const isParent = !session?.staffRole;

	return (
		<FeatureToggleProvider schoolId={session?.schoolId ?? undefined}>
			<DashboardLayoutInner session={session ?? undefined}>{children}</DashboardLayoutInner>
			{session && <OnboardingDialog isParent={isParent} />}
		</FeatureToggleProvider>
	);
}

function NotificationBell() {
	const { data: unread } = trpc.notification.unreadCount.useQuery(undefined, {
		refetchInterval: 30000,
	});
	const { data: notifications } = trpc.notification.list.useQuery({ limit: 10 });
	const utils = trpc.useUtils();
	const markAllRead = trpc.notification.markAllAsRead.useMutation({
		onSuccess: () => {
			utils.notification.unreadCount.invalidate();
			utils.notification.list.invalidate();
		},
	});
	const [open, setOpen] = useState(false);
	const count = unread?.count ?? 0;

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="relative flex items-center gap-2 p-2 rounded-xl hover:bg-orange-50/40 w-full text-left transition-colors mb-2"
					aria-label={`Notifications${count > 0 ? `, ${count} unread` : ""}`}
					data-testid="notification-bell"
				>
					<Bell className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
					<span className="text-sm font-medium text-foreground">Notifications</span>
					{count > 0 && (
						<span className="ml-auto bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
							{count > 99 ? "99+" : count}
						</span>
					)}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
				<DropdownMenuLabel className="flex items-center justify-between">
					<span>Notifications</span>
					{count > 0 && (
						<button
							type="button"
							onClick={() => markAllRead.mutate()}
							className="text-xs text-primary hover:underline"
						>
							Mark all read
						</button>
					)}
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{notifications?.items.length === 0 ? (
					<div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
				) : (
					notifications?.items.map((n) => (
						<DropdownMenuItem key={n.id} asChild>
							<Link
								href={"/dashboard/messages"}
								className={cn("flex flex-col items-start gap-1 p-3", !n.openedAt && "bg-primary/5")}
							>
								<p className="text-sm font-medium line-clamp-1">{n.message.subject}</p>
								<p className="text-xs text-muted-foreground line-clamp-1">
									{n.message.body?.slice(0, 80)}
								</p>
								<p className="text-xs text-muted-foreground">
									{new Date(n.createdAt).toLocaleDateString("en-GB", {
										day: "numeric",
										month: "short",
										hour: "2-digit",
										minute: "2-digit",
									})}
								</p>
							</Link>
						</DropdownMenuItem>
					))
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function DashboardLayoutInner({
	session,
	children,
}: {
	session:
		| { name?: string; isParent?: boolean; staffRole?: string | null; schoolId?: string | null }
		| undefined;
	children: React.ReactNode;
}) {
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
			name: "Clubs",
			href: "/dashboard/clubs",
			icon: "sports_soccer",
			featureKey: "clubBookingEnabled",
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
		{
			name: "Homework",
			href: "/dashboard/homework",
			icon: "menu_book",
			featureKey: "homeworkEnabled",
		},
		{
			name: "Reading",
			href: "/dashboard/reading",
			icon: "auto_stories",
			featureKey: "readingDiaryEnabled",
		},
		{
			name: "Achievements",
			href: "/dashboard/achievements",
			icon: "emoji_events",
			featureKey: "achievementsEnabled",
		},
		{
			name: "Gallery",
			href: "/dashboard/gallery",
			icon: "photo_library",
			featureKey: "galleryEnabled",
		},
		{
			name: "Progress",
			href: "/dashboard/progress",
			icon: "insights",
			featureKey: "progressSummariesEnabled",
		},
		{
			name: "Timetable",
			href: "/dashboard/timetable",
			icon: "schedule",
		},
		{
			name: "Chat",
			href: "/dashboard/chat",
			icon: "chat",
			featureKey: "liveChatEnabled",
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
			name: "Clubs",
			href: "/dashboard/clubs",
			icon: "sports_soccer",
			featureKey: "clubBookingEnabled",
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
		{
			name: "Homework",
			href: "/dashboard/homework",
			icon: "menu_book",
			featureKey: "homeworkEnabled",
		},
		{
			name: "Reading",
			href: "/dashboard/reading",
			icon: "auto_stories",
			featureKey: "readingDiaryEnabled",
		},
		{
			name: "Visitors",
			href: "/dashboard/visitors",
			icon: "badge",
			featureKey: "visitorManagementEnabled",
		},
		{
			name: "Awards",
			href: "/dashboard/achievements",
			icon: "emoji_events",
			featureKey: "achievementsEnabled",
		},
		{
			name: "Gallery",
			href: "/dashboard/gallery",
			icon: "photo_library",
			featureKey: "galleryEnabled",
		},
		{
			name: "Progress",
			href: "/dashboard/progress",
			icon: "insights",
			featureKey: "progressSummariesEnabled",
		},
		{
			name: "Timetable",
			href: "/dashboard/timetable",
			icon: "schedule",
		},
		{
			name: "Chat",
			href: "/dashboard/chat",
			icon: "chat",
			featureKey: "liveChatEnabled",
		},
		{ name: "Settings", href: "/dashboard/settings", icon: "settings" },
	];

	const adminNav: NavItem[] = [
		{ name: "Staff Management", href: "/dashboard/staff", icon: "shield_person" },
		{
			name: "MIS Integration",
			href: "/dashboard/mis",
			icon: "database",
			featureKey: "misIntegrationEnabled",
		},
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
								? "bg-primary/10 text-foreground font-semibold border-l-[3px] border-primary"
								: "text-muted-foreground hover:bg-orange-50/40 hover:text-foreground",
						)}
					>
						{(() => {
							const Icon = navIcons[item.icon];
							return Icon ? (
								<Icon
									className="w-5 h-5 group-hover:text-primary transition-colors"
									aria-hidden="true"
								/>
							) : null;
						})()}
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
		<div className="min-h-screen bg-background sanctuary-gradient flex">
			{/* Desktop Sidebar */}
			<aside
				className="w-64 h-screen bg-white/85 backdrop-blur-xl border-r border-white/40 shadow-sanctuary fixed left-0 top-0 z-30 hidden lg:flex flex-col p-6 dark:bg-card/85 dark:border-white/10"
				aria-label="Sidebar"
			>
				<div className="flex items-center gap-3 mb-10 px-2">
					<div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-glow">
						<GraduationCap className="w-6 h-6" aria-hidden="true" />
					</div>
					<h1 className="text-2xl font-bold tracking-tight text-foreground">Abridge</h1>
				</div>
				<NavContent />
				<div className="mt-auto pt-6 border-t border-orange-100/50">
					<NotificationBell />
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								className="flex items-center gap-3 p-2 rounded-xl hover:bg-orange-50/40 w-full text-left transition-colors"
								data-testid="user-menu-trigger"
							>
								<Avatar className="h-10 w-10">
									<AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
										{userInitials}
									</AvatarFallback>
								</Avatar>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-semibold truncate">{session?.name || "User"}</p>
									<p className="text-xs text-muted-foreground truncate">
										{userRole?.staffRole ? `Staff (${userRole.staffRole})` : "Parent Account"}
									</p>
								</div>
								<span className="ml-auto text-muted-foreground text-sm" aria-hidden="true">
									&#9662;
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
								<LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
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
								<GraduationCap className="w-5 h-5" aria-hidden="true" />
							</div>
							<h1 className="text-xl font-bold">Abridge</h1>
						</div>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setIsMobileMenuOpen(false)}
							aria-label="Close menu"
						>
							<X className="w-5 h-5" />
						</Button>
					</div>
					<NavContent onClick={() => setIsMobileMenuOpen(false)} />
				</div>
			</aside>

			{/* Main Content */}
			<main id="main-content" className="flex-1 ml-0 lg:ml-64 p-6 lg:p-10 overflow-y-auto h-screen">
				{/* Mobile Header */}
				<div className="lg:hidden flex justify-between items-center mb-6">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
							<GraduationCap className="w-5 h-5" aria-hidden="true" />
						</div>
						<h1 className="text-xl font-bold text-foreground">Abridge</h1>
					</div>
					<button
						type="button"
						onClick={() => setIsMobileMenuOpen(true)}
						className="p-2 rounded-lg bg-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
						aria-label="Open navigation menu"
					>
						<Menu className="w-5 h-5 text-foreground" aria-hidden="true" />
					</button>
				</div>

				{/* Page Content */}
				{children}
			</main>
		</div>
	);
}
