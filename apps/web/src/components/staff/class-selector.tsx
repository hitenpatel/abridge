"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface ClassValue {
	yearGroup: string;
	className: string;
}

interface ClassSelectorProps {
	value: ClassValue | null;
	onChange: (val: ClassValue) => void;
}

const CLASS_OPTIONS: ClassValue[] = [
	{ yearGroup: "Year 1", className: "1A" },
	{ yearGroup: "Year 1", className: "1B" },
	{ yearGroup: "Year 2", className: "2A" },
	{ yearGroup: "Year 2", className: "2B" },
	{ yearGroup: "Year 5", className: "5A" },
];

function formatClass(val: ClassValue): string {
	return `${val.yearGroup} - Class ${val.className}`;
}

export function ClassSelector({ value, onChange }: ClassSelectorProps) {
	const selectedKey = value ? `${value.yearGroup}|${value.className}` : undefined;

	return (
		<Select
			value={selectedKey}
			onValueChange={(key) => {
				const [yearGroup, className] = key.split("|");
				onChange({ yearGroup, className });
			}}
		>
			<SelectTrigger className="w-full">
				<SelectValue placeholder="Select a class" />
			</SelectTrigger>
			<SelectContent>
				{CLASS_OPTIONS.map((opt) => {
					const key = `${opt.yearGroup}|${opt.className}`;
					return (
						<SelectItem key={key} value={key}>
							{formatClass(opt)}
						</SelectItem>
					);
				})}
			</SelectContent>
		</Select>
	);
}
