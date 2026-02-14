import { ScrollView, View } from "react-native";
import { GradientAvatar } from "./GradientAvatar";

interface Child {
	id: string;
	firstName: string;
	lastName: string;
	avatarUri?: string | null;
}

interface ChildSelectorProps {
	children: Child[];
	selectedChildId: string;
	onSelect: (childId: string) => void;
}

export function ChildSelector({ children, selectedChildId, onSelect }: ChildSelectorProps) {
	return (
		<ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2">
			<View className="flex-row gap-4 px-1">
				{children.map((child) => (
					<GradientAvatar
						key={child.id}
						uri={child.avatarUri}
						name={`${child.firstName} ${child.lastName}`}
						selected={child.id === selectedChildId}
						onPress={() => onSelect(child.id)}
					/>
				))}
			</View>
		</ScrollView>
	);
}
