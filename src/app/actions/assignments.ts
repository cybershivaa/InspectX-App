
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, Timestamp } from "firebase/firestore";
import type { Inspection } from "@/lib/types";

// Helper function to safely convert Firestore Timestamps to strings in nested objects
const serializeTimestamps = (docData: any) => {
    if (!docData) return docData;
    const data = { ...docData };
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate().toISOString();
        } else if (data[key] && typeof data[key] === 'object' && !Array.isArray(data[key])) {
            data[key] = serializeTimestamps(data[key]);
        }
    }
    return data;
};

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

    const inspectionDocRef = doc(db, "inspections", inspectionId);

    const updatedData = { 
      assignedTo: inspectorName,
      status: "Pending" as const,
    };
    
    await updateDoc(inspectionDocRef, updatedData);

    const updatedDoc = await getDoc(inspectionDocRef);
    if (!updatedDoc.exists()) {
        return { success: false, error: "Inspection not found after update." };
    }
    const updatedInspection = {id: updatedDoc.id, ...serializeTimestamps(updatedDoc.data())} as Inspection;
    
    revalidatePath("/inspections");
    revalidatePath("/dashboard");

    return { success: true, data: updatedInspection };
  } catch (error) {
    console.error("Failed to assign inspection:", error);
    return { success: false, error: "An unexpected error occurred while assigning the inspection." };
  }
}

    