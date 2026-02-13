import type React from "react";
import { Pressable, Modal as RNModal, type ModalProps as RNModalProps, View } from "react-native";

interface ModalProps extends RNModalProps {
	visible: boolean;
	onClose: () => void;
	children: React.ReactNode;
	className?: string;
}

export function Modal({ visible, onClose, children, className = "", ...props }: ModalProps) {
	return (
		<RNModal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={onClose}
			{...props}
		>
			<View className="flex-1 justify-end bg-black/50">
				<Pressable className="flex-1" onPress={onClose} />
				<View className={`bg-card rounded-t-3xl p-6 ${className}`}>{children}</View>
			</View>
		</RNModal>
	);
}
