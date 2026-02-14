import { z } from "zod";
import type { FixtureName } from "../fixtures/factories.js";

const platformSchema = z.enum(["web", "mobile"]);
const actionTypeSchema = z.enum([
	"navigate",
	"tap",
	"fill",
	"scroll",
	"wait",
	"long-press",
]);
const assertionTypeSchema = z.enum([
	"visible",
	"not-visible",
	"count",
	"navigate-back",
]);

const selectorsSchema = z.object({
	web: z.string(),
	mobile: z.string(),
});

const stepSchema = z.object({
	action: actionTypeSchema,
	target: z.string(),
	selectors: selectorsSchema,
	value: z.string().optional(),
});

const assertionSchema = z.object({
	type: assertionTypeSchema,
	text: z.string().optional(),
	target: z.string().optional(),
	count: z.number().optional(),
});

const preconditionSchema = z.object({
	seed: z.string(),
	state: z.enum(["authenticated", "unauthenticated"]),
});

export const journeySchema = z.object({
	journey: z.object({
		id: z.string(),
		name: z.string(),
		tags: z.array(z.string()),
		role: z.enum(["staff", "parent"]),
		skipPlatforms: z.array(platformSchema).optional(),
		preconditions: preconditionSchema,
		steps: z.array(stepSchema),
		assertions: z.array(assertionSchema),
	}),
});

export type Journey = z.infer<typeof journeySchema>["journey"];
export type Step = z.infer<typeof stepSchema>;
export type Assertion = z.infer<typeof assertionSchema>;
export type Precondition = z.infer<typeof preconditionSchema>;
export type ActionType = z.infer<typeof actionTypeSchema>;
export type Platform = z.infer<typeof platformSchema>;

export type JourneyWithDomain = Journey & {
	domain: string;
	filePath: string;
};
