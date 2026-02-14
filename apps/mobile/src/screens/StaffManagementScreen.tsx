import { MaterialIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Modal,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	View,
} from "react-native";
import { Skeleton } from "../components/ui";
import { trpc } from "../lib/trpc";

type Role = "ADMIN" | "TEACHER" | "OFFICE";

function getRoleBadgeStyle(role: string): { bg: string; text: string } {
	switch (role) {
		case "ADMIN":
			return { bg: "#FEE2E2", text: "#DC2626" };
		case "TEACHER":
			return { bg: "#DBEAFE", text: "#2563EB" };
		case "OFFICE":
			return { bg: "#EDE9FE", text: "#6D28D9" };
		default:
			return { bg: "#F3F4F6", text: "#6B7280" };
	}
}

export function StaffManagementScreen() {
	const { data: session } = trpc.auth.getSession.useQuery();
	const schoolId = session?.schoolId;

	const {
		data: staff,
		isLoading: staffLoading,
		refetch: refetchStaff,
	} = trpc.staff.list.useQuery({ schoolId: schoolId as string }, { enabled: !!schoolId });

	const { data: invitations, refetch: refetchInvitations } = trpc.invitation.list.useQuery(
		{ schoolId: schoolId as string },
		{ enabled: !!schoolId },
	);

	const [email, setEmail] = useState("");
	const [role, setRole] = useState<Role>("TEACHER");
	const [removeUserId, setRemoveUserId] = useState<string | null>(null);

	const sendInvite = trpc.invitation.send.useMutation({
		onSuccess: () => {
			Alert.alert("Invitation Sent", `An invitation has been sent to ${email}`);
			setEmail("");
			refetchInvitations();
		},
		onError: (error) => {
			Alert.alert("Error", error.message);
		},
	});

	const removeStaff = trpc.staff.remove.useMutation({
		onSuccess: () => {
			setRemoveUserId(null);
			refetchStaff();
		},
		onError: (error) => {
			Alert.alert("Error", error.message);
		},
	});

	const handleSendInvite = () => {
		if (!schoolId) return;
		if (!email.trim() || !email.includes("@")) {
			Alert.alert("Invalid Email", "Please enter a valid email address");
			return;
		}
		sendInvite.mutate({ schoolId, email: email.trim(), role });
	};

	const handleRemoveStaff = () => {
		if (!schoolId || !removeUserId) return;
		removeStaff.mutate({ schoolId, userId: removeUserId });
	};

	if (staffLoading) {
		return (
			<View className="flex-1 bg-background">
				<View className="p-6 gap-4">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-32 rounded-2xl" />
					<Skeleton className="h-20 rounded-2xl" />
					<Skeleton className="h-20 rounded-2xl" />
				</View>
			</View>
		);
	}

	const pendingInvites = Array.isArray(invitations)
		? (
				invitations as Array<{
					id: string;
					email: string;
					role: string;
					expiresAt: string;
					token: string;
					acceptedAt: string | null;
				}>
			).filter((inv) => !inv.acceptedAt)
		: [];

	return (
		<View className="flex-1 bg-background">
			<ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
				{/* Invite Section */}
				<View className="px-6 pt-4 mb-6">
					<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted mb-4">
						Invite Staff
					</Text>
					<View className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4">
						<TextInput
							value={email}
							onChangeText={setEmail}
							placeholder="Email address"
							placeholderTextColor="#96867f"
							keyboardType="email-address"
							autoCapitalize="none"
							className="bg-background rounded-2xl px-4 h-12 text-foreground dark:text-white font-sans text-base mb-3"
						/>

						{/* Role Selector */}
						<View className="flex-row gap-2 mb-4">
							{(["TEACHER", "OFFICE", "ADMIN"] as Role[]).map((r) => {
								const isSelected = role === r;
								const style = getRoleBadgeStyle(r);
								return (
									<Pressable
										key={r}
										onPress={() => setRole(r)}
										className={`flex-1 rounded-xl py-2.5 items-center ${isSelected ? "border-2" : ""}`}
										style={{
											backgroundColor: isSelected ? style.bg : "#f3f4f6",
											borderColor: isSelected ? style.text : "transparent",
										}}
									>
										<Text
											className="text-xs font-sans-bold"
											style={{ color: isSelected ? style.text : "#9CA3AF" }}
										>
											{r}
										</Text>
									</Pressable>
								);
							})}
						</View>

						<Pressable
							onPress={handleSendInvite}
							disabled={sendInvite.isPending}
							className="bg-primary rounded-full py-3 items-center flex-row justify-center gap-2"
							style={{ opacity: sendInvite.isPending ? 0.7 : 1 }}
						>
							{sendInvite.isPending ? (
								<ActivityIndicator size="small" color="white" />
							) : (
								<>
									<MaterialIcons name="send" size={16} color="white" />
									<Text className="text-white font-sans-bold text-sm">Send Invite</Text>
								</>
							)}
						</Pressable>
					</View>
				</View>

				{/* Current Staff */}
				<View className="px-6 mb-6">
					<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted mb-4">
						Current Staff ({staff?.length ?? 0})
					</Text>
					<View className="gap-3">
						{(staff ?? []).map((member) => {
							const roleStyle = getRoleBadgeStyle(member.role);
							const isSelf = member.userId === session?.user?.id;
							const initials = member.user.name
								? member.user.name
										.split(" ")
										.map((n: string) => n[0])
										.join("")
										.toUpperCase()
								: "?";

							return (
								<View
									key={member.userId}
									className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4 flex-row items-center gap-3"
								>
									<View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
										<Text className="text-sm font-sans-bold text-primary">{initials}</Text>
									</View>
									<View className="flex-1">
										<Text className="text-base font-sans-bold text-foreground dark:text-white">
											{member.user.name}
											{isSelf && <Text className="text-text-muted font-sans"> (you)</Text>}
										</Text>
										<Text className="text-xs font-sans text-text-muted">{member.user.email}</Text>
									</View>
									<View
										className="rounded-full px-2.5 py-1"
										style={{ backgroundColor: roleStyle.bg }}
									>
										<Text className="text-xs font-sans-bold" style={{ color: roleStyle.text }}>
											{member.role}
										</Text>
									</View>
									{!isSelf && (
										<Pressable
											onPress={() => setRemoveUserId(member.userId)}
											className="w-8 h-8 rounded-full items-center justify-center"
										>
											<MaterialIcons name="close" size={18} color="#EF4444" />
										</Pressable>
									)}
								</View>
							);
						})}
					</View>
				</View>

				{/* Pending Invitations */}
				{pendingInvites.length > 0 && (
					<View className="px-6 mb-6">
						<Text className="text-sm font-sans-bold uppercase tracking-wider text-text-muted mb-4">
							Pending Invitations
						</Text>
						<View className="gap-3">
							{pendingInvites.map((inv) => {
								const roleStyle = getRoleBadgeStyle(inv.role);
								return (
									<View
										key={inv.id}
										className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4 flex-row items-center gap-3"
										style={{ opacity: 0.8 }}
									>
										<View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
											<MaterialIcons name="mail_outline" size={20} color="#9CA3AF" />
										</View>
										<View className="flex-1">
											<Text className="text-sm font-sans-bold text-foreground dark:text-white">
												{inv.email}
											</Text>
											<Text className="text-xs font-sans text-text-muted">
												Expires{" "}
												{new Date(inv.expiresAt).toLocaleDateString("en-GB", {
													day: "numeric",
													month: "short",
												})}
											</Text>
										</View>
										<View
											className="rounded-full px-2.5 py-1"
											style={{ backgroundColor: roleStyle.bg }}
										>
											<Text className="text-xs font-sans-bold" style={{ color: roleStyle.text }}>
												{inv.role}
											</Text>
										</View>
										<Pressable
											onPress={() => {
												Clipboard.setStringAsync(inv.token);
												Alert.alert("Copied", "Invitation link copied to clipboard");
											}}
										>
											<MaterialIcons name="content_copy" size={18} color="#96867f" />
										</Pressable>
									</View>
								);
							})}
						</View>
					</View>
				)}
			</ScrollView>

			{/* Remove Confirmation Modal */}
			<Modal
				visible={!!removeUserId}
				transparent
				animationType="fade"
				onRequestClose={() => setRemoveUserId(null)}
			>
				<View className="flex-1 bg-black/50 items-center justify-center px-8">
					<View className="bg-white dark:bg-surface-dark rounded-2xl p-6 w-full">
						<View className="items-center mb-4">
							<View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-3">
								<MaterialIcons name="person_remove" size={32} color="#EF4444" />
							</View>
							<Text className="text-lg font-sans-bold text-foreground dark:text-white">
								Remove Staff Member?
							</Text>
							<Text className="text-sm font-sans text-text-muted text-center mt-2">
								This action cannot be undone. The staff member will lose access to the school.
							</Text>
						</View>
						<View className="flex-row gap-3">
							<Pressable
								onPress={() => setRemoveUserId(null)}
								className="flex-1 bg-gray-100 rounded-full py-3 items-center"
							>
								<Text className="font-sans-bold text-foreground">Cancel</Text>
							</Pressable>
							<Pressable
								onPress={handleRemoveStaff}
								disabled={removeStaff.isPending}
								className="flex-1 bg-red-500 rounded-full py-3 items-center"
							>
								{removeStaff.isPending ? (
									<ActivityIndicator size="small" color="white" />
								) : (
									<Text className="font-sans-bold text-white">Remove</Text>
								)}
							</Pressable>
						</View>
					</View>
				</View>
			</Modal>
		</View>
	);
}
