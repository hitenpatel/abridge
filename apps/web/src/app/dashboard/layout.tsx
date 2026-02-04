"use client";

import { SearchBar } from "@/components/search/search-bar";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
	Calendar,
	CreditCard,
	FileText,
	LayoutDashboard,
	LogOut,
	Menu,
	MessageSquare,
	School,
	User,
	X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface SidebarProps {
	isOpen: boolean;
	setIsOpen: (open: boolean) => void;
}

function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
	const pathname = usePathname();

	const navItems = [
		{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
		{ name: "Attendance", href: "/dashboard/attendance", icon: School },
		{ name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
		{ name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
		{ name: "Forms", href: "/dashboard/forms", icon: FileText },
		{ name: "Payments", href: "/dashboard/payments", icon: CreditCard },
	];

	return (
		<>
			{/* Mobile Overlay */}
			<div
				role="button"
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						setIsOpen(false);
					}
				}}
				className={cn(
					"fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden cursor-pointer",
					isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
				)}
				onClick={() => setIsOpen(false)}
			/>

			{/* Sidebar */}
			<aside
				className={cn(
					"fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border shadow-xl transition-transform duration-300 lg:translate-x-0 lg:static lg:shadow-none",
					isOpen ? "translate-x-0" : "-translate-x-full",
				)}
			>
				<div className="flex flex-col h-full">
					{/* Header */}
					<div className="flex items-center justify-between h-16 px-6 border-b border-border">
						<div className="flex items-center gap-2">
							<div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
								<School className="w-5 h-5 text-white" />
							</div>
							<span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
								SchoolConnect
							</span>
						</div>
						<Button
							variant="ghost"
							size="icon"
							className="lg:hidden"
							onClick={() => setIsOpen(false)}
						>
							<X className="w-5 h-5" />
						</Button>
					</div>

					{/* Navigation */}
					<nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
						{navItems.map((item) => {
							const isActive = pathname === item.href;
							const Icon = item.icon;
							return (
								<Link
									key={item.href}
									href={item.href}
									onClick={() => setIsOpen(false)}
									className={cn(
										"flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
										isActive
											? "bg-primary/10 text-primary shadow-sm"
											: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
									)}
								>
									<Icon
										className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")}
									/>
									{item.name}
								</Link>
							);
						})}
					</nav>

					{/* Footer */}
					<div className="p-4 border-t border-border">
						<div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
							<div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
								<User className="w-4 h-4 text-primary" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium truncate">User Account</p>
								<p className="text-xs text-muted-foreground truncate">View Profile</p>
							</div>
						</div>
					</div>
				</div>
			</aside>
		</>
	);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const { data: session } = authClient.useSession();

	return (
		<div className="min-h-screen bg-background flex">
			<Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

			<div className="flex-1 flex flex-col min-w-0">
				{/* Top Header */}
				<header className="sticky top-0 z-30 h-16 bg-card/80 backdrop-blur-md border-b border-border px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
					<Button
						variant="ghost"
						size="icon"
						className="lg:hidden -ml-2"
						onClick={() => setIsSidebarOpen(true)}
					>
						<Menu className="w-5 h-5" />
					</Button>

					<div className="flex-1 max-w-xl">
						<SearchBar />
					</div>

					<div className="flex items-center gap-4">
						{/* Add Notifications or other header items here */}
						{session && (
							<span className="hidden sm:inline-block text-sm font-medium text-foreground">
								{session.user.name}
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
