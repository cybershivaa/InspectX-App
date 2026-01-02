
"use server";

import { flagAnomalies } from "@/ai/flows/flag-anomalies";
import type { FlagAnomaliesInput } from "@/ai/flows/flag-anomalies";

export async function detectAnomalies(input: FlagAnomaliesInput) {
  try {
    const result = await flagAnomalies(input);
    return { success: true, data: result };
  } catch (error) {
    console.error("Anomaly detection failed:", error);
    return { success: false, error: "Failed to detect anomalies." };
  }
}

    