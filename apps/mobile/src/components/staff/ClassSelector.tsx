import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";

interface ClassValue {
	yearGroup: string;
	className: string;
}

interface ClassSelectorProps {
	value: ClassValue | null;
	onChange: (val: ClassValue) => void;
}

const CLASS_OPTIONS: ClassValue[] = [
	{ yearGroup: "Year 1", className: "1A" },
	{ yearGroup: "Year 1", className: "1B" },
	{ yearGroup: "Year 2", className: "2A" },
	{ yearGroup: "Year 2", className: "2B" },
	{ yearGroup: "Year 5", className: "5A" },
];

function formatClass(val: ClassValue): string {
	return `${val.yearGroup} - Class ${val.className}`;
}

export function ClassSelector({ value, onChange }: ClassSelectorProps) {
	const [modalVisible, setModalVisible] = useState(false);

	const handleSelect = (option: ClassValue) => {
		onChange(option);
		setModalVisible(false);
	};

	return (
		<>
			<Pressable
				onPress={() => setModalVisible(true)}
				className="bg-neutral-surface dark:bg-surface-dark rounded-2xl p-4 flex-row items-center gap-3"
			>
				<View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
					<MaterialIcons name="class" size={20} color="#f56e3d" />
				</View>
				<View className="flex-1">
					<Text className="text-base font-sans-bold text-foreground dark:text-white">
						{value ? formatClass(value) : "Select a class"}
					</Text>
					<Text className="text-xs font-sans text-text-muted">
						{value ? "Tap to change" : "Choose which class to post to"}
					</Text>
				</View>
				<MaterialIcons name="expand-more" size={24} color="#96867f" />
			</Pressable>

			<Modal
				visible={modalVisible}
				transparent
				animationType="slide"
				onRequestClose={() => setModalVisible(false)}
			>
				<Pressable
					className="flex-1 bg-black/40 justify-end"
					onPress={() => setModalVisible(false)}
				>
					<Pressable
						className="bg-background dark:bg-surface-dark rounded-t-3xl"
						onPress={(e) => e.stopPropagation()}
					>
						<View className="items-center pt-3 pb-2">
							<View className="w-10 h-1 rounded-full bg-gray-300" />
						</View>
						<Text className="text-lg font-sans-bold text-foreground dark:text-white px-6 pb-3">
							Select Class
						</Text>
						<FlatList
							data={CLASS_OPTIONS}
							keyExtractor={(item) => `${item.yearGroup}-${item.className}`}
							renderItem={({ item }) => {
								const isSelected =
									value?.yearGroup === item.yearGroup && value?.className === item.className;
								return (
									<Pressable
										onPress={() => handleSelect(item)}
										className="px-6 py-4 flex-row items-center gap-3 border-b border-gray-100"
									>
										<View
											className={`w-10 h-10 rounded-full items-center justify-center ${
												isSelected ? "bg-primary" : "bg-gray-100"
											}`}
										>
											<MaterialIcons
												name="school"
												size={20}
												color={isSelected ? "white" : "#96867f"}
											/>
										</View>
										<Text
											className={`flex-1 text-base font-sans-medium ${
												isSelected ? "text-primary" : "text-foreground dark:text-white"
											}`}
										>
											{formatClass(item)}
										</Text>
										{isSelected && <MaterialIcons name="check-circle" size={22} color="#f56e3d" />}
									</Pressable>
								);
							}}
							style={{ maxHeight: 400 }}
						/>
						<View className="px-6 pt-3 pb-8">
							<Pressable
								onPress={() => setModalVisible(false)}
								className="bg-gray-100 rounded-full py-3 items-center"
							>
								<Text className="text-base font-sans-semibold text-text-muted">Cancel</Text>
							</Pressable>
						</View>
					</Pressable>
				</Pressable>
			</Modal>
		</>
	);
}
