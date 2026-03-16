import type { PrismaClient, Child } from "@schoolconnect/db";

/**
 * Get the child record linked to a user via Child.userId.
 * Returns the child if the user is a student, null otherwise.
 */
export async function getStudentChild(
	prisma: PrismaClient,
	userId: string,
): Promise<Child | null> {
	return prisma.child.findUnique({
		where: { userId },
	});
}

/**
 * Check if a user is a parent or student of a given child.
 * Returns true if:
 * - The user has a parentChild link to the child, OR
 * - The child's userId matches the user's id (student self-access)
 */
export async function isParentOrStudentOfChild(
	prisma: PrismaClient,
	userId: string,
	childId: string,
): Promise<boolean> {
	// Check student self-access first (single field lookup)
	const child = await prisma.child.findUnique({
		where: { id: childId },
		select: { userId: true },
	});

	if (child?.userId === userId) {
		return true;
	}

	// Check parent-child relationship
	const parentChild = await prisma.parentChild.findFirst({
		where: { userId, childId },
	});

	return parentChild !== null;
}
