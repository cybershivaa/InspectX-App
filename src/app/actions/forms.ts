
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase";
import type { FormTemplate } from "@/lib/types";

const saveTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type SaveTemplateInput = z.infer<typeof saveTemplateSchema>;

export async function getFormTemplates(): Promise<FormTemplate[]> {
  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.from('form_templates').select('*');
    if (error) {
      console.error("getFormTemplates error:", error.message);
      return [];
    }
    return (data as FormTemplate[]) || [];
  } catch (error) {
    console.error("getFormTemplates unexpected error:", error);
    return [];
  }
}

export async function saveFormTemplate(input: SaveTemplateInput) {
  try {
    const validationResult = saveTemplateSchema.safeParse(input);
    if (!validationResult.success) {
      return { success: false, error: "Invalid input data." };
    }

    const supabaseAdmin = createAdminClient();
    const { id, name, description } = validationResult.data;

    if (id) {
      // Update existing template
      const { error } = await supabaseAdmin
        .from('form_templates')
        .update({ name, description: description || "" })
        .eq('id', id);
      if (error) return { success: false, error: error.message };
    } else {
      // Create new template
      const { error } = await supabaseAdmin
        .from('form_templates')
        .insert({ name, description: description || "", fields: [] });
      if (error) return { success: false, error: error.message };
    }

    revalidatePath("/form-builder");
    revalidatePath(`/form-builder/${id || 'new'}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to save form template:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}
