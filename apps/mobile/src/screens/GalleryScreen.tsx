import { MaterialIcons } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import {
	ActivityIndicator,
	Dimensions,
	FlatList,
	Image,
	Modal,
	Pressable,
	RefreshControl,
	ScrollView,
	Text,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Skeleton } from "../components/ui";
import { trpc } from "../lib/trpc";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ALBUM_GAP = 12;
const ALBUM_PADDING = 24;
const ALBUM_COLUMNS = 2;
const ALBUM_WIDTH = (SCREEN_WIDTH - ALBUM_PADDING * 2 - ALBUM_GAP * (ALBUM_COLUMNS - 1)) / ALBUM_COLUMNS;

const PHOTO_GAP = 4;
const PHOTO_COLUMNS = 3;
const PHOTO_WIDTH = (SCREEN_WIDTH - ALBUM_PADDING * 2 - PHOTO_GAP * (PHOTO_COLUMNS - 1)) / PHOTO_COLUMNS;

interface Photo {
	id: string;
	url: string;
	caption?: string | null;
	media: { key: string; filename: string | null; mimeType: string | null };
}

export function GalleryScreen() {
	const insets = useSafeAreaInsets();
	const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
	const [viewerIndex, setViewerIndex] = useState<number | null>(null);

	const {
		data: albums,
		isLoading: isLoadingAlbums,
		refetch: refetchAlbums,
		isRefetching: isRefetchingAlbums,
	} = trpc.gallery.listAlbums.useQuery({});

	const {
		data: albumDetail,
		isLoading: isLoadingAlbum,
	} = trpc.gallery.getAlbum.useQuery(
		{ albumId: selectedAlbumId ?? "" },
		{ enabled: !!selectedAlbumId },
	);

	const onRefreshAlbums = useCallback(() => {
		refetchAlbums();
	}, [refetchAlbums]);

	const photos: Photo[] = (albumDetail?.photos ?? []) as Photo[];

	// Full-screen photo viewer
	if (viewerIndex !== null && photos.length > 0) {
		const currentPhoto = photos[viewerIndex];
		return (
			<Modal
				visible
				animationType="fade"
				statusBarTranslucent
				onRequestClose={() => setViewerIndex(null)}
			>
				<View className="flex-1 bg-black">
					{/* Close button */}
					<Pressable
						onPress={() => setViewerIndex(null)}
						testID="close-viewer"
						accessibilityLabel="Close"
						className="absolute z-10 right-4 w-10 h-10 rounded-full bg-black/50 items-center justify-center"
						style={{ top: insets.top + 8 }}
					>
						<MaterialIcons name="close" size={24} color="white" />
					</Pressable>

					{/* Photo counter */}
					<View
						className="absolute z-10 left-4 bg-black/50 rounded-full px-3 py-1.5"
						style={{ top: insets.top + 12 }}
					>
						<Text className="text-white font-sans-semibold text-sm">
							{viewerIndex + 1} / {photos.length}
						</Text>
					</View>

					{/* Swipeable photo */}
					<FlatList
						data={photos}
						horizontal
						pagingEnabled
						showsHorizontalScrollIndicator={false}
						initialScrollIndex={viewerIndex}
						getItemLayout={(_, index) => ({
							length: SCREEN_WIDTH,
							offset: SCREEN_WIDTH * index,
							index,
						})}
						onMomentumScrollEnd={(e) => {
							const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
							setViewerIndex(newIndex);
						}}
						keyExtractor={(item) => item.id}
						renderItem={({ item }) => (
							<View style={{ width: SCREEN_WIDTH }} className="flex-1 items-center justify-center">
								<Image
									source={{ uri: item.url }}
									style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
									resizeMode="contain"
								/>
								{item.caption && (
									<View
										className="absolute bottom-0 left-0 right-0 bg-black/50 px-4 py-3"
										style={{ paddingBottom: insets.bottom + 8 }}
									>
										<Text className="text-white font-sans text-sm text-center">
											{item.caption}
										</Text>
									</View>
								)}
							</View>
						)}
					/>

					{/* Navigation arrows */}
					{viewerIndex > 0 && (
						<Pressable
							onPress={() => setViewerIndex(viewerIndex - 1)}
							accessibilityLabel="Previous photo"
							className="absolute left-2 top-1/2 -mt-5 w-10 h-10 rounded-full bg-black/40 items-center justify-center"
						>
							<MaterialIcons name="chevron-left" size={28} color="white" />
						</Pressable>
					)}
					{viewerIndex < photos.length - 1 && (
						<Pressable
							onPress={() => setViewerIndex(viewerIndex + 1)}
							accessibilityLabel="Next photo"
							className="absolute right-2 top-1/2 -mt-5 w-10 h-10 rounded-full bg-black/40 items-center justify-center"
						>
							<MaterialIcons name="chevron-right" size={28} color="white" />
						</Pressable>
					)}
				</View>
			</Modal>
		);
	}

	// Album detail view
	if (selectedAlbumId) {
		return (
			<View className="flex-1 bg-background">
				{/* Header with back button */}
				<View className="px-6 pb-4 flex-row items-center gap-3" style={{ paddingTop: insets.top + 8 }}>
					<Pressable
						onPress={() => setSelectedAlbumId(null)}
						testID="back-to-albums"
						accessibilityLabel="Back"
						className="w-10 h-10 rounded-full bg-neutral-surface items-center justify-center"
					>
						<MaterialIcons name="arrow-back" size={20} color="#5c4d47" />
					</Pressable>
					<View className="flex-1">
						<Text
							className="text-xl font-sans-bold text-foreground dark:text-white"
							numberOfLines={1}
						>
							{albumDetail?.title ?? "Album"}
						</Text>
						{albumDetail?.description && (
							<Text className="text-xs font-sans text-text-muted" numberOfLines={1}>
								{albumDetail.description}
							</Text>
						)}
					</View>
					{albumDetail && (
						<View className="bg-primary/10 rounded-full px-3 py-1.5">
							<Text className="text-primary font-sans-bold text-sm">
								{photos.length} photos
							</Text>
						</View>
					)}
				</View>

				{isLoadingAlbum ? (
					<View className="px-6">
						<View className="flex-row flex-wrap gap-1">
							{[1, 2, 3, 4, 5, 6].map((i) => (
								<Skeleton key={i} style={{ width: PHOTO_WIDTH, height: PHOTO_WIDTH }} className="rounded-lg" />
							))}
						</View>
					</View>
				) : photos.length > 0 ? (
					<FlatList
						data={photos}
						numColumns={PHOTO_COLUMNS}
						keyExtractor={(item) => item.id}
						contentContainerStyle={{ paddingHorizontal: ALBUM_PADDING, paddingBottom: 100 }}
						columnWrapperStyle={{ gap: PHOTO_GAP, marginBottom: PHOTO_GAP }}
						renderItem={({ item, index }) => (
							<Pressable
								onPress={() => setViewerIndex(index)}
								testID={`photo-${index}`}
								accessibilityLabel={item.caption ?? `Photo ${index + 1}`}
							>
								<Image
									source={{ uri: item.url }}
									style={{ width: PHOTO_WIDTH, height: PHOTO_WIDTH, borderRadius: 8 }}
								/>
							</Pressable>
						)}
					/>
				) : (
					<View className="flex-1 items-center justify-center">
						<MaterialIcons name="photo-library" size={48} color="#9CA3AF" />
						<Text className="text-text-muted font-sans-medium text-base mt-4">
							No photos in this album
						</Text>
					</View>
				)}
			</View>
		);
	}

	// Album grid view
	return (
		<View className="flex-1 bg-background">
			<ScrollView
				className="flex-1"
				contentContainerStyle={{ paddingBottom: 100 }}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={isRefetchingAlbums}
						onRefresh={onRefreshAlbums}
						tintColor="#f56e3d"
					/>
				}
			>
				{/* Header */}
				<View className="px-6 pb-4" style={{ paddingTop: insets.top + 8 }}>
					<View className="flex-row items-center justify-between">
						<View>
							<Text className="text-3xl font-sans-extrabold text-foreground dark:text-white tracking-tight">
								Gallery
							</Text>
							<Text className="text-sm font-sans text-text-muted mt-1">
								School photo albums
							</Text>
						</View>
						<View className="bg-blue-100 rounded-full px-3 py-1.5">
							<MaterialIcons name="photo-library" size={18} color="#3B82F6" />
						</View>
					</View>
				</View>

				{/* Albums Grid */}
				{isLoadingAlbums ? (
					<View className="px-6">
						<View className="flex-row flex-wrap gap-3">
							{[1, 2, 3, 4].map((i) => (
								<Skeleton
									key={i}
									style={{ width: ALBUM_WIDTH, height: ALBUM_WIDTH + 48 }}
									className="rounded-2xl"
								/>
							))}
						</View>
					</View>
				) : albums && albums.length > 0 ? (
					<View className="px-6">
						<View className="flex-row flex-wrap" style={{ gap: ALBUM_GAP }}>
							{albums.map((album) => {
								const dateLabel = new Date(album.createdAt).toLocaleDateString("en-GB", {
									day: "numeric",
									month: "short",
									year: "numeric",
								});
								return (
									<Pressable
										key={album.id}
										onPress={() => setSelectedAlbumId(album.id)}
										testID={`album-${album.id}`}
										accessibilityLabel={album.title}
										style={{ width: ALBUM_WIDTH }}
									>
										<View className="bg-neutral-surface dark:bg-surface-dark rounded-2xl overflow-hidden">
											{album.thumbnailUrl ? (
												<Image
													source={{ uri: album.thumbnailUrl }}
													style={{ width: ALBUM_WIDTH, height: ALBUM_WIDTH }}
													resizeMode="cover"
												/>
											) : (
												<View
													style={{ width: ALBUM_WIDTH, height: ALBUM_WIDTH }}
													className="bg-gray-200 dark:bg-gray-700 items-center justify-center"
												>
													<MaterialIcons name="photo" size={32} color="#9CA3AF" />
												</View>
											)}
											<View className="p-3">
												<Text
													className="text-sm font-sans-bold text-foreground dark:text-white"
													numberOfLines={1}
												>
													{album.title}
												</Text>
												<View className="flex-row items-center gap-1 mt-1">
													<Text className="text-xs font-sans text-text-muted">{dateLabel}</Text>
													<Text className="text-xs font-sans text-text-muted">
														- {album.photoCount} photos
													</Text>
												</View>
											</View>
										</View>
									</Pressable>
								);
							})}
						</View>
					</View>
				) : (
					<View className="items-center py-16">
						<MaterialIcons name="photo-library" size={48} color="#9CA3AF" />
						<Text className="text-text-muted font-sans-medium text-base mt-4">
							No albums available
						</Text>
					</View>
				)}
			</ScrollView>
		</View>
	);
}
