import { X } from "lucide-react-native";
import type React from "react";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, View } from "react-native";
import { Badge, Body, Button, Card, H2, Input, Modal, Muted } from "../components/ui";
import { useTheme } from "../lib/use-theme";
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
	const { isDark } = useTheme();

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

	const getStatusVariant = (mark: string): "default" | "success" | "warning" | "destructive" => {
		switch (mark) {
			case "PRESENT":
				return "success";
			case "LATE":
				return "warning";
			case "ABSENT_AUTHORISED":
				return "warning";
			case "ABSENT_UNAUTHORISED":
				return "destructive";
			default:
				return "warning";
		}
	};

	const renderAttendanceItem = ({ item }: { item: AttendanceItem }) => (
		<Card className="flex-row justify-between items-center">
			<View>
				<Body className="font-semibold">
					{new Date(item.date).toLocaleDateString("en-GB", {
						weekday: "short",
						day: "numeric",
						month: "short",
					})}
				</Body>
				<Muted className="mt-0.5">{item.session} Session</Muted>
			</View>
			<Badge variant={getStatusVariant(item.mark)}>{item.mark.replace(/_/g, " ")}</Badge>
		</Card>
	);

	if (isLoadingChildren) {
		return (
			<View className="flex-1 bg-background justify-center items-center">
				<ActivityIndicator size="large" color="#FF7D45" />
			</View>
		);
	}

	return (
		<View className="flex-1 bg-background">
			{/* Child Selector */}
			<View className="py-3 border-b border-border bg-card">
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
				>
					{children?.map((child) => (
						<Pressable
							key={child.id}
							className={`px-4 py-2 rounded-full border ${
								selectedChildId === child.id
									? "bg-primary border-primary"
									: "bg-secondary border-border"
							}`}
							onPress={() => setSelectedChildId(child.id)}
						>
							<Body
								className={`text-sm font-medium ${
									selectedChildId === child.id ? "text-primary-foreground" : "text-foreground"
								}`}
							>
								{child.firstName}
							</Body>
						</Pressable>
					))}
				</ScrollView>
			</View>

			{/* Report Absence Button */}
			<View className="p-4 bg-card border-b border-border">
				<Button onPress={() => setIsModalVisible(true)}>Report Absence</Button>
			</View>

			{/* Attendance List */}
			{isLoadingAttendance ? (
				<View className="flex-1 justify-center items-center">
					<ActivityIndicator size="large" color="#FF7D45" />
				</View>
			) : (
				<FlatList
					data={attendanceRecords}
					renderItem={renderAttendanceItem}
					keyExtractor={(item, index) => index.toString()}
					contentContainerStyle={{ padding: 16, gap: 12 }}
					ListEmptyComponent={
						<Muted className="text-center mt-10">No attendance records found.</Muted>
					}
				/>
			)}

			{/* Modal */}
			<Modal visible={isModalVisible} onClose={() => setIsModalVisible(false)}>
				<View className="flex-row justify-between items-center mb-5">
					<H2>Report Absence</H2>
					<Pressable onPress={() => setIsModalVisible(false)} className="p-1">
						<X color={isDark ? "#E5E7EB" : "#2D3748"} size={24} />
					</Pressable>
				</View>

				<View className="gap-4">
					<View>
						<Body className="font-medium mb-1.5">Start Date (YYYY-MM-DD)</Body>
						<Input placeholder="2023-10-25" value={startDate} onChangeText={setStartDate} />
					</View>

					<View>
						<Body className="font-medium mb-1.5">End Date (Optional, YYYY-MM-DD)</Body>
						<Input placeholder="2023-10-26" value={endDate} onChangeText={setEndDate} />
					</View>

					<View>
						<Body className="font-medium mb-1.5">Reason</Body>
						<Input
							placeholder="Sick, Family Event, etc."
							value={reason}
							onChangeText={setReason}
							multiline
							numberOfLines={3}
							className="h-24"
						/>
					</View>

					<Button
						onPress={handleSubmitAbsence}
						disabled={reportAbsenceMutation.isPending}
						className="mt-4"
					>
						{reportAbsenceMutation.isPending ? "Submitting..." : "Submit Report"}
					</Button>
				</View>
			</Modal>
		</View>
	);
};
