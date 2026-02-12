"use client";

import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "@schoolconnect/api/router";
import type { inferRouterOutputs } from "@trpc/server";
import { Calendar, CreditCard, FileText, Loader2, Mail, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// --- Types ---
type RouterOutput = inferRouterOutputs<AppRouter>;
type SearchResultItem = RouterOutput["search"]["query"][number];

// --- Hooks ---

function useDebounce<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return debouncedValue;
}

function useOnClickOutside(
	ref: React.RefObject<HTMLElement>,
	handler: (event: MouseEvent | TouchEvent) => void,
) {
	useEffect(() => {
		const listener = (event: MouseEvent | TouchEvent) => {
			if (!ref.current || ref.current.contains(event.target as Node)) {
				return;
			}
			handler(event);
		};
		document.addEventListener("mousedown", listener);
		document.addEventListener("touchstart", listener);
		return () => {
			document.removeEventListener("mousedown", listener);
			document.removeEventListener("touchstart", listener);
		};
	}, [ref, handler]);
}

// --- Component ---

export function SearchBar() {
	const router = useRouter();
	const [query, setQuery] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const debouncedQuery = useDebounce(query, 300);

	const { data: results, isLoading } = trpc.search.query.useQuery(
		{ query: debouncedQuery, limit: 5 },
		{ enabled: debouncedQuery.length > 0 },
	);

	useOnClickOutside(containerRef, () => setIsOpen(false));

	useEffect(() => {
		if (debouncedQuery.length > 0) {
			setIsOpen(true);
		} else {
			setIsOpen(false);
		}
	}, [debouncedQuery]);

	const handleSelect = (result: SearchResultItem) => {
		setIsOpen(false);
		setQuery("");

		// Navigate based on index type
		switch (result.index) {
			case "messages":
				router.push("/dashboard/messages");
				break;
			case "events":
				router.push("/dashboard/attendance");
				break;
			case "payment_items":
				router.push("/dashboard/payments");
				break;
			default:
				router.push("/dashboard");
		}
	};

	const getIcon = (index: string) => {
		switch (index) {
			case "messages":
				return <Mail className="h-4 w-4 text-info" />;
			case "events":
				return <Calendar className="h-4 w-4 text-success" />;
			case "payment_items":
				return <CreditCard className="h-4 w-4 text-primary" />;
			default:
				return <FileText className="h-4 w-4 text-muted-foreground" />;
		}
	};

	const renderHighlight = (text: string, highlight?: string[]) => {
		if (highlight && highlight.length > 0) {
			// biome-ignore lint/security/noDangerouslySetInnerHtml: Search highlights require HTML
			return <span dangerouslySetInnerHTML={{ __html: highlight[0] }} />;
		}
		return <span className="truncate">{text}</span>;
	};

	return (
		<div ref={containerRef} className="relative w-full max-w-md">
			<div className="relative">
				<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
					<Search className="h-5 w-5 text-muted-foreground" />
				</div>
				<Input
					type="text"
					placeholder="Search..."
					className="pl-10 w-full"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onFocus={() => {
						if (query.length > 0) setIsOpen(true);
					}}
				/>
				{isLoading && (
					<div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
						<Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
					</div>
				)}
			</div>

			{isOpen && query.length > 0 && (
				<div className="absolute z-10 mt-1 w-full bg-popover shadow-lg max-h-96 rounded-md py-1 text-base ring-1 ring-border overflow-auto focus:outline-none sm:text-sm">
					{results && results.length > 0
						? results.map((result) => {
								const source = result.source as {
									subject?: string;
									title?: string;
									body?: string;
									description?: string;
								};
								const highlight = result.highlight || {};
								const title = source.subject || source.title || "Untitled";
								const body = source.body || source.description || "";

								return (
									<button
										type="button"
										key={result.id}
										className="w-full text-left cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-accent group focus:outline-none focus:bg-accent"
										onClick={() => handleSelect(result)}
									>
										<div className="flex items-start">
											<div className="flex-shrink-0 mt-0.5 mr-3">{getIcon(result.index)}</div>
											<div className="flex-1 min-w-0">
												<div className="text-sm font-medium text-foreground truncate">
													{renderHighlight(title, highlight.subject || highlight.title)}
												</div>
												<div className="text-sm text-muted-foreground line-clamp-2">
													{renderHighlight(body, highlight.body || highlight.description)}
												</div>
											</div>
										</div>
									</button>
								);
							})
						: !isLoading && (
								<div className="cursor-default select-none relative py-2 pl-3 pr-9 text-muted-foreground">
									No results found.
								</div>
							)}
				</div>
			)}
		</div>
	);
}
