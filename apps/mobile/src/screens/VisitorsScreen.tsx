import { MaterialIcons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	FlatList,
	Pressable,
	RefreshControl,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trpc } from "../lib/trpc";

const PURPOSES = [
	{ key: "MEETING", label: "Meeting", icon: "groups" as const },
	{ key: "MAINTENANCE", label: "Maintenance", icon: "build" as const },
	{ key: "DELIVERY", label: "Delivery", icon: "local-shipping" as const },
	{ key: "VOLUNTEERING", label: "Volunteering", icon: "volunteer-activism" as const },
	{ key: "INSPECTION", label: "Inspection", icon: "verified" as const },
	{ key: "PARENT_VISIT", label: "Parent Visit", icon: "family-restroom" as const },
	{ key: "CONTRACTOR", label: "Contractor", icon: "engineering" as const },
	{ key: "OTHER", label: "Other", icon: "more-horiz" as const },
] as const;

type Purpose = (typeof PURPOSES)[number]["key"];

interface OnSiteVisitor {
	id: string;
	signInAt: Date;
	purpose: string;
	badgeNumber: string | null;
	visitor: {
		id: string;
		name: string;
		organisation: string | null;
	};
}

function getPurposeLabel(purpose: string): string {
	return PURPOSES.find((p) => p.key === purpose)?.label ?? purpose.replace(/_/g, " ");
}

function formatTime(date: Date): string {
	return new Date(date).toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function VisitorsScreen() {
	const insets = useSafeAreaInsets();
	const { data: session } = trpc.auth.getSession.useQuery();
	const schoolId = session?.schoolId;

	const [name, setName] = useState("");
	const [purpose, setPurpose] = useState<Purpose>("MEETING");
	const [badgeNumber, setBadgeNumber] = useState("");
	const [searchQuery, setSearchQuery] = useState("");

	const utils = trpc.useUtils();

	const {
		data: onSiteVisitors,
		isLoading: isLoadingOnSite,
		refetch: refetchOnSite,
		isRefetching,
	} = trpc.visitor.getOnSite.useQuery({ schoolId: schoolId as string }, { enabled: !!schoolId });

	const { data: searchResults } = trpc.visitor.searchVisitors.useQuery(
		{ schoolId: schoolId as string, query: searchQuery },
		{ enabled: !!schoolId && searchQuery.length >= 2 },
	);

	const signInMutation = trpc.visitor.signIn.useMutation({
		onSuccess: (result) => {
			setName("");
			setBadgeNumber("");
			setSearchQuery("");
			utils.visitor.getOnSite.invalidate();
			if (result.dbsWarning) {
				Alert.alert(
					"DBS Warning",
					"This visitor does not have a valid DBS check on file for volunteering.",
				);
			} else {
				Alert.alert("Signed In", "Visitor has been signed in successfully");
			}
		},
		onError: (error) => {
			Alert.alert("Error", error.message);
		},
	});

	const signOutMutation = trpc.visitor.signOut.useMutation({
		onSuccess: () => {
			utils.visitor.getOnSite.invalidate();
		},
		onError: (error) => {
			Alert.alert("Error", error.message);
		},
	});

	const onRefresh = useCallback(() => {
		refetchOnSite();
	}, [refetchOnSite]);

	const handleSignIn = () => {
		if (!schoolId || !name.trim()) {
			Alert.alert("Error", "Please enter the visitor's name");
			return;
		}
		signInMutation.mutate({
			schoolId,
			name: name.trim(),
			purpose,
			badgeNumber: badgeNumber.trim() || undefined,
		});
	};

	const handleSignOut = (logId: string, visitorName: string) => {
		if (!schoolId) return;
		Alert.alert("Sign Out", `Sign out ${visitorName}?`, [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Sign Out",
				onPress: () => signOutMutation.mutate({ schoolId, logId }),
			},
		]);
	};

	const handleSelectSearchResult = (visitorName: string) => {
		setName(visitorName);
		setSearchQuery("");
	};

	const onSiteCount = onSiteVisitors?.length ?? 0;

	if (!schoolId) {
		return (
			<View className="flex-1 bg-background items-center justify-center">
				<ActivityIndicator size="large" color="#f56e3d" />
			</View>
		);
	}

	return (
		<View className="flex-1 bg-background">
			<ScrollView
				className="flex-1"
				contentContainerStyle={{ paddingBottom: 100 }}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor="#f56e3d" />
				}
			>
				{/* Header */}
				<View className="px-6 pb-4" style={{ paddingTop: insets.top + 8 }}>
					<View className="flex-row items-center justify-between">
						<View>
							<Text className="text-3xl font-sans-extrabold text-foreground dark:text-white tracking-tight">
								Visitors
							</Text>
							<Text className="text-sm font-sans text-text-muted mt-1">
								Manage visitor sign-in & sign-out
							</Text>
						</View>
						<View
							className="bg-primary/10 rounded-full px-3 py-1.5"
							accessibilityLabel="On-site count"
						>
							<Text className="text-primary font-sans-bold text-sm">{onSiteCount} on-site</Text>
						</View>
					</View>
				</View>

				{/* Sign-In Form */}
				<View
					className="mx-6 bg-white dark:bg-surface-dark rounded-3xl p-5 mb-6"
					accessibilityLabel="Sign In Visitor"
				>
					<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted mb-4">
						Sign In Visitor
					</Text>

					{/* Name Input with Search */}
					<View className="mb-3">
						<TextInput
							className="bg-background dark:bg-white/5 rounded-2xl py-4 px-5 text-foreground dark:text-white font-sans"
							placeholder="Visitor name"
							placeholderTextColor="#96867f"
							accessibilityLabel="Visitor Name"
							testID="visitor-name-input"
							value={name}
							onChangeText={(text) => {
								setName(text);
								setSearchQuery(text);
							}}
						/>
						{/* Search Results Dropdown */}
						{searchResults && searchResults.length > 0 && searchQuery.length >= 2 && (
							<View className="bg-white dark:bg-surface-dark rounded-xl mt-1 border border-gray-200 dark:border-white/10 overflow-hidden">
								{searchResults.slice(0, 5).map((visitor) => (
									<Pressable
										key={visitor.id}
										onPress={() => handleSelectSearchResult(visitor.name)}
										className="px-4 py-3 border-b border-gray-100 dark:border-white/5 flex-row items-center gap-2"
									>
										<MaterialIcons name="person" size={16} color="#9CA3AF" />
										<View className="flex-1">
											<Text className="text-sm font-sans-semibold text-foreground dark:text-white">
												{visitor.name}
											</Text>
											{visitor.organisation && (
												<Text className="text-xs font-sans text-text-muted">
													{visitor.organisation}
												</Text>
											)}
										</View>
										{visitor.isRegular && (
											<View className="bg-green-100 rounded-full px-2 py-0.5">
												<Text className="text-[10px] font-sans-bold text-green-700">Regular</Text>
											</View>
										)}
									</Pressable>
								))}
							</View>
						)}
					</View>

					{/* Purpose Selector */}
					<Text className="text-xs font-sans-semibold text-text-muted mb-2 ml-1">Purpose</Text>
					<ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
						<View className="flex-row gap-2">
							{PURPOSES.map((p) => (
								<Pressable
									key={p.key}
									onPress={() => setPurpose(p.key)}
									accessibilityLabel={p.label}
									className={`flex-row items-center gap-1.5 px-3 py-2 rounded-full ${
										purpose === p.key
											? "bg-white dark:bg-neutral-surface-dark border border-gray-200 dark:border-white/10"
											: "bg-background dark:bg-white/5"
									}`}
									style={{
										shadowColor: purpose === p.key ? "#000" : "transparent",
										shadowOffset: { width: 0, height: 2 },
										shadowOpacity: purpose === p.key ? 0.08 : 0,
										shadowRadius: 4,
										elevation: purpose === p.key ? 2 : 0,
									}}
								>
									<MaterialIcons
										name={p.icon}
										size={14}
										color={purpose === p.key ? "#f56e3d" : "#9CA3AF"}
									/>
									<Text
										className={`text-xs font-sans-semibold ${
											purpose === p.key ? "text-foreground dark:text-white" : "text-text-muted"
										}`}
									>
										{p.label}
									</Text>
								</Pressable>
							))}
						</View>
					</ScrollView>

					{/* Badge Number Input */}
					<TextInput
						className="bg-background dark:bg-white/5 rounded-2xl py-4 px-5 text-foreground dark:text-white font-sans mb-4"
						placeholder="Badge number (optional)"
						placeholderTextColor="#96867f"
						accessibilityLabel="Badge Number"
						testID="badge-number-input"
						value={badgeNumber}
						onChangeText={setBadgeNumber}
					/>

					{/* Submit Button */}
					<Pressable
						onPress={handleSignIn}
						disabled={signInMutation.isPending || !name.trim()}
						accessibilityLabel="Sign In"
						testID="sign-in-visitor"
						className="h-14 rounded-[40px] flex-row items-center justify-center gap-3"
						style={{ backgroundColor: name.trim() ? "#ccfbf1" : "#F3F4F6" }}
					>
						<MaterialIcons name="login" size={20} color={name.trim() ? "#0D9488" : "#9CA3AF"} />
						<Text
							className="text-base font-sans-extrabold"
							style={{ color: name.trim() ? "#0D9488" : "#9CA3AF" }}
						>
							{signInMutation.isPending ? "Signing In..." : "Sign In Visitor"}
						</Text>
					</Pressable>
				</View>

				{/* On-Site Visitors */}
				<View className="px-6">
					<View className="flex-row items-center justify-between mb-4">
						<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted">
							On-Site Now
						</Text>
						<View className="bg-primary rounded-full px-2.5 py-1">
							<Text className="text-white font-sans-bold text-xs">{onSiteCount}</Text>
						</View>
					</View>

					{isLoadingOnSite ? (
						<ActivityIndicator size="small" color="#f56e3d" />
					) : onSiteVisitors && onSiteVisitors.length > 0 ? (
						<View className="gap-3">
							{(onSiteVisitors as OnSiteVisitor[]).map((log) => (
								<View
									key={log.id}
									className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4 flex-row items-center gap-3"
									style={{ borderLeftWidth: 4, borderLeftColor: "#10B981" }}
								>
									<View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center">
										<Text className="text-sm font-sans-bold text-green-700">
											{log.visitor.name
												.split(" ")
												.map((n) => n[0])
												.join("")
												.substring(0, 2)
												.toUpperCase()}
										</Text>
									</View>
									<View className="flex-1">
										<Text className="text-base font-sans-bold text-foreground dark:text-white">
											{log.visitor.name}
										</Text>
										<View className="flex-row items-center gap-2 mt-0.5">
											<Text className="text-xs font-sans text-text-muted">
												{getPurposeLabel(log.purpose)}
											</Text>
											<Text className="text-xs font-sans text-text-muted">
												{formatTime(log.signInAt)}
											</Text>
											{log.badgeNumber && (
												<View className="bg-blue-100 rounded-full px-1.5 py-0.5">
													<Text className="text-[10px] font-sans-bold text-blue-700">
														#{log.badgeNumber}
													</Text>
												</View>
											)}
										</View>
									</View>
									<Pressable
										onPress={() => handleSignOut(log.id, log.visitor.name)}
										accessibilityLabel={`Sign out ${log.visitor.name}`}
										testID={`sign-out-${log.id}`}
										className="bg-red-50 rounded-full px-3 py-2"
									>
										<Text className="text-xs font-sans-bold text-red-600">Sign Out</Text>
									</Pressable>
								</View>
							))}
						</View>
					) : (
						<View className="items-center py-12 bg-neutral-surface dark:bg-surface-dark rounded-2xl">
							<MaterialIcons name="verified-user" size={48} color="#9CA3AF" />
							<Text className="text-text-muted font-sans-medium text-base mt-4">
								No visitors on-site
							</Text>
							<Text className="text-text-muted font-sans text-sm mt-1">
								All visitors have been signed out
							</Text>
						</View>
					)}
				</View>
			</ScrollView>
		</View>
	);
}
