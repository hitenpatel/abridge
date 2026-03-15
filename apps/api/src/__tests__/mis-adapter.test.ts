import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isSyncDue } from "../lib/mis-sync-cron";
import { getAdapter } from "../lib/mis/adapter-factory";
import { CsvAdapter } from "../lib/mis/csv-adapter";
import { SimsAdapter } from "../lib/mis/sims-adapter";

vi.mock("../lib/redis", () => ({
	getCachedStaffMembership: vi.fn().mockResolvedValue(null),
	setCachedStaffMembership: vi.fn().mockResolvedValue(undefined),
}));

describe("MIS adapter factory", () => {
	it("returns CsvAdapter for CSV_MANUAL", () => {
		const adapter = getAdapter("CSV_MANUAL");
		expect(adapter).toBeInstanceOf(CsvAdapter);
	});

	it("returns SimsAdapter for SIMS", () => {
		const adapter = getAdapter("SIMS", "https://sims.example.com/api", "admin:password");
		expect(adapter).toBeInstanceOf(SimsAdapter);
	});

	it("throws for SIMS without credentials", () => {
		expect(() => getAdapter("SIMS")).toThrow("SIMS requires apiUrl and credentials");
	});

	it("throws for unsupported provider", () => {
		expect(() => getAdapter("UNKNOWN_PROVIDER")).toThrow(
			"Unsupported MIS provider: UNKNOWN_PROVIDER",
		);
	});
});

describe("SIMS adapter", () => {
	const originalFetch = global.fetch;

	beforeEach(() => {
		global.fetch = vi.fn();
	});

	afterEach(() => {
		global.fetch = originalFetch;
	});

	it("maps SIMS student fields correctly", async () => {
		const simsStudents = [
			{
				forename: "Alice",
				surname: "Smith",
				dob: "2018-03-15",
				year: "Year 1",
				reg_group: "1A",
			},
			{
				forename: "Bob",
				surname: "Jones",
				dob: "2017-09-01",
				year: "Year 2",
				reg_group: "2B",
			},
		];

		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(simsStudents),
		});

		const adapter = new SimsAdapter("https://sims.example.com/api", "admin:password");
		const result = await adapter.syncStudents("");

		expect(result.records).toHaveLength(2);
		expect(result.errors).toHaveLength(0);

		expect(result.records[0]).toEqual({
			firstName: "Alice",
			lastName: "Smith",
			dateOfBirth: new Date("2018-03-15"),
			yearGroup: "Year 1",
			className: "1A",
		});

		expect(result.records[1]).toEqual({
			firstName: "Bob",
			lastName: "Jones",
			dateOfBirth: new Date("2017-09-01"),
			yearGroup: "Year 2",
			className: "2B",
		});

		// Verify auth header was sent
		expect(global.fetch).toHaveBeenCalledWith(
			"https://sims.example.com/api/students",
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: expect.stringContaining("Basic "),
				}),
			}),
		);
	});

	it("maps SIMS attendance codes correctly", async () => {
		const simsAttendance = [
			{
				forename: "Alice",
				surname: "Smith",
				dob: "2018-03-15",
				date: "2026-03-10",
				session: "AM",
				code: "/",
			},
			{
				forename: "Bob",
				surname: "Jones",
				dob: "2017-09-01",
				date: "2026-03-10",
				session: "PM",
				code: "N",
			},
		];

		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(simsAttendance),
		});

		const adapter = new SimsAdapter("https://sims.example.com/api", "admin:password");
		const result = await adapter.syncAttendance("");

		expect(result.records).toHaveLength(2);
		expect(result.records[0]?.mark).toBe("PRESENT");
		expect(result.records[1]?.mark).toBe("ABSENT_UNAUTHORISED");
	});

	it("testConnection returns true on 200", async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			status: 200,
		});

		const adapter = new SimsAdapter("https://sims.example.com/api", "admin:password");
		const result = await adapter.testConnection();

		expect(result).toBe(true);
		expect(global.fetch).toHaveBeenCalledWith(
			"https://sims.example.com/api/ping",
			expect.any(Object),
		);
	});

	it("testConnection returns false on failure", async () => {
		(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

		const adapter = new SimsAdapter("https://sims.example.com/api", "admin:password");
		const result = await adapter.testConnection();

		expect(result).toBe(false);
	});
});

describe("isSyncDue", () => {
	it("returns false for MANUAL frequency", () => {
		expect(isSyncDue("MANUAL", null)).toBe(false);
	});

	it("returns true when lastSyncAt is null", () => {
		expect(isSyncDue("DAILY", null)).toBe(true);
	});

	it("returns true when enough time has elapsed", () => {
		const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
		expect(isSyncDue("DAILY", yesterday)).toBe(true);
	});

	it("returns false when not enough time has elapsed", () => {
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
		expect(isSyncDue("DAILY", oneHourAgo)).toBe(false);
	});
});
