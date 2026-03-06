
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase";
import type { FormTemplate } from "@/lib/types";

const fieldSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'dropdown', 'date', 'yesno', 'pdf', 'photo']),
  label: z.string(),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
});

const saveTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  fields: z.array(fieldSchema).optional().default([]),
  assignedMachineIds: z.array(z.string()).optional().default([]),
});

type SaveTemplateInput = z.infer<typeof saveTemplateSchema>;

export async function getFormTemplates(): Promise<FormTemplate[]> {
  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.from('form_templates').select('*');
    if (error) return [];
    return (data as FormTemplate[]) || [];
  } catch {
    return [];
  }
}

export async function getFormTemplateById(id: string): Promise<FormTemplate | null> {
  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from('form_templates')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data as FormTemplate;
  } catch {
    return null;
  }
}

export async function saveFormTemplate(input: SaveTemplateInput) {
  try {
    const validationResult = saveTemplateSchema.safeParse(input);
    if (!validationResult.success) {
      return { success: false, error: "Invalid input data." };
    }

    const supabaseAdmin = createAdminClient();
    const { id, name, description, fields, assignedMachineIds } = validationResult.data;

    if (id) {
      const { error } = await supabaseAdmin
        .from('form_templates')
        .update({
          name,
          description: description || "",
          fields: fields || [],
          assignedmachineids: assignedMachineIds || [],
        })
        .eq('id', id);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabaseAdmin
        .from('form_templates')
        .insert({
          name,
          description: description || "",
          fields: fields || [],
          assignedmachineids: assignedMachineIds || [],
        });
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

export async function assignFormToMachines(templateId: string, machineIds: string[]) {
  try {
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from('form_templates')
      .update({ assignedmachineids: machineIds })
      .eq('id', templateId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/form-builder");
    return { success: true };
  } catch (error) {
    console.error("Failed to assign form to machines:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function deleteFormTemplate(id: string) {
  try {
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.from('form_templates').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/form-builder");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete form template:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}
