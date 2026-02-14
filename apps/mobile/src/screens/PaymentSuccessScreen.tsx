import { MaterialIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import type { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "PaymentSuccess">;

export function PaymentSuccessScreen({ route, navigation }: Props) {
	const { amount, transactionId, itemName } = route.params;

	return (
		<View className="flex-1 bg-black/5 items-center justify-center px-8">
			<View
				className="bg-white dark:bg-surface-dark rounded-2xl p-8 w-full items-center"
				style={{
					shadowColor: "#f56e3d",
					shadowOffset: { width: 0, height: 8 },
					shadowOpacity: 0.08,
					shadowRadius: 24,
					elevation: 8,
				}}
			>
				{/* Decorative confetti dots */}
				<View className="absolute top-4 left-6 w-3 h-3 rounded-full bg-primary/30" />
				<View className="absolute top-8 right-8 w-2 h-2 rounded-full bg-accent-yellow/50" />
				<View className="absolute top-16 left-12 w-2 h-2 rounded bg-blue-300/40" />
				<View className="absolute bottom-12 right-10 w-3 h-3 rounded-full bg-green-300/40" />

				{/* Check Icon */}
				<View className="w-24 h-24 items-center justify-center mb-6">
					<View className="w-16 h-16 bg-primary rounded-full items-center justify-center">
						<MaterialIcons name="check" size={32} color="white" />
					</View>
				</View>

				{/* Title */}
				<Text className="text-2xl font-sans-bold text-foreground dark:text-white mb-2">
					Payment Successful!
				</Text>

				{/* Item Name */}
				<Text className="text-base font-sans-medium text-primary mb-6">{itemName}</Text>

				{/* Receipt */}
				<View className="bg-background dark:bg-white/5 rounded-xl p-4 w-full mb-6">
					<View className="flex-row justify-between items-center mb-2">
						<Text className="text-sm font-sans text-text-muted">Amount</Text>
						<Text className="text-lg font-sans-bold text-foreground dark:text-white">
							£{(amount / 100).toFixed(2)}
						</Text>
					</View>
					<View className="flex-row justify-between items-center">
						<Text className="text-sm font-sans text-text-muted">Transaction ID</Text>
						<Text className="text-xs font-sans text-text-muted">{transactionId}</Text>
					</View>
				</View>

				{/* CTA */}
				<Pressable
					onPress={() => navigation.navigate("Main")}
					className="bg-primary rounded-full py-3.5 w-full items-center mb-3"
				>
					<Text className="text-white font-sans-bold text-base">Back to Home</Text>
				</Pressable>

				<Pressable onPress={() => navigation.goBack()}>
					<Text className="text-primary font-sans-medium text-sm">View Receipt</Text>
				</Pressable>
			</View>
		</View>
	);
}
