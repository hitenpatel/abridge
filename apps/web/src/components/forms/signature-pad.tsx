"use client";

import { Trash2 } from "lucide-react";
import React, { useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "../ui/button";

interface SignaturePadProps {
	onChange: (signature: string | null) => void;
	defaultValue?: string;
}

export function SignaturePad({ onChange, defaultValue }: SignaturePadProps) {
	const sigCanvas = useRef<SignatureCanvas>(null);

	const clear = () => {
		sigCanvas.current?.clear();
		onChange(null);
	};

	const onEnd = () => {
		if (sigCanvas.current) {
			if (sigCanvas.current.isEmpty()) {
				onChange(null);
			} else {
				onChange(sigCanvas.current.getTrimmedCanvas().toDataURL("image/png"));
			}
		}
	};

	return (
		<div className="space-y-2">
			<div className="relative border rounded-md bg-white">
				<SignatureCanvas
					ref={sigCanvas}
					onEnd={onEnd}
					canvasProps={{
						className: "w-full h-40 rounded-md cursor-crosshair",
					}}
				/>
				<Button
					type="button"
					variant="outline"
					className="absolute bottom-2 right-2 h-8 w-8 !p-0 flex items-center justify-center"
					onClick={clear}
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>
			<p className="text-xs text-muted-foreground text-center">
				Sign above using your mouse or touch screen
			</p>
		</div>
	);
}
