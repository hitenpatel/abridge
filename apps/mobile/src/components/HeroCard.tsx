import { MaterialIcons } from "@expo/vector-icons";
import { Image, Text, View } from "react-native";

interface HeroCardProps {
	childName: string;
	avatarUri?: string | null;
	status: string;
	checkInTime?: string;
}

export function HeroCard({ childName, avatarUri, status, checkInTime }: HeroCardProps) {
	return (
		<View
			className="bg-primary rounded-2xl p-5 overflow-hidden"
			style={{
				shadowColor: "#f56e3d",
				shadowOffset: { width: 0, height: 0 },
				shadowOpacity: 0.4,
				shadowRadius: 20,
				elevation: 10,
			}}
		>
			{/* Decorative circles */}
			<View className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
			<View className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-yellow-300/20" />

			<View className="flex-row items-center gap-4 z-10">
				{avatarUri ? (
					<Image
						source={{ uri: avatarUri }}
						className="w-14 h-14 rounded-full border-4 border-white/20"
					/>
				) : (
					<View className="w-14 h-14 rounded-full border-4 border-white/20 bg-white/20 items-center justify-center">
						<MaterialIcons name="person" size={28} color="white" />
					</View>
				)}
				<View className="flex-1">
					<Text className="text-white font-sans-bold text-lg">
						{childName} is {status}
					</Text>
					{checkInTime && (
						<Text className="text-white/80 text-sm font-sans mt-0.5">
							Checked in at {checkInTime}
						</Text>
					)}
				</View>
				<MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.6)" />
			</View>
		</View>
	);
}
