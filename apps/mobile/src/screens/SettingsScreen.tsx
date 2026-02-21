import { MaterialIcons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import {
	Alert,
	Pressable,
	RefreshControl,
	ScrollView,
	Switch,
	Text,
	TextInput,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList } from "../../App";
import { Skeleton } from "../components/ui";
import { trpc } from "../lib/trpc";

interface SettingsScreenProps {
	navigation: NativeStackNavigationProp<RootStackParamList, "Settings">;
}

function SectionCard({
	title,
	icon,
	children,
}: { title: string; icon: string; children: React.ReactNode }) {
	return (
		<View
			className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-5 mb-4"
			style={{
				shadowColor: "#000",
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.04,
				shadowRadius: 8,
				elevation: 2,
			}}
		>
			<View className="flex-row items-center gap-2 mb-4">
				<MaterialIcons
					name={icon as keyof typeof MaterialIcons.glyphMap}
					size={22}
					color="#f56e3d"
				/>
				<Text className="text-lg font-sans-bold text-foreground dark:text-white">{title}</Text>
			</View>
			{children}
		</View>
	);
}

function ToggleRow({
	label,
	value,
	onValueChange,
	accessibilityLabel,
}: {
	label: string;
	value: boolean;
	onValueChange: (v: boolean) => void;
	accessibilityLabel?: string;
}) {
	return (
		<View className="flex-row items-center justify-between py-3">
			<Text className="text-sm font-sans-medium text-foreground dark:text-gray-200">{label}</Text>
			<Switch
				value={value}
				onValueChange={onValueChange}
				accessibilityLabel={accessibilityLabel ?? label}
				trackColor={{ false: "#D1D5DB", true: "#f56e3d" }}
				thumbColor="#fff"
			/>
		</View>
	);
}

function ProfileSection() {
	const { data, isLoading, refetch } = trpc.settings.getProfile.useQuery();
	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");

	useEffect(() => {
		if (data) {
			setName(data.name ?? "");
			setPhone(data.phone ?? "");
		}
	}, [data]);

	const updateProfile = trpc.settings.updateProfile.useMutation({
		onSuccess: () => {
			Alert.alert("Saved", "Profile updated successfully");
			refetch();
		},
		onError: (err) => Alert.alert("Error", err.message),
	});

	if (isLoading) {
		return (
			<SectionCard title="Profile" icon="person">
				<Skeleton className="h-10 w-full mb-3" />
				<Skeleton className="h-10 w-full mb-3" />
				<Skeleton className="h-10 w-full" />
			</SectionCard>
		);
	}

	return (
		<SectionCard title="Profile" icon="person">
			<View className="mb-3">
				<Text className="text-xs font-sans-medium text-text-muted mb-1">Name</Text>
				<TextInput
					value={name}
					onChangeText={setName}
					accessibilityLabel="Name"
					className="bg-background dark:bg-white/5 rounded-xl px-4 py-3 text-sm font-sans text-foreground dark:text-white"
					placeholderTextColor="#96867f"
				/>
			</View>
			<View className="mb-3">
				<Text className="text-xs font-sans-medium text-text-muted mb-1">Email</Text>
				<TextInput
					value={data?.email ?? ""}
					editable={false}
					className="bg-background dark:bg-white/5 rounded-xl px-4 py-3 text-sm font-sans text-text-muted"
				/>
				<Text className="text-xs text-text-muted mt-1">Contact admin to change your email</Text>
			</View>
			<View className="mb-4">
				<Text className="text-xs font-sans-medium text-text-muted mb-1">Phone</Text>
				<TextInput
					value={phone}
					onChangeText={setPhone}
					placeholder="Optional"
					className="bg-background dark:bg-white/5 rounded-xl px-4 py-3 text-sm font-sans text-foreground dark:text-white"
					placeholderTextColor="#96867f"
					keyboardType="phone-pad"
				/>
			</View>
			<Pressable
				onPress={() => updateProfile.mutate({ name, phone: phone || null })}
				disabled={updateProfile.isPending}
				accessibilityLabel="Save Profile"
				className="bg-primary rounded-xl py-3 items-center"
				style={{ opacity: updateProfile.isPending ? 0.6 : 1 }}
			>
				<Text className="text-white font-sans-bold text-sm">
					{updateProfile.isPending ? "Saving..." : "Save Profile"}
				</Text>
			</Pressable>
		</SectionCard>
	);
}

function NotificationsSection() {
	const { data, isLoading, refetch } = trpc.settings.getNotificationPreferences.useQuery();
	const [push, setPush] = useState(true);
	const [sms, setSms] = useState(false);
	const [email, setEmail] = useState(true);
	const [quietEnabled, setQuietEnabled] = useState(false);
	const [quietStart, setQuietStart] = useState("21:00");
	const [quietEnd, setQuietEnd] = useState("07:00");

	useEffect(() => {
		if (data) {
			setPush(data.notifyByPush);
			setSms(data.notifyBySms);
			setEmail(data.notifyByEmail);
			setQuietEnabled(!!data.quietStart);
			setQuietStart(data.quietStart ?? "21:00");
			setQuietEnd(data.quietEnd ?? "07:00");
		}
	}, [data]);

	const updatePrefs = trpc.settings.updateNotificationPreferences.useMutation({
		onSuccess: () => {
			Alert.alert("Saved", "Notification preferences updated");
			refetch();
		},
		onError: (err) => Alert.alert("Error", err.message),
	});

	if (isLoading) {
		return (
			<SectionCard title="Notifications" icon="notifications">
				<Skeleton className="h-8 w-full mb-3" />
				<Skeleton className="h-8 w-full mb-3" />
				<Skeleton className="h-8 w-full" />
			</SectionCard>
		);
	}

	return (
		<SectionCard title="Notifications" icon="notifications">
			<ToggleRow
				label="Push notifications"
				value={push}
				onValueChange={setPush}
				accessibilityLabel="Push Notifications"
			/>
			<ToggleRow
				label="SMS notifications"
				value={sms}
				onValueChange={setSms}
				accessibilityLabel="SMS"
			/>
			<ToggleRow
				label="Email notifications"
				value={email}
				onValueChange={setEmail}
				accessibilityLabel="Email"
			/>

			<View className="border-t border-gray-200 dark:border-white/10 mt-2 pt-3">
				<ToggleRow label="Quiet hours" value={quietEnabled} onValueChange={setQuietEnabled} />
				{quietEnabled && (
					<View className="flex-row gap-3 mt-2">
						<View className="flex-1">
							<Text className="text-xs font-sans-medium text-text-muted mb-1">From</Text>
							<TextInput
								value={quietStart}
								onChangeText={setQuietStart}
								placeholder="21:00"
								accessibilityLabel="Quiet Start"
								className="bg-background dark:bg-white/5 rounded-xl px-4 py-3 text-sm font-sans text-foreground dark:text-white"
								placeholderTextColor="#96867f"
							/>
						</View>
						<View className="flex-1">
							<Text className="text-xs font-sans-medium text-text-muted mb-1">To</Text>
							<TextInput
								value={quietEnd}
								onChangeText={setQuietEnd}
								placeholder="07:00"
								accessibilityLabel="Quiet End"
								className="bg-background dark:bg-white/5 rounded-xl px-4 py-3 text-sm font-sans text-foreground dark:text-white"
								placeholderTextColor="#96867f"
							/>
						</View>
					</View>
				)}
				<Text className="text-xs text-text-muted mt-2">
					Urgent messages will still be delivered during quiet hours
				</Text>
			</View>

			<Pressable
				onPress={() =>
					updatePrefs.mutate({
						notifyByPush: push,
						notifyBySms: sms,
						notifyByEmail: email,
						quietStart: quietEnabled ? quietStart : null,
						quietEnd: quietEnabled ? quietEnd : null,
					})
				}
				disabled={updatePrefs.isPending}
				accessibilityLabel="Save Notifications"
				className="bg-primary rounded-xl py-3 items-center mt-4"
				style={{ opacity: updatePrefs.isPending ? 0.6 : 1 }}
			>
				<Text className="text-white font-sans-bold text-sm">
					{updatePrefs.isPending ? "Saving..." : "Save Notifications"}
				</Text>
			</Pressable>
		</SectionCard>
	);
}

function SchoolSettingsSection({ schoolId }: { schoolId: string }) {
	const { data, isLoading, refetch } = trpc.settings.getSchoolSettings.useQuery({ schoolId });
	const [schoolName, setSchoolName] = useState("");
	const [defPush, setDefPush] = useState(true);
	const [defSms, setDefSms] = useState(false);
	const [defEmail, setDefEmail] = useState(true);

	useEffect(() => {
		if (data) {
			setSchoolName(data.name);
			setDefPush(data.defaultNotifyByPush);
			setDefSms(data.defaultNotifyBySms);
			setDefEmail(data.defaultNotifyByEmail);
		}
	}, [data]);

	const updateSchool = trpc.settings.updateSchoolSettings.useMutation({
		onSuccess: () => {
			Alert.alert("Saved", "School settings updated");
			refetch();
		},
		onError: (err) => Alert.alert("Error", err.message),
	});

	if (isLoading) {
		return (
			<SectionCard title="School Settings" icon="school">
				<Skeleton className="h-10 w-full mb-3" />
				<Skeleton className="h-8 w-full mb-3" />
				<Skeleton className="h-8 w-full" />
			</SectionCard>
		);
	}

	return (
		<SectionCard title="School Settings" icon="school">
			<View className="mb-3">
				<Text className="text-xs font-sans-medium text-text-muted mb-1">School Name</Text>
				<TextInput
					value={schoolName}
					onChangeText={setSchoolName}
					className="bg-background dark:bg-white/5 rounded-xl px-4 py-3 text-sm font-sans text-foreground dark:text-white"
					placeholderTextColor="#96867f"
				/>
			</View>

			<View className="border-t border-gray-200 dark:border-white/10 mt-2 pt-3">
				<Text className="text-xs font-sans-medium text-text-muted mb-2">
					Default notification preferences for new members
				</Text>
				<ToggleRow label="Push notifications" value={defPush} onValueChange={setDefPush} />
				<ToggleRow label="SMS notifications" value={defSms} onValueChange={setDefSms} />
				<ToggleRow label="Email notifications" value={defEmail} onValueChange={setDefEmail} />
			</View>

			<Pressable
				onPress={() =>
					updateSchool.mutate({
						schoolId,
						name: schoolName,
						defaultNotifyByPush: defPush,
						defaultNotifyBySms: defSms,
						defaultNotifyByEmail: defEmail,
					})
				}
				disabled={updateSchool.isPending}
				className="bg-primary rounded-xl py-3 items-center mt-4"
				style={{ opacity: updateSchool.isPending ? 0.6 : 1 }}
			>
				<Text className="text-white font-sans-bold text-sm">
					{updateSchool.isPending ? "Saving..." : "Save School Settings"}
				</Text>
			</Pressable>
		</SectionCard>
	);
}

export function SettingsScreen({ navigation }: SettingsScreenProps) {
	const insets = useSafeAreaInsets();
	const { data: session, isLoading } = trpc.auth.getSession.useQuery();
	const profileQuery = trpc.settings.getProfile.useQuery();
	const notifQuery = trpc.settings.getNotificationPreferences.useQuery();
	const [isRefreshing, setIsRefreshing] = useState(false);

	const onRefresh = React.useCallback(async () => {
		setIsRefreshing(true);
		await Promise.all([profileQuery.refetch(), notifQuery.refetch()]);
		setIsRefreshing(false);
	}, [profileQuery, notifQuery]);

	const isAdmin = session?.staffRole === "ADMIN";
	const schoolId = session?.schoolId;

	if (isLoading) {
		return (
			<View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
				<View className="px-6 pt-4">
					<Skeleton className="h-8 w-32 mb-6" />
					<Skeleton className="h-48 w-full rounded-2xl mb-4" />
					<Skeleton className="h-48 w-full rounded-2xl" />
				</View>
			</View>
		);
	}

	return (
		<View className="flex-1 bg-background">
			<ScrollView
				className="flex-1"
				contentContainerClassName="px-6 pb-28 pt-4"
				refreshControl={
					<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#f56e3d" />
				}
				showsVerticalScrollIndicator={false}
			>
				<ProfileSection />
				<NotificationsSection />
				{isAdmin && schoolId && <SchoolSettingsSection schoolId={schoolId} />}
			</ScrollView>
		</View>
	);
}
