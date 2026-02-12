"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
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
		setValue,
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
		<Card>
			<CardHeader>
				<CardTitle>{template.title}</CardTitle>
				{template.description && <p className="text-muted-foreground">{template.description}</p>}
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
					<div className="space-y-4">
						{fields.map((field) => (
							<div key={field.id}>
								{field.type !== "checkbox" && (
									<Label htmlFor={field.id} className="mb-1">
										{field.label}
										{field.required && <span className="text-destructive ml-1">*</span>}
									</Label>
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
									<Textarea
										id={field.id}
										{...register(field.id, { required: field.required })}
										className="w-full"
										rows={3}
										placeholder={`Enter ${field.label.toLowerCase()}...`}
									/>
								)}

								{field.type === "select" && (
									<Select onValueChange={(value) => setValue(field.id, value)}>
										<SelectTrigger id={field.id} className="w-full">
											<SelectValue placeholder="Select an option" />
										</SelectTrigger>
										<SelectContent>
											{field.options?.map((option) => (
												<SelectItem key={option} value={option}>
													{option}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}

								{field.type === "checkbox" && (
									<div className="flex items-center space-x-2">
										<input
											type="checkbox"
											id={field.id}
											{...register(field.id, { required: field.required })}
											className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
										/>
										<Label htmlFor={field.id}>
											{field.label}
											{field.required && <span className="text-destructive ml-1">*</span>}
										</Label>
									</div>
								)}

								{errors[field.id] && (
									<p className="mt-1 text-sm text-destructive">This field is required</p>
								)}
							</div>
						))}
					</div>

					<div className="space-y-2 border-t pt-6">
						<Label className="mb-1">
							Signature <span className="text-destructive ml-1">*</span>
						</Label>
						<SignaturePad onChange={handleSignatureChange} />
						{signatureError && <p className="mt-1 text-sm text-destructive">{signatureError}</p>}
					</div>

					<Button type="submit" className="w-full" disabled={isSubmitting}>
						{isSubmitting ? "Submitting..." : "Submit Form"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
