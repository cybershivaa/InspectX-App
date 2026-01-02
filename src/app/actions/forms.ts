
"use server";

import { z } from "zod";
import { formTemplates } from "@/lib/data";
import { revalidatePath } from "next/cache";

const saveTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type SaveTemplateInput = z.infer<typeof saveTemplateSchema>;

export async function saveFormTemplate(input: SaveTemplateInput) {
  try {
    const validationResult = saveTemplateSchema.safeParse(input);
    if (!validationResult.success) {
      return { success: false, error: "Invalid input data." };
    }

    const { id, name, description } = validationResult.data;

    if (id) {
      // Update existing template
      const templateIndex = formTemplates.findIndex(t => t.id === id);
      if (templateIndex === -1) {
        return { success: false, error: "Template not found." };
      }
      formTemplates[templateIndex] = {
        ...formTemplates[templateIndex],
        name,
        description: description || "",
      };
    } else {
      // Create new template
      const newTemplate = {
        id: `ft${formTemplates.length + 1}`,
        name,
        description: description || "",
        fields: [], // Start with no fields
      };
      formTemplates.push(newTemplate);
    }
    
    revalidatePath("/form-builder");
    revalidatePath(`/form-builder/${id || 'new'}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to save form template:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}

    