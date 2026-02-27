interface ReportPdfData {
	schoolName: string;
	schoolMotto: string | null;
	brandColor: string;
	secondaryColor: string | null;
	brandFont: string;
	childName: string;
	yearGroup: string;
	className: string | null;
	cycleName: string;
	publishDate: string;
	attendancePct: number | null;
	assessmentModel: "PRIMARY_DESCRIPTIVE" | "SECONDARY_GRADES";
	generalComment: string | null;
	grades: Array<{
		subject: string;
		level: string | null;
		effort: string | null;
		currentGrade: string | null;
		targetGrade: string | null;
		comment: string | null;
	}>;
}

export async function generateReportPdf(data: ReportPdfData): Promise<Buffer> {
	const ReactPDF = await import("@react-pdf/renderer");
	const React = await import("react");

	const { Document, Page, StyleSheet, Text, View } = ReactPDF;
	const h = React.createElement;

	const styles = StyleSheet.create({
		page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
		header: {
			backgroundColor: data.brandColor,
			padding: 16,
			marginBottom: 20,
			marginHorizontal: -40,
			marginTop: -40,
			paddingHorizontal: 40,
		},
		schoolName: { fontSize: 18, color: "white", fontWeight: "bold" },
		motto: { fontSize: 9, color: "white", marginTop: 2, opacity: 0.9 },
		childInfo: { marginBottom: 16 },
		childName: { fontSize: 14, fontWeight: "bold", marginBottom: 4 },
		metaText: { fontSize: 9, color: "#666", marginBottom: 2 },
		attendanceBadge: {
			backgroundColor: "#f0fdf4",
			borderRadius: 4,
			padding: "4 8",
			alignSelf: "flex-start",
			marginBottom: 12,
		},
		tableHeader: {
			flexDirection: "row",
			backgroundColor: "#f3f4f6",
			padding: 8,
			borderBottomWidth: 1,
			borderBottomColor: "#e5e7eb",
			fontWeight: "bold",
			fontSize: 9,
		},
		tableRow: {
			flexDirection: "row",
			padding: 8,
			borderBottomWidth: 1,
			borderBottomColor: "#f3f4f6",
			fontSize: 9,
		},
		tableRowAlt: { backgroundColor: "#fafafa" },
		colSubject: { width: "20%" },
		colGrade: { width: "15%" },
		colEffort: { width: "15%" },
		colComment: { width: "50%" },
		generalComment: {
			marginTop: 16,
			padding: 12,
			backgroundColor: "#f9fafb",
			borderRadius: 4,
		},
		commentLabel: { fontWeight: "bold", marginBottom: 4, fontSize: 10 },
		footer: {
			position: "absolute",
			bottom: 30,
			left: 40,
			right: 40,
			fontSize: 8,
			color: "#999",
			textAlign: "center",
		},
	});

	const element = h(
		Document,
		null,
		h(
			Page,
			{ size: "A4", style: styles.page },
			// Header
			h(
				View,
				{ style: styles.header },
				h(Text, { style: styles.schoolName }, data.schoolName),
				data.schoolMotto ? h(Text, { style: styles.motto }, data.schoolMotto) : null,
			),
			// Child info
			h(
				View,
				{ style: styles.childInfo },
				h(Text, { style: styles.childName }, data.childName),
				h(
					Text,
					{ style: styles.metaText },
					`${data.yearGroup}${data.className ? ` · ${data.className}` : ""} · ${data.cycleName}`,
				),
				h(Text, { style: styles.metaText }, `Published: ${data.publishDate}`),
				data.attendancePct !== null
					? h(
							View,
							{ style: styles.attendanceBadge },
							h(Text, null, `Attendance: ${data.attendancePct}%`),
						)
					: null,
			),
			// Table header
			h(
				View,
				{ style: styles.tableHeader },
				h(Text, { style: styles.colSubject }, "Subject"),
				data.assessmentModel === "PRIMARY_DESCRIPTIVE"
					? h(Text, { style: styles.colGrade }, "Level")
					: h(Text, { style: styles.colGrade }, "Grade"),
				data.assessmentModel === "PRIMARY_DESCRIPTIVE"
					? h(Text, { style: styles.colEffort }, "Effort")
					: h(Text, { style: styles.colEffort }, "Target"),
				h(Text, { style: styles.colComment }, "Comment"),
			),
			// Table rows
			...data.grades.map((grade, idx) =>
				h(
					View,
					{
						key: grade.subject,
						style: {
							...styles.tableRow,
							...(idx % 2 === 1 ? styles.tableRowAlt : {}),
						},
					},
					h(Text, { style: styles.colSubject }, grade.subject),
					data.assessmentModel === "PRIMARY_DESCRIPTIVE"
						? h(Text, { style: styles.colGrade }, grade.level ?? "—")
						: h(Text, { style: styles.colGrade }, grade.currentGrade ?? "—"),
					data.assessmentModel === "PRIMARY_DESCRIPTIVE"
						? h(Text, { style: styles.colEffort }, grade.effort ?? "—")
						: h(Text, { style: styles.colEffort }, grade.targetGrade ?? "—"),
					h(Text, { style: styles.colComment }, grade.comment ?? ""),
				),
			),
			// General comment
			data.generalComment
				? h(
						View,
						{ style: styles.generalComment },
						h(Text, { style: styles.commentLabel }, "General Comment"),
						h(Text, null, data.generalComment),
					)
				: null,
			// Footer
			h(
				Text,
				{ style: styles.footer },
				`${data.schoolName} · Generated from SchoolConnect on ${new Date().toLocaleDateString("en-GB")}`,
			),
		),
	);

	const stream = await ReactPDF.default.renderToStream(element);

	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.from(chunk));
	}

	return Buffer.concat(chunks);
}
