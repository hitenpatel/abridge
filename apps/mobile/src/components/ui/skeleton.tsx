import React, { useEffect, useRef } from "react";
import { Animated, type ViewProps } from "react-native";

interface SkeletonProps extends ViewProps {
	className?: string;
	width?: number | string;
	height?: number | string;
}

export function Skeleton({ className = "", width, height, ...props }: SkeletonProps) {
	const opacity = useRef(new Animated.Value(0.3)).current;

	useEffect(() => {
		const animation = Animated.loop(
			Animated.sequence([
				Animated.timing(opacity, {
					toValue: 0.7,
					duration: 800,
					useNativeDriver: true,
				}),
				Animated.timing(opacity, {
					toValue: 0.3,
					duration: 800,
					useNativeDriver: true,
				}),
			]),
		);
		animation.start();
		return () => animation.stop();
	}, [opacity]);

	return (
		<Animated.View
			className={`bg-muted rounded-lg ${className}`}
			style={{ opacity, width, height }}
			{...props}
		/>
	);
}
