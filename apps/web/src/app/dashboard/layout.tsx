"use client";

import { SearchBar } from "@/components/search/search-bar";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
	Calendar,
	CreditCard,
	FileText,
	LayoutDashboard,
	type LucideIcon,
	Menu,
	MessageSquare,
	School,
	ShieldCheck,
	User,
	Users,
	X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
	name: string;
	href: string;
	icon: LucideIcon;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const { data: session } = trpc.auth.getSession.useQuery();

	const userRole = session
		? {
				isParent: session.isParent,
				staffRole: session.staffRole,
			}
		: null;

	const parentNav: NavItem[] = [
		{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
		{ name: "Attendance", href: "/dashboard/attendance", icon: School },
		{ name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
		{ name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
		{ name: "Forms", href: "/dashboard/forms", icon: FileText },
		{ name: "Payments", href: "/dashboard/payments", icon: CreditCard },
	];

	const staffNav: NavItem[] = [
		{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
		{ name: "Attendance", href: "/dashboard/attendance", icon: Users },
		{ name: "Payments", href: "/dashboard/payments", icon: CreditCard },
		{ name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
	];

	const adminNav: NavItem[] = [
		{ name: "Staff Management", href: "/dashboard/staff", icon: ShieldCheck },
	];

	let navItems: NavItem[] = [];
	if (userRole?.staffRole === "ADMIN") {
		navItems = [...staffNav, ...adminNav];
	} else if (userRole?.staffRole) {
		navItems = staffNav;
	} else {
		navItems = parentNav;
	}

	const NavContent = ({ onClick }: { onClick?: () => void }) => (
		<nav className="flex-1 px-4 py-6 space-y-1">
			{navItems.map((item) => {
				const isActive = pathname === item.href;
				const Icon = item.icon;
				return (
					<Link
						key={item.href}
						href={item.href}
						onClick={onClick}
						className={cn(
							"flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
							isActive
								? "bg-primary/10 text-primary shadow-sm"
								: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
						)}
					>
						<Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
						{item.name}
					</Link>
				);
			})}
		</nav>
	);

	return (
		<div className="min-h-screen bg-background flex">
			{/* Desktop Sidebar */}
			<aside className="w-64 bg-card border-r border-border hidden lg:flex flex-col h-screen sticky top-0">
				<div className="flex items-center h-16 px-6 border-b border-border">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
							<School className="w-5 h-5 text-white" />
						</div>
						<span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
							SchoolConnect
						</span>
					</div>
				</div>
				<NavContent />
				<div className="p-4 border-t border-border">
					<div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
						<div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
							<User className="w-4 h-4 text-primary" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-sm font-medium truncate">{session?.name || "User"}</p>
							<p className="text-xs text-muted-foreground truncate">
								{userRole?.staffRole ? `Staff (${userRole.staffRole})` : "Parent"}
							</p>
						</div>
					</div>
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
					"fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border shadow-xl transition-transform duration-300 lg:hidden",
					isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
				)}
			>
				<div className="flex flex-col h-full">
					<div className="flex items-center justify-between h-16 px-6 border-b border-border">
						<div className="flex items-center gap-2">
							<div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
								<School className="w-5 h-5 text-white" />
							</div>
							<span className="text-lg font-bold">SchoolConnect</span>
						</div>
						<Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
							<X className="w-5 h-5" />
						</Button>
					</div>
					<NavContent onClick={() => setIsMobileMenuOpen(false)} />
				</div>
			</aside>

			<div className="flex-1 flex flex-col min-w-0">
				{/* Top Header */}
				<header className="sticky top-0 z-30 h-16 bg-card/80 backdrop-blur-md border-b border-border px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
					<Button
						variant="ghost"
						size="icon"
						className="lg:hidden -ml-2"
						onClick={() => setIsMobileMenuOpen(true)}
					>
						<Menu className="w-5 h-5" />
					</Button>

					<div className="flex-1 max-w-xl">
						<SearchBar />
					</div>

					<div className="flex items-center gap-4">
						{session && (
							<span className="hidden sm:inline-block text-sm font-medium text-foreground">
								{session.name}
							</span>
						)}
					</div>
				</header>

				{/* Main Content */}
				<main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
					<div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
						{children}
					</div>
				</main>
			</div>
		</div>
	);
}
