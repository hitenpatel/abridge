"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { SignaturePad } from "./signature-pad";

export interface FormField {
	id: string;
	type: "text" | "checkbox" | "select" | "textarea";
	label: string;
	required?: boolean;
	options?: string[];
}

export interface FormTemplate {
	id: string;
	title: string;
	description?: string | null;
	fields: FormField[];
}

interface FormRendererProps {
	template: FormTemplate;
	onSubmit: (data: Record<string, string | boolean>, signature: string | null) => void;
	isSubmitting?: boolean;
}

export function FormRenderer({ template, onSubmit, isSubmitting }: FormRendererProps) {
	const fields = template.fields || [];
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<Record<string, string | boolean>>();
	const [signature, setSignature] = React.useState<string | null>(null);
	const [signatureError, setSignatureError] = React.useState<string | null>(null);

	const onFormSubmit = (data: Record<string, string | boolean>) => {
		if (!signature) {
			setSignatureError("Signature is required");
			return;
		}
		setSignatureError(null);
		onSubmit(data, signature);
	};

	const handleSignatureChange = (sig: string | null) => {
		setSignature(sig);
		if (sig) {
			setSignatureError(null);
		}
	};

	return (
		<form
			onSubmit={handleSubmit(onFormSubmit)}
			className="space-y-6 bg-white p-6 rounded-lg shadow-md border border-gray-100"
		>
			<div className="space-y-2">
				<h2 className="text-2xl font-bold text-gray-900">{template.title}</h2>
				{template.description && <p className="text-gray-600">{template.description}</p>}
			</div>

			<div className="space-y-4">
				{fields.map((field) => (
					<div key={field.id}>
						{field.type !== "checkbox" && (
							<label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
								{field.label}
								{field.required && <span className="text-red-500 ml-1">*</span>}
							</label>
						)}

						{field.type === "text" && (
							<Input
								id={field.id}
								{...register(field.id, { required: field.required })}
								className="w-full"
								placeholder={`Enter ${field.label.toLowerCase()}...`}
							/>
						)}

						{field.type === "textarea" && (
							<textarea
								id={field.id}
								{...register(field.id, { required: field.required })}
								className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
								rows={3}
								placeholder={`Enter ${field.label.toLowerCase()}...`}
							/>
						)}

						{field.type === "select" && (
							<select
								id={field.id}
								{...register(field.id, { required: field.required })}
								className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
							>
								<option value="">Select an option</option>
								{field.options?.map((option) => (
									<option key={option} value={option}>
										{option}
									</option>
								))}
							</select>
						)}

						{field.type === "checkbox" && (
							<div className="flex items-center space-x-2">
								<input
									type="checkbox"
									id={field.id}
									{...register(field.id, { required: field.required })}
									className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
								/>
								<label htmlFor={field.id} className="text-sm font-medium text-gray-700">
									{field.label}
									{field.required && <span className="text-red-500 ml-1">*</span>}
								</label>
							</div>
						)}

						{errors[field.id] && (
							<p className="mt-1 text-sm text-red-600">This field is required</p>
						)}
					</div>
				))}
			</div>

			<div className="space-y-2 border-t pt-6">
				<p className="block text-sm font-medium text-gray-700 mb-1">
					Signature <span className="text-red-500 ml-1">*</span>
				</p>
				<SignaturePad onChange={handleSignatureChange} />
				{signatureError && <p className="mt-1 text-sm text-red-600">{signatureError}</p>}
			</div>

			<Button type="submit" className="w-full" disabled={isSubmitting}>
				{isSubmitting ? "Submitting..." : "Submit Form"}
			</Button>
		</form>
	);
}
