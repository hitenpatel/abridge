import PDFDocument from "pdfkit";

export interface PaymentReceiptData {
	receiptNumber: string;
	paymentDate: Date;
	totalAmount: number;
	providerName: string;
	ofstedUrn: string;
	items: Array<{
		childName: string;
		description: string;
		amount: number;
	}>;
}

export interface FormReceiptData {
	formTitle: string;
	submittedAt: Date;
	childName: string;
	parentName: string;
	schoolName: string;
	ofstedUrn: string;
}

/**
 * Generate a UC-compliant payment receipt PDF
 * Format follows UK Universal Credit requirements
 */
export function generatePaymentReceiptPDF(
	data: PaymentReceiptData,
): InstanceType<typeof PDFDocument> {
	const doc = new PDFDocument({
		size: "A4",
		margins: { top: 50, bottom: 50, left: 50, right: 50 },
	});

	// Header
	doc.fontSize(20).font("Helvetica-Bold").text("Payment Receipt", { align: "center" });

	doc.moveDown(0.5);
	doc
		.fontSize(10)
		.font("Helvetica")
		.text(`Receipt Number: ${data.receiptNumber}`, { align: "center" });

	doc.moveDown(1.5);

	// Provider Information (UC Required)
	doc.fontSize(12).font("Helvetica-Bold").text("Provider Information");
	doc.moveDown(0.5);

	doc.fontSize(10).font("Helvetica");
	doc.text(`Provider Name: ${data.providerName}`);
	doc.text(`Ofsted URN: ${data.ofstedUrn}`);
	doc.text(`Date: ${data.paymentDate.toLocaleDateString("en-GB")}`);

	doc.moveDown(1.5);

	// Payment Details
	doc.fontSize(12).font("Helvetica-Bold").text("Payment Details");
	doc.moveDown(0.5);

	// Table headers
	const tableTop = doc.y;
	const colWidths = {
		child: 150,
		description: 200,
		amount: 100,
	};

	doc.fontSize(10).font("Helvetica-Bold");
	doc.text("Child", 50, tableTop, { width: colWidths.child, continued: true });
	doc.text("Service Description", 200, tableTop, {
		width: colWidths.description,
		continued: true,
	});
	doc.text("Amount", 400, tableTop, { width: colWidths.amount, align: "right" });

	// Draw line under headers
	doc
		.moveTo(50, tableTop + 15)
		.lineTo(500, tableTop + 15)
		.stroke();

	// Table rows
	let currentY = tableTop + 25;
	doc.font("Helvetica");

	for (const item of data.items) {
		doc.text(item.childName, 50, currentY, { width: colWidths.child, continued: false });
		doc.text(item.description, 200, currentY, {
			width: colWidths.description,
			continued: false,
		});
		doc.text(`£${(item.amount / 100).toFixed(2)}`, 400, currentY, {
			width: colWidths.amount,
			align: "right",
		});
		currentY += 20;
	}

	// Draw line before total
	doc
		.moveTo(50, currentY + 5)
		.lineTo(500, currentY + 5)
		.stroke();

	// Total
	currentY += 15;
	doc.fontSize(12).font("Helvetica-Bold");
	doc.text("Total Amount:", 300, currentY);
	doc.text(`£${(data.totalAmount / 100).toFixed(2)}`, 400, currentY, {
		width: colWidths.amount,
		align: "right",
	});

	doc.moveDown(3);

	// Footer - Universal Credit Notice
	const footerY = 700;
	doc.fontSize(9).font("Helvetica");
	doc.text(
		"This receipt is provided for Universal Credit childcare cost claims. " +
			"Please submit this receipt to HMRC as proof of childcare costs.",
		50,
		footerY,
		{
			width: 500,
			align: "center",
		},
	);

	// Footer - Generated info
	doc.moveDown(0.5);
	doc
		.fontSize(8)
		.font("Helvetica")
		.text(`Generated: ${new Date().toLocaleString("en-GB")}`, {
			align: "center",
		});

	return doc;
}

/**
 * Generate a form completion receipt PDF
 */
export function generateFormReceiptPDF(data: FormReceiptData): InstanceType<typeof PDFDocument> {
	const doc = new PDFDocument({
		size: "A4",
		margins: { top: 50, bottom: 50, left: 50, right: 50 },
	});

	// Header
	doc.fontSize(20).font("Helvetica-Bold").text("Form Submission Receipt", { align: "center" });

	doc.moveDown(1.5);

	// School Information
	doc.fontSize(12).font("Helvetica-Bold").text("School Information");
	doc.moveDown(0.5);

	doc.fontSize(10).font("Helvetica");
	doc.text(`School Name: ${data.schoolName}`);
	doc.text(`Ofsted URN: ${data.ofstedUrn}`);

	doc.moveDown(1.5);

	// Form Information
	doc.fontSize(12).font("Helvetica-Bold").text("Form Details");
	doc.moveDown(0.5);

	doc.fontSize(10).font("Helvetica");
	doc.text(`Form: ${data.formTitle}`);
	doc.text(`Child: ${data.childName}`);
	doc.text(`Submitted by: ${data.parentName}`);
	doc.text(
		`Date: ${data.submittedAt.toLocaleDateString("en-GB")} at ${data.submittedAt.toLocaleTimeString("en-GB")}`,
	);

	doc.moveDown(2);

	// Confirmation
	doc
		.fontSize(11)
		.font("Helvetica")
		.text(
			"This receipt confirms that the above form was successfully submitted and received by the school.",
			{
				width: 500,
				align: "justify",
			},
		);

	// Footer
	const footerY = 700;
	doc
		.fontSize(8)
		.font("Helvetica")
		.text(`Generated: ${new Date().toLocaleString("en-GB")}`, 50, footerY, {
			align: "center",
		});

	return doc;
}
