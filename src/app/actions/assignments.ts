
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase";
import type { Inspection } from "@/lib/types";

const assignInspectionSchema = z.object({
  inspectionId: z.string(),
  inspectorId: z.string(),
  inspectorName: z.string(),
});

export async function assignInspection(inspectionId: string, inspectorId: string, inspectorName: string) {
  try {
    const validationResult = assignInspectionSchema.safeParse({ inspectionId, inspectorId, inspectorName });
    if (!validationResult.success) {
      return { success: false, error: "Invalid input data." };
    }

    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from('inspections')
      .update({
        assignedto: inspectorName,
        status: "Pending",
      })
      .eq('id', inspectionId)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Inspection not found after update." };
    }

    revalidatePath("/inspections");
    revalidatePath("/dashboard");

    return { success: true, data: data as Inspection };
  } catch (error) {
    console.error("Failed to assign inspection:", error);
    return { success: false, error: "An unexpected error occurred while assigning the inspection." };
  }
}
