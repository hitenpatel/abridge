import { X } from "lucide-react-native";
import type React from "react";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	FlatList,
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { theme } from "../lib/theme";
import { trpc } from "../lib/trpc";

interface Child {
	id: string;
	firstName: string;
	lastName: string;
}

interface ChildWrapper {
	child: Child;
}

interface AttendanceItem {
	date: Date;
	session: string;
	mark: string;
	note: string | null;
}

export const AttendanceScreen: React.FC = () => {
	const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
	const [isModalVisible, setIsModalVisible] = useState(false);

	// Form State
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [reason, setReason] = useState("");

	// Default query range: last 30 days
	const [filterStartDate] = useState(() => {
		const d = new Date();
		d.setDate(d.getDate() - 30);
		return d;
	});
	const [filterEndDate] = useState(() => new Date());

	// Queries
	const { data: childrenWrappers, isLoading: isLoadingChildren } =
		trpc.user.listChildren.useQuery();

	// Flatten children data structure
	const children = (childrenWrappers as unknown as ChildWrapper[])?.map((item) => item.child);

	const {
		data: attendanceRecords,
		isLoading: isLoadingAttendance,
		refetch: refetchAttendance,
	} = trpc.attendance.getAttendanceForChild.useQuery(
		{
			childId: selectedChildId ?? "",
			startDate: filterStartDate,
			endDate: filterEndDate,
		},
		{ enabled: !!selectedChildId },
	);

	const reportAbsenceMutation = trpc.attendance.reportAbsence.useMutation({
		onSuccess: () => {
			setIsModalVisible(false);
			setStartDate("");
			setEndDate("");
			setReason("");
			Alert.alert("Success", "Absence reported successfully");
			refetchAttendance();
		},
		onError: (error) => {
			Alert.alert("Error", error.message);
		},
	});

	// Select first child by default
	useEffect(() => {
		if (children && children.length > 0 && !selectedChildId) {
			const firstChild = children[0];
			if (firstChild) {
				setSelectedChildId(firstChild.id);
			}
		}
	}, [children, selectedChildId]);

	const handleSubmitAbsence = () => {
		if (!selectedChildId || !startDate || !reason) {
			Alert.alert("Error", "Please fill in all required fields");
			return;
		}

		// Basic date validation YYYY-MM-DD
		const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
		if (!dateRegex.test(startDate)) {
			Alert.alert("Error", "Start Date must be in YYYY-MM-DD format");
			return;
		}
		if (endDate && !dateRegex.test(endDate)) {
			Alert.alert("Error", "End Date must be in YYYY-MM-DD format");
			return;
		}

		reportAbsenceMutation.mutate({
			childId: selectedChildId,
			startDate: new Date(startDate),
			endDate: endDate ? new Date(endDate) : new Date(startDate),
			reason,
		});
	};

	const getStatusStyle = (mark: string) => {
		switch (mark) {
			case "PRESENT":
				return styles.statusPresent;
			case "LATE":
				return styles.statusLate;
			case "ABSENT_AUTHORISED":
				return styles.statusAbsentAuthorised;
			case "ABSENT_UNAUTHORISED":
				return styles.statusAbsentUnauthorised;
			default:
				return styles.statusLate;
		}
	};

	const getStatusTextStyle = (mark: string) => {
		switch (mark) {
			case "PRESENT":
				return styles.statusTextPresent;
			case "LATE":
				return styles.statusTextLate;
			case "ABSENT_AUTHORISED":
				return styles.statusTextAbsentAuthorised;
			case "ABSENT_UNAUTHORISED":
				return styles.statusTextAbsentUnauthorised;
			default:
				return styles.statusTextLate;
		}
	};

	const renderAttendanceItem = ({ item }: { item: AttendanceItem }) => (
		<View style={styles.recordCard}>
			<View>
				<Text style={styles.recordDate}>
					{new Date(item.date).toLocaleDateString("en-GB", {
						weekday: "short",
						day: "numeric",
						month: "short",
					})}
				</Text>
				<Text style={styles.recordSession}>{item.session} Session</Text>
			</View>
			<View style={[styles.statusBadge, getStatusStyle(item.mark)]}>
				<Text style={[styles.statusText, getStatusTextStyle(item.mark)]}>
					{item.mark.replace(/_/g, " ")}
				</Text>
			</View>
		</View>
	);

	if (isLoadingChildren) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={theme.colors.primary} />
			</View>
		);
	}

	return (
		<View style={styles.container}>
			{/* Child Selector */}
			<View style={styles.childSelectorContainer}>
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.childSelectorContent}
				>
					{children?.map((child) => (
						<TouchableOpacity
							key={child.id}
							style={[styles.childChip, selectedChildId === child.id && styles.childChipSelected]}
							onPress={() => setSelectedChildId(child.id)}
						>
							<Text
								style={[
									styles.childChipText,
									selectedChildId === child.id && styles.childChipTextSelected,
								]}
							>
								{child.firstName}
							</Text>
						</TouchableOpacity>
					))}
				</ScrollView>
			</View>

			{/* Report Absence Button */}
			<View style={styles.actionContainer}>
				<TouchableOpacity style={styles.reportButton} onPress={() => setIsModalVisible(true)}>
					<Text style={styles.reportButtonText}>Report Absence</Text>
				</TouchableOpacity>
			</View>

			{/* Attendance List */}
			{isLoadingAttendance ? (
				<ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
			) : (
				<FlatList
					data={attendanceRecords}
					renderItem={renderAttendanceItem}
					keyExtractor={(item, index) => index.toString()}
					contentContainerStyle={styles.listContent}
					ListEmptyComponent={<Text style={styles.emptyText}>No attendance records found.</Text>}
				/>
			)}

			{/* Modal */}
			<Modal
				visible={isModalVisible}
				animationType="slide"
				presentationStyle="pageSheet"
				onRequestClose={() => setIsModalVisible(false)}
			>
				<View style={styles.modalContainer}>
					<View style={styles.modalHeader}>
						<Text style={styles.modalTitle}>Report Absence</Text>
						<TouchableOpacity onPress={() => setIsModalVisible(false)}>
							<X color={theme.colors.text} size={24} />
						</TouchableOpacity>
					</View>

					<View style={styles.formContainer}>
						<Text style={styles.label}>Start Date (YYYY-MM-DD)</Text>
						<TextInput
							style={styles.input}
							placeholder="2023-10-25"
							value={startDate}
							onChangeText={setStartDate}
						/>

						<Text style={styles.label}>End Date (Optional, YYYY-MM-DD)</Text>
						<TextInput
							style={styles.input}
							placeholder="2023-10-26"
							value={endDate}
							onChangeText={setEndDate}
						/>

						<Text style={styles.label}>Reason</Text>
						<TextInput
							style={[styles.input, styles.textArea]}
							placeholder="Sick, Family Event, etc."
							value={reason}
							onChangeText={setReason}
							multiline
							numberOfLines={3}
						/>

						<TouchableOpacity
							style={styles.submitButton}
							onPress={handleSubmitAbsence}
							disabled={reportAbsenceMutation.isPending}
						>
							{reportAbsenceMutation.isPending ? (
								<ActivityIndicator color={theme.colors.card} />
							) : (
								<Text style={styles.submitButtonText}>Submit Report</Text>
							)}
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.colors.background,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	childSelectorContainer: {
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: theme.colors.border,
		backgroundColor: theme.colors.card,
	},
	childSelectorContent: {
		paddingHorizontal: 16,
		gap: 8,
	},
	childChip: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
		backgroundColor: theme.colors.secondary,
		borderWidth: 1,
		borderColor: theme.colors.border,
	},
	childChipSelected: {
		backgroundColor: theme.colors.primary,
		borderColor: theme.colors.primary,
	},
	childChipText: {
		fontSize: 14,
		fontWeight: "500",
		color: theme.colors.text,
	},
	childChipTextSelected: {
		color: theme.colors.card,
	},
	actionContainer: {
		padding: 16,
		backgroundColor: theme.colors.card,
		borderBottomWidth: 1,
		borderBottomColor: theme.colors.border,
	},
	reportButton: {
		backgroundColor: theme.colors.primary,
		paddingVertical: 12,
		borderRadius: 8,
		alignItems: "center",
	},
	reportButtonText: {
		color: theme.colors.card,
		fontSize: 16,
		fontWeight: "600",
	},
	listContent: {
		padding: 16,
		gap: 12,
	},
	recordCard: {
		backgroundColor: theme.colors.card,
		padding: 16,
		borderRadius: 12,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
		elevation: 2,
	},
	recordDate: {
		fontSize: 16,
		fontWeight: "600",
		color: theme.colors.text,
	},
	recordSession: {
		fontSize: 14,
		color: theme.colors.textMuted,
		marginTop: 2,
	},
	statusBadge: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12,
	},
	statusPresent: {
		backgroundColor: theme.colors.present,
	},
	statusAbsentUnauthorised: {
		backgroundColor: theme.colors.absent,
	},
	statusAbsentAuthorised: {
		backgroundColor: theme.colors.warning,
	},
	statusLate: {
		backgroundColor: theme.colors.late,
	},
	statusText: {
		fontSize: 12,
		fontWeight: "600",
	},
	statusTextPresent: {
		color: theme.colors.presentText,
	},
	statusTextAbsentUnauthorised: {
		color: theme.colors.absentText,
	},
	statusTextAbsentAuthorised: {
		color: theme.colors.lateText,
	},
	statusTextLate: {
		color: theme.colors.lateText,
	},
	emptyText: {
		textAlign: "center",
		color: theme.colors.textMuted,
		marginTop: 40,
	},
	// Modal Styles
	modalContainer: {
		flex: 1,
		backgroundColor: theme.colors.card,
		paddingTop: 20,
	},
	modalHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 20,
		paddingBottom: 20,
		borderBottomWidth: 1,
		borderBottomColor: theme.colors.border,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: "600",
	},
	formContainer: {
		padding: 20,
	},
	label: {
		fontSize: 14,
		fontWeight: "500",
		color: theme.colors.text,
		marginBottom: 6,
		marginTop: 16,
	},
	input: {
		borderWidth: 1,
		borderColor: theme.colors.border,
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 16,
	},
	textArea: {
		height: 100,
		textAlignVertical: "top",
	},
	submitButton: {
		backgroundColor: theme.colors.primary,
		paddingVertical: 14,
		borderRadius: 8,
		alignItems: "center",
		marginTop: 32,
	},
	submitButtonText: {
		color: theme.colors.card,
		fontSize: 16,
		fontWeight: "600",
	},
});
