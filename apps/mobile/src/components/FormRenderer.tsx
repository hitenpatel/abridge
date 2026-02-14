import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

interface FormField {
	id: string;
	type: string;
	label: string;
	required: boolean;
	options?: string[];
}

interface FormRendererProps {
	fields: FormField[];
	values: Record<string, unknown>;
	onChange: (fieldId: string, value: unknown) => void;
	errors?: Record<string, string>;
}

export function FormRenderer({ fields, values, onChange, errors }: FormRendererProps) {
	return (
		<View className="gap-4">
			{fields.map((field) => (
				<FieldRenderer
					key={field.id}
					field={field}
					value={values[field.id]}
					onChange={(val) => onChange(field.id, val)}
					error={errors?.[field.id]}
				/>
			))}
		</View>
	);
}

function FieldRenderer({
	field,
	value,
	onChange,
	error,
}: {
	field: FormField;
	value: unknown;
	onChange: (val: unknown) => void;
	error?: string;
}) {
	switch (field.type) {
		case "text":
			return (
				<View>
					<FieldLabel label={field.label} required={field.required} />
					<TextInput
						value={(value as string) ?? ""}
						onChangeText={onChange}
						placeholder={`Enter ${field.label.toLowerCase()}`}
						placeholderTextColor="#96867f"
						className="bg-neutral-surface dark:bg-surface-dark rounded-2xl px-4 h-12 text-foreground dark:text-white font-sans text-base"
					/>
					{error && <Text className="text-red-500 text-xs font-sans mt-1">{error}</Text>}
				</View>
			);

		case "textarea":
			return (
				<View>
					<FieldLabel label={field.label} required={field.required} />
					<TextInput
						value={(value as string) ?? ""}
						onChangeText={onChange}
						placeholder={`Enter ${field.label.toLowerCase()}`}
						placeholderTextColor="#96867f"
						multiline
						numberOfLines={4}
						textAlignVertical="top"
						className="bg-neutral-surface dark:bg-surface-dark rounded-2xl px-4 py-3 min-h-[100px] text-foreground dark:text-white font-sans text-base"
					/>
					{error && <Text className="text-red-500 text-xs font-sans mt-1">{error}</Text>}
				</View>
			);

		case "checkbox":
			return (
				<View>
					<Pressable onPress={() => onChange(!value)} className="flex-row items-center gap-3">
						<View
							className={`w-6 h-6 rounded-lg border-2 items-center justify-center ${
								value ? "bg-primary border-primary" : "border-gray-300"
							}`}
						>
							{value ? <MaterialIcons name="check" size={16} color="white" /> : null}
						</View>
						<Text className="text-base font-sans text-foreground dark:text-white flex-1">
							{field.label}
							{field.required && <Text className="text-red-500"> *</Text>}
						</Text>
					</Pressable>
					{error && <Text className="text-red-500 text-xs font-sans mt-1">{error}</Text>}
				</View>
			);

		case "radio":
		case "select":
			return (
				<View>
					<FieldLabel label={field.label} required={field.required} />
					<View className="gap-2">
						{(field.options ?? []).map((option) => (
							<Pressable
								key={option}
								onPress={() => onChange(option)}
								className={`flex-row items-center gap-3 rounded-2xl px-4 py-3 ${
									value === option
										? "bg-primary/10 border border-primary"
										: "bg-neutral-surface dark:bg-surface-dark"
								}`}
							>
								<View
									className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
										value === option ? "border-primary" : "border-gray-300"
									}`}
								>
									{value === option && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}
								</View>
								<Text className="text-base font-sans text-foreground dark:text-white">
									{option}
								</Text>
							</Pressable>
						))}
					</View>
					{error && <Text className="text-red-500 text-xs font-sans mt-1">{error}</Text>}
				</View>
			);

		case "date":
			return (
				<View>
					<FieldLabel label={field.label} required={field.required} />
					<TextInput
						value={(value as string) ?? ""}
						onChangeText={onChange}
						placeholder="DD/MM/YYYY"
						placeholderTextColor="#96867f"
						className="bg-neutral-surface dark:bg-surface-dark rounded-2xl px-4 h-12 text-foreground dark:text-white font-sans text-base"
					/>
					{error && <Text className="text-red-500 text-xs font-sans mt-1">{error}</Text>}
				</View>
			);

		default:
			return (
				<View>
					<FieldLabel label={field.label} required={field.required} />
					<TextInput
						value={(value as string) ?? ""}
						onChangeText={onChange}
						placeholder={`Enter ${field.label.toLowerCase()}`}
						placeholderTextColor="#96867f"
						className="bg-neutral-surface dark:bg-surface-dark rounded-2xl px-4 h-12 text-foreground dark:text-white font-sans text-base"
					/>
					{error && <Text className="text-red-500 text-xs font-sans mt-1">{error}</Text>}
				</View>
			);
	}
}

function FieldLabel({ label, required }: { label: string; required: boolean }) {
	return (
		<Text className="text-sm font-sans-medium text-foreground dark:text-white mb-2">
			{label}
			{required && <Text className="text-red-500"> *</Text>}
		</Text>
	);
}
