'use server';

/**
 * @fileOverview AI-powered anomaly detection flow for inspection data.
 *
 * - flagAnomalies - A function that flags unusual patterns or deviations in inspection data.
 * - FlagAnomaliesInput - The input type for the flagAnomalies function, including inspection data.
 * - FlagAnomaliesOutput - The return type for the flagAnomalies function, indicating detected anomalies.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the schema for inspection data
const InspectionDataSchema = z.object({
  machineId: z.string().describe('The ID of the machine being inspected.'),
  timestamp: z.string().describe('The timestamp of the inspection data.'),
  readings: z.record(z.string(), z.number()).describe('A map of sensor readings.'),
});

// Define the input schema for the anomaly detection flow
const FlagAnomaliesInputSchema = z.object({
  inspectionData: z.array(InspectionDataSchema).describe('The inspection data to analyze.'),
});
export type FlagAnomaliesInput = z.infer<typeof FlagAnomaliesInputSchema>;

// Define the output schema for the anomaly detection flow
const AnomalySchema = z.object({
  machineId: z.string().describe('The ID of the machine with the anomaly.'),
  timestamp: z.string().describe('The timestamp of the anomaly.'),
  message: z.string().describe('A description of the anomaly.'),
});

const FlagAnomaliesOutputSchema = z.object({
  anomalies: z.array(AnomalySchema).describe('The list of detected anomalies.'),
});
export type FlagAnomaliesOutput = z.infer<typeof FlagAnomaliesOutputSchema>;

export async function flagAnomalies(input: FlagAnomaliesInput): Promise<FlagAnomaliesOutput> {
  return flagAnomaliesFlow(input);
}

// Define the prompt for anomaly detection
const anomalyDetectionPrompt = ai.definePrompt({
  name: 'anomalyDetectionPrompt',
  input: {schema: FlagAnomaliesInputSchema},
  output: {schema: FlagAnomaliesOutputSchema},
  prompt: `You are an AI expert in identifying anomalies in machine inspection data.

  Analyze the following inspection data and identify any unusual patterns or deviations.
  Return a list of anomalies, including the machine ID, timestamp, and a description of the anomaly.

  Inspection Data:
  {{#each inspectionData}}
  Machine ID: {{machineId}}
  Timestamp: {{timestamp}}
  Readings:
  {{#each readings}}
  {{@key}}: {{this}}
  {{/each}}
  {{/each}}

  Anomalies:`, // Ensure the prompt ends with 'Anomalies:' to guide the LLM output.
});

// Define the anomaly detection flow
const flagAnomaliesFlow = ai.defineFlow(
  {
    name: 'flagAnomaliesFlow',
    inputSchema: FlagAnomaliesInputSchema,
    outputSchema: FlagAnomaliesOutputSchema,
  },
  async input => {
    const {output} = await anomalyDetectionPrompt(input);
    return output!;
  }
);
