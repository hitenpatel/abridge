import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router, schoolAdminProcedure, schoolStaffProcedure } from "../trpc";

function generateSlots(
	startTime: string,
	endTime: string,
	slotDurationMin: number,
	breakDurationMin: number,
): { start: string; end: string }[] {
	const slots: { start: string; end: string }[] = [];
	const [startH, startM] = startTime.split(":").map(Number) as [number, number];
	const [endH, endM] = endTime.split(":").map(Number) as [number, number];
	let currentMin = startH * 60 + startM;
	const endMin = endH * 60 + endM;

	while (currentMin + slotDurationMin <= endMin) {
		const slotStart = `${String(Math.floor(currentMin / 60)).padStart(2, "0")}:${String(currentMin % 60).padStart(2, "0")}`;
		const slotEndMin = currentMin + slotDurationMin;
		const slotEnd = `${String(Math.floor(slotEndMin / 60)).padStart(2, "0")}:${String(slotEndMin % 60).padStart(2, "0")}`;
		slots.push({ start: slotStart, end: slotEnd });
		currentMin = slotEndMin + breakDurationMin;
	}

	return slots;
}

export const parentsEveningRouter = router({
	create: schoolAdminProcedure
		.input(
			z.object({
				title: z.string().min(1),
				date: z.date(),
				slotDurationMin: z.number().min(5).max(60).default(10),
				breakDurationMin: z.number().min(0).max(30).default(0),
				startTime: z.string().regex(/^\d{2}:\d{2}$/),
				endTime: z.string().regex(/^\d{2}:\d{2}$/),
				bookingOpensAt: z.date(),
				bookingClosesAt: z.date(),
				allowVideoCall: z.boolean().default(false),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const evening = await ctx.prisma.parentsEvening.create({
				data: {
					schoolId: ctx.schoolId,
					title: input.title,
					date: input.date,
					slotDurationMin: input.slotDurationMin,
					breakDurationMin: input.breakDurationMin,
					startTime: input.startTime,
					endTime: input.endTime,
					bookingOpensAt: input.bookingOpensAt,
					bookingClosesAt: input.bookingClosesAt,
					allowVideoCall: input.allowVideoCall,
				},
			});
			return evening;
		}),

	addTeachers: schoolAdminProcedure
		.input(
			z.object({
				parentsEveningId: z.string(),
				staffIds: z.array(z.string()).min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const evening = await ctx.prisma.parentsEvening.findUnique({
				where: { id: input.parentsEveningId },
			});

			if (!evening || evening.schoolId !== ctx.schoolId) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Parents' evening not found" });
			}

			if (evening.isPublished) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot modify published evening" });
			}

			const staffMembers = await ctx.prisma.staffMember.findMany({
				where: { userId: { in: input.staffIds }, schoolId: ctx.schoolId },
				select: { userId: true },
			});
			const validStaffIds = staffMembers.map((s) => s.userId);

			const timeSlots = generateSlots(
				evening.startTime,
				evening.endTime,
				evening.slotDurationMin,
				evening.breakDurationMin,
			);

			const slotData = validStaffIds.flatMap((staffId) =>
				timeSlots.map((slot) => ({
					parentsEveningId: evening.id,
					staffId,
					startTime: slot.start,
					endTime: slot.end,
				})),
			);

			await ctx.prisma.parentsEveningSlot.createMany({
				data: slotData,
				skipDuplicates: true,
			});

			return { teacherCount: validStaffIds.length, slotsPerTeacher: timeSlots.length };
		}),

	publish: schoolAdminProcedure
		.input(
			z.object({
				parentsEveningId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const evening = await ctx.prisma.parentsEvening.findUnique({
				where: { id: input.parentsEveningId },
				include: { _count: { select: { slots: true } } },
			});

			if (!evening || evening.schoolId !== ctx.schoolId) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Parents' evening not found" });
			}

			if (evening._count.slots === 0) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Add teachers before publishing" });
			}

			await ctx.prisma.parentsEvening.update({
				where: { id: evening.id },
				data: { isPublished: true },
			});

			return { success: true };
		}),

	list: protectedProcedure
		.input(z.object({ schoolId: z.string().optional() }))
		.query(async ({ ctx, input }) => {
			let schoolId = input.schoolId;
			if (!schoolId) {
				const parentLink = await ctx.prisma.parentChild.findFirst({
					where: { userId: ctx.user.id },
					select: { child: { select: { schoolId: true } } },
				});
				schoolId = parentLink?.child.schoolId;
			}

			if (!schoolId) return { items: [] };

			const evenings = await ctx.prisma.parentsEvening.findMany({
				where: { schoolId, isPublished: true },
				orderBy: { date: "desc" },
				select: {
					id: true,
					title: true,
					date: true,
					startTime: true,
					endTime: true,
					bookingOpensAt: true,
					bookingClosesAt: true,
					allowVideoCall: true,
					_count: { select: { slots: true } },
				},
			});

			return { items: evenings };
		}),

	listAll: schoolAdminProcedure.query(async ({ ctx }) => {
		const evenings = await ctx.prisma.parentsEvening.findMany({
			where: { schoolId: ctx.schoolId },
			orderBy: { date: "desc" },
			select: {
				id: true,
				title: true,
				date: true,
				startTime: true,
				endTime: true,
				isPublished: true,
				bookingOpensAt: true,
				bookingClosesAt: true,
				allowVideoCall: true,
				_count: { select: { slots: true } },
			},
		});

		return { items: evenings };
	}),

	getSlots: protectedProcedure
		.input(
			z.object({
				parentsEveningId: z.string(),
				staffId: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const where: Record<string, unknown> = {
				parentsEveningId: input.parentsEveningId,
			};
			if (input.staffId) where.staffId = input.staffId;

			const slots = await ctx.prisma.parentsEveningSlot.findMany({
				where,
				orderBy: [{ staffId: "asc" }, { startTime: "asc" }],
				select: {
					id: true,
					staffId: true,
					startTime: true,
					endTime: true,
					location: true,
					videoCallLink: true,
					parentId: true,
					childId: true,
					bookedAt: true,
					staffNotes: true,
				},
			});

			const staffIds = [...new Set(slots.map((s) => s.staffId))];
			const staffUsers = await ctx.prisma.user.findMany({
				where: { id: { in: staffIds } },
				select: { id: true, name: true },
			});
			const staffMap = new Map(staffUsers.map((s) => [s.id, s.name]));

			return {
				slots: slots.map((s) => ({
					...s,
					staffName: staffMap.get(s.staffId) ?? "Unknown",
					isBooked: !!s.parentId,
					isOwnBooking: s.parentId === ctx.user.id,
				})),
			};
		}),

	book: protectedProcedure
		.input(
			z.object({
				slotId: z.string(),
				childId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const slot = await ctx.prisma.parentsEveningSlot.findUnique({
				where: { id: input.slotId },
				include: { parentsEvening: true },
			});

			if (!slot) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Slot not found" });
			}

			if (slot.parentId) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Slot already booked" });
			}

			const now = new Date();
			if (now < slot.parentsEvening.bookingOpensAt || now > slot.parentsEvening.bookingClosesAt) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Booking is not open" });
			}

			const parentChild = await ctx.prisma.parentChild.findFirst({
				where: { userId: ctx.user.id, childId: input.childId },
			});
			if (!parentChild) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Not your child" });
			}

			const existingBooking = await ctx.prisma.parentsEveningSlot.findFirst({
				where: {
					parentsEveningId: slot.parentsEveningId,
					staffId: slot.staffId,
					parentId: ctx.user.id,
				},
			});
			if (existingBooking) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Already booked with this teacher" });
			}

			await ctx.prisma.parentsEveningSlot.update({
				where: { id: slot.id },
				data: {
					parentId: ctx.user.id,
					childId: input.childId,
					bookedAt: new Date(),
				},
			});

			return { success: true };
		}),

	cancelBooking: protectedProcedure
		.input(z.object({ slotId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const slot = await ctx.prisma.parentsEveningSlot.findUnique({
				where: { id: input.slotId },
				include: { parentsEvening: true },
			});

			if (!slot || slot.parentId !== ctx.user.id) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
			}

			const now = new Date();
			if (now > slot.parentsEvening.bookingClosesAt) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Booking deadline has passed" });
			}

			await ctx.prisma.parentsEveningSlot.update({
				where: { id: slot.id },
				data: { parentId: null, childId: null, bookedAt: null },
			});

			return { success: true };
		}),

	addNotes: schoolStaffProcedure
		.input(
			z.object({
				slotId: z.string(),
				notes: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const slot = await ctx.prisma.parentsEveningSlot.findUnique({
				where: { id: input.slotId },
			});

			if (!slot || slot.staffId !== ctx.user.id) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Not your slot" });
			}

			await ctx.prisma.parentsEveningSlot.update({
				where: { id: slot.id },
				data: { staffNotes: input.notes },
			});

			return { success: true };
		}),

	setVideoLink: schoolStaffProcedure
		.input(
			z.object({
				slotId: z.string(),
				videoCallLink: z.string().url(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const slot = await ctx.prisma.parentsEveningSlot.findUnique({
				where: { id: input.slotId },
			});

			if (!slot || slot.staffId !== ctx.user.id) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Not your slot" });
			}

			await ctx.prisma.parentsEveningSlot.update({
				where: { id: slot.id },
				data: { videoCallLink: input.videoCallLink },
			});

			return { success: true };
		}),
});
