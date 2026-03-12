import { MaterialIcons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
	Text,
	View,
} from "react-native";
import type { RootStackParamList } from "../../App";
import { FormRenderer } from "../components/FormRenderer";
import { Skeleton } from "../components/ui";
import { trpc } from "../lib/trpc";

type Props = NativeStackScreenProps<RootStackParamList, "FormDetail">;

interface FormField {
	id: string;
	type: string;
	label: string;
	required: boolean;
	options?: string[];
}

export function FormDetailScreen({ route, navigation }: Props) {
	const { formId, childId } = route.params;

	const { data: template, isLoading } = trpc.forms.getTemplate.useQuery({ templateId: formId });
	const { data: summary } = trpc.dashboard.getSummary.useQuery();

	const child = summary?.children.find((c: { id: string }) => c.id === childId) as
		| { id: string; firstName: string; lastName: string }
		| undefined;

	const [values, setValues] = useState<Record<string, unknown>>({});
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [submitted, setSubmitted] = useState(false);

	const submitForm = trpc.forms.submitForm.useMutation({
		onSuccess: () => {
			setSubmitted(true);
		},
		onError: (error) => {
			Alert.alert("Error", error.message);
		},
	});

	const handleChange = (fieldId: string, value: unknown) => {
		setValues((prev) => ({ ...prev, [fieldId]: value }));
		setErrors((prev) => {
			const next = { ...prev };
			delete next[fieldId];
			return next;
		});
	};

	const handleSubmit = () => {
		const fields = (template?.fields ?? []) as FormField[];
		const newErrors: Record<string, string> = {};

		for (const field of fields) {
			if (field.required) {
				const val = values[field.id];
				if (val === undefined || val === null || val === "" || val === false) {
					newErrors[field.id] = "This field is required";
				}
			}
		}

		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);
			return;
		}

		submitForm.mutate({
			templateId: formId,
			childId,
			data: values,
		});
	};

	if (isLoading) {
		return (
			<View className="flex-1 bg-background">
				<View className="p-6 gap-4">
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-4 w-64" />
					<Skeleton className="h-12 rounded-2xl" />
					<Skeleton className="h-12 rounded-2xl" />
					<Skeleton className="h-12 rounded-2xl" />
				</View>
			</View>
		);
	}

	if (submitted) {
		return (
			<View className="flex-1 bg-background items-center justify-center px-8">
				<View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-6">
					<MaterialIcons name="check-circle" size={48} color="#16A34A" />
				</View>
				<Text className="text-2xl font-sans-bold text-foreground dark:text-white mb-2">
					Form Submitted
				</Text>
				<Text className="text-base font-sans text-text-muted text-center mb-8">
					{template?.title} has been submitted successfully for {child?.firstName ?? "your child"}.
				</Text>
				<Pressable
					onPress={() => navigation.goBack()}
					className="bg-primary rounded-full py-3.5 px-8"
				>
					<Text className="text-white font-sans-bold text-base">Back to Forms</Text>
				</Pressable>
			</View>
		);
	}

	const fields = (template?.fields ?? []) as FormField[];

	return (
		<KeyboardAvoidingView
			testID="form-detail-screen"
			className="flex-1 bg-background"
			behavior={Platform.OS === "ios" ? "padding" : "height"}
		>
			<ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
				{/* Form Title */}
				<Text className="text-2xl font-sans-bold text-foreground dark:text-white mb-1">
					{template?.title}
				</Text>
				{template?.description && (
					<Text className="text-sm font-sans text-text-muted mb-6">{template.description}</Text>
				)}

				{/* Child Badge */}
				{child && (
					<View className="bg-primary/10 rounded-full px-4 py-2 flex-row items-center gap-2 self-start mb-6">
						<MaterialIcons name="person" size={16} color="#f56e3d" />
						<Text className="text-sm font-sans-medium text-primary">
							{child.firstName} {child.lastName}
						</Text>
					</View>
				)}

				{/* Test Fill (dev only) */}
				{(__DEV__ || process.env.EXPO_PUBLIC_E2E) && fields.length > 0 && (
					<Pressable
						onPress={() => {
							for (const field of fields) {
								if (field.type === "text" || field.type === "textarea") {
									handleChange(field.id, "Yes");
								} else if (field.type === "checkbox") {
									handleChange(field.id, true);
								} else if (field.type === "select" && field.options?.length) {
									handleChange(field.id, field.options[0]);
								}
							}
						}}
						className="bg-neutral-surface dark:bg-surface-dark rounded-full h-10 items-center justify-center mb-4"
					>
						<Text className="text-text-muted font-sans-semibold text-sm">Test Fill</Text>
					</Pressable>
				)}

				{/* Form Fields */}
				<FormRenderer fields={fields} values={values} onChange={handleChange} errors={errors} />
			</ScrollView>

			{/* Submit Button */}
			<View className="absolute bottom-0 left-0 right-0 p-6 bg-background border-t border-gray-100">
				<Pressable
					onPress={handleSubmit}
					disabled={submitForm.isPending}
					accessibilityLabel="Submit"
					className="bg-primary rounded-full py-4 items-center flex-row justify-center gap-2"
					style={{ opacity: submitForm.isPending ? 0.7 : 1 }}
				>
					{submitForm.isPending ? (
						<ActivityIndicator size="small" color="white" />
					) : (
						<>
							<MaterialIcons name="send" size={18} color="white" />
							<Text className="text-white font-sans-bold text-base">Submit Form</Text>
						</>
					)}
				</Pressable>
			</View>
		</KeyboardAvoidingView>
	);
}
