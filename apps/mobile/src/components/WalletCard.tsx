import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

interface WalletCardProps {
	balance: number;
	budgetUsed?: number;
	onTopUp?: () => void;
}

export function WalletCard({ balance, budgetUsed = 0, onTopUp }: WalletCardProps) {
	const balancePounds = (balance / 100).toFixed(2);
	const [whole, decimal] = balancePounds.split(".");

	return (
		<View
			className="rounded-[32px] p-6 overflow-hidden"
			style={{
				backgroundColor: "#f56e3d",
				shadowColor: "#f56e3d",
				shadowOffset: { width: 0, height: 0 },
				shadowOpacity: 0.4,
				shadowRadius: 20,
				elevation: 10,
			}}
		>
			{/* Decorative circles */}
			<View className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
			<View className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-yellow-300/20" />

			<View className="z-10">
				<Text className="text-white/80 text-sm font-sans-medium mb-1">Available Balance</Text>
				<View className="flex-row items-baseline mb-4">
					<Text className="text-white text-3xl font-sans-extrabold">£</Text>
					<Text className="text-white text-5xl font-sans-extrabold">{whole}</Text>
					<Text className="text-white/80 text-2xl font-sans-bold">.{decimal}</Text>
				</View>

				{budgetUsed > 0 && (
					<View className="mb-4">
						<View className="w-full h-3 rounded-full bg-white/20 overflow-hidden">
							<View
								className="h-full rounded-full"
								style={{
									width: `${Math.min(100, budgetUsed)}%`,
									backgroundColor: "#ffca28",
									shadowColor: "#ffca28",
									shadowOffset: { width: 0, height: 0 },
									shadowOpacity: 0.5,
									shadowRadius: 8,
								}}
							/>
						</View>
					</View>
				)}

				{onTopUp && (
					<Pressable
						onPress={onTopUp}
						className="bg-white rounded-full py-3 flex-row items-center justify-center gap-2"
					>
						<MaterialIcons name="add" size={20} color="#f56e3d" />
						<Text className="text-primary font-sans-bold text-base">Top Up Wallet</Text>
					</Pressable>
				)}
			</View>
		</View>
	);
}
