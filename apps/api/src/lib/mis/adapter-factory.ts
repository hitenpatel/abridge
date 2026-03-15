import { CsvAdapter } from "./csv-adapter";
import { SimsAdapter } from "./sims-adapter";
import type { MisAdapter } from "./types";

export function getAdapter(
	provider: string,
	apiUrl?: string | null,
	credentials?: string,
): MisAdapter {
	switch (provider) {
		case "CSV_MANUAL":
			return new CsvAdapter();
		case "SIMS":
			if (!apiUrl || !credentials) throw new Error("SIMS requires apiUrl and credentials");
			return new SimsAdapter(apiUrl, credentials);
		default:
			throw new Error(`Unsupported MIS provider: ${provider}`);
	}
}
