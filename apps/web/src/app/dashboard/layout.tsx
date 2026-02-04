"use client";

import { SearchBar } from "@/components/search/search-bar";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const { data: session } = authClient.useSession();

	const navItems = [
		{ name: "Dashboard", href: "/dashboard" },
		{ name: "Attendance", href: "/dashboard/attendance" },
		{ name: "Calendar", href: "/dashboard/calendar" },
		{ name: "Messages", href: "/dashboard/messages" },
		{ name: "Forms", href: "/dashboard/forms" },
		{ name: "Payments", href: "/dashboard/payments" },
	];

	return (
		<div className="min-h-screen bg-gray-50">
			<nav className="bg-white border-b border-gray-200 shadow-sm">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between h-16">
						<div className="flex">
							<div className="flex-shrink-0 flex items-center">
								<span className="text-xl font-bold text-primary-600">SchoolConnect</span>
							</div>
							<div className="hidden sm:ml-6 sm:flex sm:space-x-8">
								{navItems.map((item) => {
									const isActive = pathname === item.href;
									return (
										<Link
											key={item.href}
											href={item.href}
											className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
												isActive
													? "border-primary-500 text-gray-900"
													: "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
											}`}
										>
											{item.name}
										</Link>
									);
								})}
							</div>
						</div>
						<div className="flex items-center gap-4">
							<div className="w-72">
								<SearchBar />
							</div>
							{session && <span className="text-sm text-gray-500">{session.user.name}</span>}
						</div>
					</div>
				</div>
			</nav>
			<main className="py-6">{children}</main>
		</div>
	);
}
