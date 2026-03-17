"use client";

import { FeatureDisabled } from "@/components/feature-disabled";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeatureToggles } from "@/lib/feature-toggles";
import { trpc } from "@/lib/trpc";
import { CalendarDays, ChefHat, ClipboardList, Plus, UtensilsCrossed, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const UK_ALLERGENS = [
	"Celery",
	"Cereals",
	"Crustaceans",
	"Eggs",
	"Fish",
	"Lupin",
	"Milk",
	"Molluscs",
	"Mustard",
	"Nuts",
	"Peanuts",
	"Sesame",
	"Soya",
	"Sulphites",
] as const;

const DIETARY_NEEDS = [
	"VEGETARIAN",
	"VEGAN",
	"HALAL",
	"KOSHER",
	"GLUTEN_FREE",
	"DAIRY_FREE",
	"OTHER",
] as const;

const DIETARY_LABELS: Record<string, string> = {
	VEGETARIAN: "Vegetarian",
	VEGAN: "Vegan",
	HALAL: "Halal",
	KOSHER: "Kosher",
	GLUTEN_FREE: "Gluten Free",
	DAIRY_FREE: "Dairy Free",
	OTHER: "Other",
};

const CATEGORY_LABELS: Record<string, string> = {
	HOT_MAIN: "Hot Main",
	VEGETARIAN: "Vegetarian",
	JACKET_POTATO: "Jacket Potato",
	SANDWICH: "Sandwich",
	DESSERT: "Dessert",
};

const CATEGORY_COLORS: Record<string, string> = {
	HOT_MAIN: "bg-orange-100 text-orange-800",
	VEGETARIAN: "bg-green-100 text-green-800",
	JACKET_POTATO: "bg-yellow-100 text-yellow-800",
	SANDWICH: "bg-blue-100 text-blue-800",
	DESSERT: "bg-pink-100 text-pink-800",
};

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;

const DAY_LABELS: Record<string, string> = {
	MONDAY: "Monday",
	TUESDAY: "Tuesday",
	WEDNESDAY: "Wednesday",
	THURSDAY: "Thursday",
	FRIDAY: "Friday",
};

function getMonday(date: Date): Date {
	const d = new Date(date);
	const day = d.getDay();
	const diff = d.getDate() - day + (day === 0 ? -6 : 1);
	d.setDate(diff);
	d.setHours(0, 0, 0, 0);
	return d;
}

function formatPrice(pence: number): string {
	return `\u00A3${(pence / 100).toFixed(2)}`;
}

function ParentView() {
	const { data: children } = trpc.user.listChildren.useQuery();
	const [selectedChild, setSelectedChild] = useState<string | null>(null);

	const childId = selectedChild ?? children?.[0]?.child?.id;
	const selectedChildData = children?.find((c) => c.child.id === childId);
	const schoolId = selectedChildData?.child?.schoolId;
	const weekStarting = getMonday(new Date());

	const { data: dietaryProfile, isLoading: profileLoading } =
		trpc.mealBooking.getDietaryProfile.useQuery({ childId: childId ?? "" }, { enabled: !!childId });

	const { data: menu, isLoading: menuLoading } = trpc.mealBooking.getMenuForWeek.useQuery(
		{ schoolId: schoolId ?? "", weekStarting },
		{ enabled: !!schoolId },
	);

	const { data: bookings, isLoading: bookingsLoading } =
		trpc.mealBooking.getBookingsForChild.useQuery(
			{ childId: childId ?? "", weekStarting },
			{ enabled: !!childId },
		);

	const [allergies, setAllergies] = useState<string[]>([]);
	const [dietaryNeeds, setDietaryNeeds] = useState<string[]>([]);
	const [otherNotes, setOtherNotes] = useState("");
	const prevChildIdRef = useRef<string | null>(null);

	// Sync form state when dietary profile loads or child changes
	useEffect(() => {
		if (childId !== prevChildIdRef.current) {
			prevChildIdRef.current = childId ?? null;
		}
		if (dietaryProfile) {
			setAllergies(dietaryProfile.allergies ?? []);
			setDietaryNeeds(dietaryProfile.dietaryNeeds ?? []);
			setOtherNotes(dietaryProfile.otherNotes ?? "");
		}
	}, [dietaryProfile, childId]);

	const utils = trpc.useUtils();

	const updateProfileMutation = trpc.mealBooking.updateDietaryProfile.useMutation({
		onSuccess: () => {
			if (childId) {
				utils.mealBooking.getDietaryProfile.invalidate({ childId });
			}
		},
	});

	const bookMealMutation = trpc.mealBooking.bookMeal.useMutation({
		onSuccess: () => {
			if (childId) {
				utils.mealBooking.getBookingsForChild.invalidate({ childId, weekStarting });
			}
		},
	});

	const cancelBookingMutation = trpc.mealBooking.cancelBooking.useMutation({
		onSuccess: () => {
			if (childId) {
				utils.mealBooking.getBookingsForChild.invalidate({ childId, weekStarting });
			}
		},
	});

	if (!children?.length) {
		return <p className="text-muted-foreground">No children found.</p>;
	}

	const toggleAllergy = (allergen: string) => {
		setAllergies((prev) =>
			prev.includes(allergen) ? prev.filter((a) => a !== allergen) : [...prev, allergen],
		);
	};

	const toggleDietaryNeed = (need: string) => {
		setDietaryNeeds((prev) =>
			prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need],
		);
	};

	const optionsByDay = menu?.options?.reduce(
		(acc, opt) => {
			if (!acc[opt.day]) acc[opt.day] = [];
			acc[opt.day]?.push(opt);
			return acc;
		},
		{} as Record<string, typeof menu.options>,
	);

	const bookedOptionIds = new Set(bookings?.map((b) => b.mealOptionId));

	return (
		<div className="space-y-6">
			{children.length > 1 && (
				<div className="flex gap-2">
					{children.map((pc) => (
						<button
							key={pc.child.id}
							type="button"
							onClick={() => setSelectedChild(pc.child.id)}
							className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
								childId === pc.child.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
							}`}
						>
							{pc.child.firstName}
						</button>
					))}
				</div>
			)}

			{/* Dietary Profile */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<ClipboardList className="h-5 w-5" />
						Dietary Profile
					</CardTitle>
				</CardHeader>
				<CardContent>
					{profileLoading ? (
						<Skeleton className="h-48 w-full" />
					) : (
						<div className="space-y-4">
							<div>
								<p className="text-sm font-medium mb-2">Allergens (UK 14)</p>
								<div className="flex flex-wrap gap-2">
									{UK_ALLERGENS.map((allergen) => (
										<label key={allergen} className="flex items-center gap-1.5 text-sm">
											<input
												type="checkbox"
												checked={allergies.includes(allergen)}
												onChange={() => toggleAllergy(allergen)}
												className="rounded border-gray-300"
											/>
											{allergen}
										</label>
									))}
								</div>
							</div>

							<div>
								<p className="text-sm font-medium mb-2">Dietary Needs</p>
								<div className="flex flex-wrap gap-2">
									{DIETARY_NEEDS.map((need) => (
										<label key={need} className="flex items-center gap-1.5 text-sm">
											<input
												type="checkbox"
												checked={dietaryNeeds.includes(need)}
												onChange={() => toggleDietaryNeed(need)}
												className="rounded border-gray-300"
											/>
											{DIETARY_LABELS[need]}
										</label>
									))}
								</div>
							</div>

							<div>
								<p className="text-sm font-medium mb-2">Additional Notes</p>
								<textarea
									placeholder="Any other dietary requirements or notes..."
									maxLength={300}
									value={otherNotes}
									onChange={(e) => setOtherNotes(e.target.value)}
									className="w-full rounded-md border p-2 text-sm resize-none"
									rows={2}
								/>
							</div>

							<button
								type="button"
								onClick={() => {
									if (childId) {
										updateProfileMutation.mutate({
											childId,
											allergies,
											dietaryNeeds: dietaryNeeds as (
												| "VEGETARIAN"
												| "VEGAN"
												| "HALAL"
												| "KOSHER"
												| "GLUTEN_FREE"
												| "DAIRY_FREE"
												| "OTHER"
											)[],
											otherNotes: otherNotes || undefined,
										});
									}
								}}
								disabled={updateProfileMutation.isPending}
								className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
							>
								{updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
							</button>
						</div>
					)}
				</CardContent>
			</Card>

			{/* This Week's Menu */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<UtensilsCrossed className="h-5 w-5" />
						This Week's Menu
					</CardTitle>
				</CardHeader>
				<CardContent>
					{menuLoading ? (
						<Skeleton className="h-48 w-full" />
					) : !menu ? (
						<p className="text-sm text-muted-foreground">No menu published this week.</p>
					) : (
						<div className="space-y-4">
							{DAYS.map((day) => {
								const dayOptions = optionsByDay?.[day];
								if (!dayOptions?.length) return null;
								return (
									<div key={day}>
										<h4 className="text-sm font-semibold mb-2">{DAY_LABELS[day]}</h4>
										<div className="space-y-2">
											{dayOptions.map((opt) => {
												const isBooked = bookedOptionIds.has(opt.id);
												const dayDate = new Date(weekStarting);
												dayDate.setDate(dayDate.getDate() + DAYS.indexOf(day));
												return (
													<div
														key={opt.id}
														className="flex items-center gap-3 rounded-md border p-3"
													>
														<div className="flex-1">
															<div className="flex items-center gap-2 mb-1">
																<span className="font-medium text-sm">{opt.name}</span>
																<Badge className={CATEGORY_COLORS[opt.category] ?? ""}>
																	{CATEGORY_LABELS[opt.category] ?? opt.category}
																</Badge>
																<span className="text-sm text-muted-foreground">
																	{formatPrice(opt.priceInPence)}
																</span>
															</div>
															{opt.allergens.length > 0 && (
																<div className="flex flex-wrap gap-1">
																	{opt.allergens.map((allergen) => (
																		<Badge
																			key={allergen}
																			className={
																				allergies.includes(allergen)
																					? "bg-red-100 text-red-800"
																					: "bg-gray-100 text-gray-600"
																			}
																		>
																			{allergen}
																		</Badge>
																	))}
																</div>
															)}
														</div>
														{isBooked ? (
															<Badge className="bg-green-100 text-green-800">Booked</Badge>
														) : (
															<button
																type="button"
																onClick={() => {
																	if (childId) {
																		bookMealMutation.mutate({
																			childId,
																			mealOptionId: opt.id,
																			date: dayDate,
																		});
																	}
																}}
																disabled={bookMealMutation.isPending}
																className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
															>
																Book
															</button>
														)}
													</div>
												);
											})}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Your Bookings */}
			<Card>
				<CardHeader>
					<CardTitle>Your Bookings</CardTitle>
				</CardHeader>
				<CardContent>
					{bookingsLoading ? (
						<Skeleton className="h-24 w-full" />
					) : !bookings?.length ? (
						<p className="text-sm text-muted-foreground">No bookings this week.</p>
					) : (
						<div className="space-y-2">
							{bookings.map((booking) => (
								<div key={booking.id} className="flex items-center gap-3 rounded-md border p-3">
									<div className="flex-1">
										<p className="text-sm font-medium">{booking.mealOption.name}</p>
										<p className="text-xs text-muted-foreground">
											{new Date(booking.date).toLocaleDateString("en-GB", {
												weekday: "long",
												day: "numeric",
												month: "short",
											})}
										</p>
									</div>
									<button
										type="button"
										onClick={() =>
											cancelBookingMutation.mutate({
												bookingId: booking.id,
											})
										}
										disabled={cancelBookingMutation.isPending}
										className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
									>
										Cancel
									</button>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

interface MenuOption {
	day: (typeof DAYS)[number];
	name: string;
	category: "HOT_MAIN" | "VEGETARIAN" | "JACKET_POTATO" | "SANDWICH" | "DESSERT";
	allergens: string[];
	priceInPence: number;
}

function StaffView({ schoolId }: { schoolId: string }) {
	const [menuWeek, setMenuWeek] = useState("");
	const [menuOptions, setMenuOptions] = useState<MenuOption[]>([]);
	const [newOptionDay, setNewOptionDay] = useState<(typeof DAYS)[number]>("MONDAY");
	const [newOptionName, setNewOptionName] = useState("");
	const [newOptionCategory, setNewOptionCategory] = useState<MenuOption["category"]>("HOT_MAIN");
	const [newOptionAllergens, setNewOptionAllergens] = useState<string[]>([]);
	const [newOptionPrice, setNewOptionPrice] = useState("");

	const [kitchenDate, setKitchenDate] = useState(() => {
		const d = new Date();
		return d.toISOString().split("T")[0];
	});

	const utils = trpc.useUtils();

	const createMenuMutation = trpc.mealBooking.createMenu.useMutation({
		onSuccess: () => {
			setMenuOptions([]);
			setMenuWeek("");
			utils.mealBooking.listMenus.invalidate({ schoolId });
		},
	});

	const publishMenuMutation = trpc.mealBooking.publishMenu.useMutation({
		onSuccess: () => {
			utils.mealBooking.listMenus.invalidate({ schoolId });
		},
	});

	const { data: kitchenSummary, isLoading: kitchenLoading } =
		trpc.mealBooking.getKitchenSummary.useQuery(
			{
				schoolId,
				date: new Date(`${kitchenDate}T00:00:00`),
			},
			{ enabled: !!kitchenDate },
		);

	const { data: menus, isLoading: menusLoading } = trpc.mealBooking.listMenus.useQuery({
		schoolId,
	});

	const addOption = () => {
		if (!newOptionName.trim()) return;
		const priceInPence = Math.round(Number.parseFloat(newOptionPrice || "0") * 100);
		setMenuOptions((prev) => [
			...prev,
			{
				day: newOptionDay,
				name: newOptionName.trim(),
				category: newOptionCategory,
				allergens: newOptionAllergens,
				priceInPence,
			},
		]);
		setNewOptionName("");
		setNewOptionAllergens([]);
		setNewOptionPrice("");
	};

	const removeOption = (index: number) => {
		setMenuOptions((prev) => prev.filter((_, i) => i !== index));
	};

	const toggleNewOptionAllergen = (allergen: string) => {
		setNewOptionAllergens((prev) =>
			prev.includes(allergen) ? prev.filter((a) => a !== allergen) : [...prev, allergen],
		);
	};

	return (
		<div className="space-y-6">
			{/* Create Menu */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Plus className="h-5 w-5" />
						Create Menu
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div>
							<label className="text-sm font-medium" htmlFor="menu-week">
								Week Starting (Monday)
							</label>
							<input
								id="menu-week"
								type="date"
								value={menuWeek}
								onChange={(e) => setMenuWeek(e.target.value)}
								className="mt-1 block w-full rounded-md border p-2 text-sm"
							/>
						</div>

						<div className="rounded-md border p-4 space-y-3">
							<p className="text-sm font-medium">Add Option</p>
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
								<div>
									<label className="text-xs text-muted-foreground" htmlFor="opt-day">
										Day
									</label>
									<select
										id="opt-day"
										value={newOptionDay}
										onChange={(e) => setNewOptionDay(e.target.value as (typeof DAYS)[number])}
										className="mt-1 block w-full rounded-md border p-2 text-sm"
									>
										{DAYS.map((day) => (
											<option key={day} value={day}>
												{DAY_LABELS[day]}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="text-xs text-muted-foreground" htmlFor="opt-name">
										Name
									</label>
									<input
										id="opt-name"
										type="text"
										value={newOptionName}
										onChange={(e) => setNewOptionName(e.target.value)}
										placeholder="e.g. Fish Fingers"
										className="mt-1 block w-full rounded-md border p-2 text-sm"
									/>
								</div>
								<div>
									<label className="text-xs text-muted-foreground" htmlFor="opt-category">
										Category
									</label>
									<select
										id="opt-category"
										value={newOptionCategory}
										onChange={(e) => setNewOptionCategory(e.target.value as MenuOption["category"])}
										className="mt-1 block w-full rounded-md border p-2 text-sm"
									>
										{Object.entries(CATEGORY_LABELS).map(([val, label]) => (
											<option key={val} value={val}>
												{label}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="text-xs text-muted-foreground" htmlFor="opt-price">
										Price (\u00A3)
									</label>
									<input
										id="opt-price"
										type="number"
										step="0.01"
										min="0"
										value={newOptionPrice}
										onChange={(e) => setNewOptionPrice(e.target.value)}
										placeholder="2.50"
										className="mt-1 block w-full rounded-md border p-2 text-sm"
									/>
								</div>
							</div>

							<div>
								<p className="text-xs text-muted-foreground mb-1">Allergens</p>
								<div className="flex flex-wrap gap-2">
									{UK_ALLERGENS.map((allergen) => (
										<label key={allergen} className="flex items-center gap-1 text-xs">
											<input
												type="checkbox"
												checked={newOptionAllergens.includes(allergen)}
												onChange={() => toggleNewOptionAllergen(allergen)}
												className="rounded border-gray-300"
											/>
											{allergen}
										</label>
									))}
								</div>
							</div>

							<button
								type="button"
								onClick={addOption}
								disabled={!newOptionName.trim()}
								className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
							>
								Add Option
							</button>
						</div>

						{menuOptions.length > 0 && (
							<div className="space-y-2">
								<p className="text-sm font-medium">Menu Options ({menuOptions.length})</p>
								{DAYS.map((day) => {
									const dayOpts = menuOptions.filter((o) => o.day === day);
									if (!dayOpts.length) return null;
									return (
										<div key={day}>
											<p className="text-xs font-semibold text-muted-foreground mb-1">
												{DAY_LABELS[day]}
											</p>
											{dayOpts.map((opt, idx) => {
												const globalIdx = menuOptions.indexOf(opt);
												return (
													<div
														key={`${day}-${idx}`}
														className="flex items-center gap-2 rounded-md border p-2 mb-1"
													>
														<div className="flex-1 flex items-center gap-2">
															<span className="text-sm">{opt.name}</span>
															<Badge className={CATEGORY_COLORS[opt.category] ?? ""}>
																{CATEGORY_LABELS[opt.category]}
															</Badge>
															<span className="text-xs text-muted-foreground">
																{formatPrice(opt.priceInPence)}
															</span>
															{opt.allergens.map((a) => (
																<Badge key={a} className="bg-gray-100 text-gray-600">
																	{a}
																</Badge>
															))}
														</div>
														<button
															type="button"
															onClick={() => removeOption(globalIdx)}
															className="text-red-500 hover:text-red-700"
														>
															<X className="h-4 w-4" />
														</button>
													</div>
												);
											})}
										</div>
									);
								})}
							</div>
						)}

						<button
							type="button"
							onClick={() => {
								if (menuWeek && menuOptions.length > 0) {
									createMenuMutation.mutate({
										schoolId,
										weekStarting: new Date(`${menuWeek}T00:00:00`),
										options: menuOptions,
									});
								}
							}}
							disabled={!menuWeek || menuOptions.length === 0 || createMenuMutation.isPending}
							className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
						>
							{createMenuMutation.isPending ? "Creating..." : "Create Menu"}
						</button>
					</div>
				</CardContent>
			</Card>

			{/* Kitchen Dashboard */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<ChefHat className="h-5 w-5" />
						Kitchen Dashboard
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div>
							<label className="text-sm font-medium" htmlFor="kitchen-date">
								Date
							</label>
							<input
								id="kitchen-date"
								type="date"
								value={kitchenDate}
								onChange={(e) => setKitchenDate(e.target.value)}
								className="mt-1 block w-full rounded-md border p-2 text-sm max-w-xs"
							/>
						</div>

						{kitchenLoading ? (
							<Skeleton className="h-24 w-full" />
						) : !kitchenSummary?.length ? (
							<p className="text-sm text-muted-foreground">No bookings for this date.</p>
						) : (
							<div className="space-y-2">
								{kitchenSummary.map((item) => (
									<div
										key={item.mealOptionId}
										className="flex items-center justify-between rounded-md border p-3"
									>
										<span className="text-sm">{item.mealOptionId}</span>
										<Badge className="bg-blue-100 text-blue-800">{item._count.id} booked</Badge>
									</div>
								))}
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Manage Menus */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<CalendarDays className="h-5 w-5" />
						Manage Menus
					</CardTitle>
				</CardHeader>
				<CardContent>
					{menusLoading ? (
						<Skeleton className="h-48 w-full" />
					) : !menus?.length ? (
						<p className="text-sm text-muted-foreground">No menus created yet.</p>
					) : (
						<div className="space-y-2">
							{menus.map((menu) => (
								<div key={menu.id} className="flex items-center gap-3 rounded-md border p-3">
									<div className="flex-1">
										<p className="text-sm font-medium">
											Week of{" "}
											{new Date(menu.weekStarting).toLocaleDateString("en-GB", {
												day: "numeric",
												month: "short",
												year: "numeric",
											})}
										</p>
										<p className="text-xs text-muted-foreground">{menu._count.options} options</p>
									</div>
									{menu.publishedAt ? (
										<Badge className="bg-green-100 text-green-800">Published</Badge>
									) : (
										<button
											type="button"
											onClick={() =>
												publishMenuMutation.mutate({
													schoolId,
													menuId: menu.id,
												})
											}
											disabled={publishMenuMutation.isPending}
											className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
										>
											Publish
										</button>
									)}
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

export default function MealsPage() {
	const features = useFeatureToggles();
	const { data: session } = trpc.auth.getSession.useQuery();
	const isStaff = !!session?.staffRole && !!session?.schoolId;

	if (!features.mealBookingEnabled) {
		return <FeatureDisabled featureName="Meal Booking" />;
	}

	return (
		<PageShell maxWidth="4xl">
			<PageHeader
				icon={UtensilsCrossed}
				title="Meals"
				description={isStaff ? "Manage school meal menus" : "Book meals and manage dietary needs"}
			/>
			{isStaff && session.schoolId ? <StaffView schoolId={session.schoolId} /> : <ParentView />}
		</PageShell>
	);
}
