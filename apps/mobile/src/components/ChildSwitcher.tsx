import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

interface ChildOption {
	id: string;
	firstName: string;
	lastName: string;
	yearGroup?: string | null;
	className?: string | null;
}

interface ChildSwitcherProps {
	items: ChildOption[];
	selectedChildId: string;
	onSelect: (childId: string) => void;
	onViewProfile?: (childId: string) => void;
}

function getInitials(firstName: string, lastName: string): string {
	return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

export function ChildSwitcher({ items, selectedChildId, onSelect, onViewProfile }: ChildSwitcherProps) {
	if (items.length === 0) return null;

	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			accessibilityLabel="Switch Child"
			contentContainerStyle={{ gap: 8, paddingHorizontal: 24, paddingBottom: 8 }}
		>
			{items.map((child) => {
				const isActive = child.id === selectedChildId;
				const classLabel = [child.yearGroup, child.className].filter(Boolean).join(" ");

				return (
					<Pressable
						key={child.id}
						testID={`child-${child.firstName.toLowerCase()}`}
						onPress={() => {
						if (isActive && onViewProfile) {
							onViewProfile(child.id);
						} else {
							onSelect(child.id);
						}
					}}
						className={`flex-row items-center gap-2 rounded-full px-3 py-2 ${
							isActive ? "bg-primary" : "bg-neutral-surface dark:bg-surface-dark"
						}`}
					>
						<View
							className={`w-7 h-7 rounded-full items-center justify-center ${
								isActive ? "bg-white/20" : "bg-primary/10"
							}`}
						>
							<Text
								className={`text-xs font-sans-bold ${isActive ? "text-white" : "text-primary"}`}
							>
								{getInitials(child.firstName, child.lastName)}
							</Text>
						</View>
						<Text
							className={`text-sm font-sans-semibold ${
								isActive ? "text-white" : "text-foreground dark:text-white"
							}`}
						>
							{child.firstName}
						</Text>
						{classLabel ? (
							<Text
								className={`text-xs font-sans ${isActive ? "text-white/70" : "text-text-muted"}`}
							>
								{classLabel}
							</Text>
						) : null}
					</Pressable>
				);
			})}
		</ScrollView>
	);
}
