import { expect, test } from "@playwright/test";
import {
	enableSchoolFeature,
	getSchoolByURN,
	getUserByEmail,
	seedChatConversation,
	seedChatMessage,
	seedChildForParent,
} from "./helpers/seed-data";

/**
 * Parent-Teacher Chat E2E Journey
 * Tests: starting a chat, viewing messages, feature disabled state.
 */
test.describe("Parent-Teacher Chat", () => {
	let parentEmail: string;
	let uniqueURN: string;

	test.beforeEach(() => {
		uniqueURN = Math.floor(100000 + Math.random() * 900000).toString();
		parentEmail = `parent-chat-${uniqueURN}@e2e-test.com`;
	});

	test("parent should start a chat with staff", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`Chat School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-chat-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register as parent ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Chat Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed data ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({
			schoolId: school.id,
			features: { liveChatEnabled: true },
		});

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Sophie",
			lastName: "Chat",
		});

		// === STEP 4: Navigate to chat ===
		await page.reload();
		await page.getByRole("link", { name: /Chat/i }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/chat/);

		// === STEP 5: Verify chat page loaded ===
		await expect(page.getByRole("heading", { name: /Chat/i })).toBeVisible({ timeout: 10000 });
		await expect(page.getByText(/Chat with your child/i)).toBeVisible();

		// === STEP 6: Click New Chat button (icon-only button with aria-label) ===
		await page.getByLabel("New Chat").click();
		await expect(page.getByRole("heading", { name: "New Chat" })).toBeVisible();

		// === STEP 7: Verify staff selector is shown ===
		await expect(page.getByText("Select Staff Member")).toBeVisible();
	});

	test("parent should view conversation with messages", async ({ page }) => {
		// === STEP 1: Setup school ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`ChatMsg School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-chatmsg-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register parent ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("Message Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// === STEP 3: Seed data with conversation and messages ===
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await enableSchoolFeature({
			schoolId: school.id,
			features: { liveChatEnabled: true },
		});

		const child = await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Max",
			lastName: "Chat",
		});

		// Create a staff member for the conversation
		const staffEmail = `staff-chat-${uniqueURN}@test.com`;
		const { prisma } = await import("./helpers/seed-data");
		const staffUser = await prisma.user.create({
			data: {
				email: staffEmail,
				name: "Mrs Teacher",
			},
		});
		await prisma.staffMember.create({
			data: {
				userId: staffUser.id,
				schoolId: school.id,
				role: "TEACHER",
			},
		});

		const conv = await seedChatConversation({
			schoolId: school.id,
			parentId: user.id,
			staffId: staffUser.id,
			subject: "Homework help",
		});

		await seedChatMessage({
			conversationId: conv.id,
			senderId: user.id,
			body: "Could you help with the maths worksheet?",
		});

		await seedChatMessage({
			conversationId: conv.id,
			senderId: staffUser.id,
			body: "Of course! Please see the attachment.",
		});

		// === STEP 4: Navigate to chat ===
		await page.reload();
		await page.getByRole("link", { name: /Chat/i }).first().click();
		await expect(page).toHaveURL(/\/dashboard\/chat/);

		// === STEP 5: Verify conversations list shows the conversation ===
		await expect(async () => {
			await page.reload();
			await expect(page.getByText("Mrs Teacher")).toBeVisible();
			await expect(page.getByText("Homework help")).toBeVisible();
		}).toPass({ timeout: 15000 });

		// === STEP 6: Click on the conversation ===
		await page.getByText("Mrs Teacher").click();

		// === STEP 7: Verify messages are visible ===
		await expect(page.getByText("Could you help with the maths worksheet?")).toBeVisible({
			timeout: 10000,
		});
		await expect(page.getByText("Of course! Please see the attachment.")).toBeVisible();
	});

	test("chat page should show disabled state", async ({ page }) => {
		// === STEP 1: Setup school without enabling chat ===
		await page.goto("http://localhost:3000/setup");
		await page.getByLabel("School Name").fill(`NoChat School ${uniqueURN}`);
		await page.getByLabel("Ofsted URN").fill(uniqueURN);
		await page.getByLabel("Admin Email").fill(`admin-nochat-${uniqueURN}@test.com`);
		await page.getByLabel("Setup Key").fill("admin123");
		await page.getByRole("button", { name: /Create School/i }).click();
		await expect(page.getByText("School Created!")).toBeVisible({ timeout: 10000 });

		// === STEP 2: Register parent ===
		await page.goto("http://localhost:3000/register");
		await page.getByLabel("Full Name").fill("NoChat Parent");
		await page.getByLabel("Email Address").fill(parentEmail);
		await page.getByLabel("Password").fill("ParentPassword123!");
		await page.getByRole("button", { name: /Register/i }).click();
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });

		// Seed a child so the parent has a school association (but DON'T enable liveChatEnabled)
		const school = await getSchoolByURN(uniqueURN);
		const user = await getUserByEmail(parentEmail);
		if (!school || !user) throw new Error("Failed to get school or user");

		await seedChildForParent({
			userId: user.id,
			schoolId: school.id,
			firstName: "Test",
			lastName: "Child",
		});

		// === STEP 3: Navigate directly to chat ===
		await page.goto("http://localhost:3000/dashboard/chat");

		// === STEP 4: Should show disabled message ===
		await expect(page.getByRole("heading", { name: /Live Chat is not enabled/i })).toBeVisible({
			timeout: 10000,
		});
	});
});
