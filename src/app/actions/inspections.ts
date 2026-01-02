
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, setDoc, getDoc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
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


export async function getInspectionById(id: string) {
    try {
        const inspectionDocRef = doc(db, "inspections", id);
        const docSnap = await getDoc(inspectionDocRef);

        if (!docSnap.exists()) {
            return { success: false, error: "Inspection not found." };
        }
        
        const data = serializeTimestamps({ id: docSnap.id, ...docSnap.data() }) as Inspection;
        return { success: true, data };

    } catch (error) {
        console.error("Failed to fetch inspection:", error);
        return { success: false, error: "An unexpected error occurred while fetching the inspection." };
    }
}


const reportSchema = z.object({
  agencyName: z.string(),
  areaDetails: z.string(),
  unitNo: z.string(),
  inspectionDate: z.date(),
  equipmentDetails: z.string(),
  machineSlNo: z.string(),
  checkType: z.string(),
  equipmentName: z.array(z.string()),
  reportNo: z.string(),
});

const createInspectionSchema = z.object({
  machineName: z.string(),
  priority: z.enum(["Low", "Medium", "High"]),
  notes: z.string().optional(),
  fullReport: reportSchema.optional(),
  machineSlNo: z.string(),
});

type CreateInspectionInput = z.infer<typeof createInspectionSchema>;

export async function createInspectionCall(input: CreateInspectionInput, requestedBy: string) {
  try {
    const validationResult = createInspectionSchema.safeParse(input);
    if (!validationResult.success) {
      console.error("Invalid input data:", validationResult.error.flatten());
      return { success: false, error: "Invalid input data." };
    }
    
    const { machineName, priority, notes, fullReport, machineSlNo } = validationResult.data;

    const newInspection = {
      machineId: fullReport?.reportNo || `rep-${Date.now()}`,
      machineSlNo: machineSlNo,
      machineName: machineName,
      priority,
      status: "Upcoming" as const,
      requestedBy,
      requestDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Due in 10 days
      notes: notes || fullReport?.equipmentDetails,
      fullReportData: fullReport ? {
        ...fullReport,
        inspectionDate: fullReport.inspectionDate.toISOString(),
      } : null,
      createdAt: Timestamp.now(),
    };
    
    const docRef = await addDoc(collection(db, "inspections"), newInspection);

    await updateDoc(docRef, { id: docRef.id });
    
    revalidatePath("/dashboard");
    revalidatePath("/inspections");

    return { success: true, data: { ...newInspection, id: docRef.id, createdAt: newInspection.createdAt.toDate().toISOString() } };
  } catch (error) {
    console.error("Failed to create inspection call:", error);
    return { success: false, error: "An unexpected error occurred while creating the inspection call." };
  }
}

const updateInspectionSchema = z.object({
  id: z.string(),
  status: z.enum(["Upcoming", "Pending", "Completed", "Failed", "Partial"]),
});

type UpdateInspectionInput = z.infer<typeof updateInspectionSchema>;

export async function updateInspection(input: UpdateInspectionInput) {
  try {
    const validationResult = updateInspectionSchema.safeParse(input);
    if (!validationResult.success) {
      return { success: false, error: "Invalid input data." };
    }
    
    const { id, status } = validationResult.data;
    const inspectionDocRef = doc(db, "inspections", id);
    
    await setDoc(inspectionDocRef, { status }, { merge: true });

    const updatedDoc = await getDoc(inspectionDocRef);
    if (!updatedDoc.exists()) {
        return { success: false, error: "Inspection not found after update." };
    }
    
    const updatedInspection = {id: updatedDoc.id, ...serializeTimestamps(updatedDoc.data())} as Inspection;

    revalidatePath("/inspections");
    revalidatePath("/dashboard");
    
    return { success: true, data: updatedInspection };
  } catch (error) {
    console.error("Failed to update inspection:", error);
    return { success: false, error: "An unexpected error occurred while updating the inspection." };
  }
}

const detailedCheckSchema = z.object({
  result: z.enum(["OK", "Not OK", "Not Applicable"]),
  remarks: z.string().optional(),
  imagePath: z.string().optional(),
});

const deviationSchema = z.object({
  deviations: z.string().optional(),
  rectification: z.string().optional(),
  imagePath: z.string().optional(),
});


const miscInspectionSchema = z.object({
  location: z.string().min(1, "Location is required."),
  systemName: z.string().min(1, "System/Equipment name is required."),
  deviations: z.array(deviationSchema),
});


const powerTransformerInspectionSchema = z.object({
  location: z.string().min(1, "Location is required."),
  systemName: z.string().min(1, "System/Equipment name is required."),
  inspectionTestDetails: z.string().min(1, "Inspection/Test Details are required."),
  deviationsPendingPoints: z.string().min(1, "Deviations/Pending Point Details are required."),
  testReportsPath: z.string().optional(),
  deviations: z.array(deviationSchema),
});

const signatureSchema = z.object({
  name: z.string().optional().nullable(),
  signature: z.string().optional().nullable(),
});


const inspectionReportSchema = z.object({
  // Step 1
  agencyName: z.string().min(1, "Agency name is required."),
  areaDetails: z.string().min(1, "Area details is required."),
  unitNo: z.string().min(1, "Unit number is required."),
  inspectionDate: z.date(),
  equipmentDetails: z.string().min(1, "Equipment details are required."),
  machineSlNo: z.string().min(1, "Machine SL No. is required."),
  checkType: z.string(),
  equipmentName: z.array(z.string()),
  reportNo: z.string().min(1, "Report number is required."),
  
  // HT/LT Motor - TQP
  ambientTemp: z.string().optional(),
  relativeHumidity: z.string().optional(),
  
  // Step 2 (HT/LT Motor)
  installation: detailedCheckSchema.optional(),
  damage: detailedCheckSchema.optional(),
  cleanliness: detailedCheckSchema.optional(),
  termination: detailedCheckSchema.optional(),
  earthing: detailedCheckSchema.optional(),
  rotation: detailedCheckSchema.optional(),
  windingTemp: detailedCheckSchema.optional(),
  testingKitsCalibration: detailedCheckSchema.optional(),
  motorIrPiWr: detailedCheckSchema.optional(),
  spaceHeaterIrWr: detailedCheckSchema.optional(),

  // Step 2 (Cable Laying)
  layingOfCable: detailedCheckSchema.optional(),
  trefoilFormation: detailedCheckSchema.optional(),
  dressingOfCables: detailedCheckSchema.optional(),
  layingOfDifferentVoltages: detailedCheckSchema.optional(),
  testingBeforeLaying: detailedCheckSchema.optional(),
  cableIdentificationTags: detailedCheckSchema.optional(),
  bendingRadius: detailedCheckSchema.optional(),
  earthingOfSheath: detailedCheckSchema.optional(),

  // Step 2 (Testing Power Cables)
  calibrationOfTestingKits: detailedCheckSchema.optional(),
  cableIrAndHighVoltageTesting: detailedCheckSchema.optional(),

  // Step 2 (Cable Trays)
  layingOfCableTrays: detailedCheckSchema.optional(),
  qualificationOfWelders: detailedCheckSchema.optional(),
  fixingOfCableTraySupports: detailedCheckSchema.optional(),
  straightnessAlignmentOfCableTray: detailedCheckSchema.optional(),
  alignmentSpacingBetweenTrays: detailedCheckSchema.optional(),
  tightnessOfCoupler: detailedCheckSchema.optional(),
  earthingOfTrays: detailedCheckSchema.optional(),
  trayNumbering: detailedCheckSchema.optional(),
  cableTrayWeldingJoints: detailedCheckSchema.optional(),
  installationOfCableTrays: detailedCheckSchema.optional(),

  // Step 2 (Earthing System)
  sizeOfEarthingMaterial: detailedCheckSchema.optional(),
  layingOfEarthStrip: detailedCheckSchema.optional(),
  weldingOfEarthStrip: detailedCheckSchema.optional(),
  applicationOfProtectivePaint: detailedCheckSchema.optional(),
  preparationOfEarthPit: detailedCheckSchema.optional(),
  installationOfEarthElectrode: detailedCheckSchema.optional(),
  connectionOfEarthStrip: detailedCheckSchema.optional(),
  preparationOfConcretePit: detailedCheckSchema.optional(),
  continuityOfEarthingSystem: detailedCheckSchema.optional(),
  resistanceOfTheEarthElectrode: detailedCheckSchema.optional(),

  // Step 2 (HT/LT Switchgear)
  installationOfSwitchgear: detailedCheckSchema.optional(),
  cleanlinessOfPanels: detailedCheckSchema.optional(),
  mountingAndAlignment: detailedCheckSchema.optional(),
  connectionOfBusbar: detailedCheckSchema.optional(),
  earthingOfSwitchgear: detailedCheckSchema.optional(),
  alignmentOfBusbars: detailedCheckSchema.optional(),
  unusedHoles: detailedCheckSchema.optional(),
  conditionOfGaskets: detailedCheckSchema.optional(),
  continuityOfMainAndAuxiliaryCircuits: detailedCheckSchema.optional(),
  calibrationOfTestingKitsForSwitchgear: detailedCheckSchema.optional(),
  irOfMainAndAuxiliaryBus: detailedCheckSchema.optional(),

  // Step 2 (LT Panels)
  installationOfPanels: detailedCheckSchema.optional(),
  markingAndDesignationOfPanels: detailedCheckSchema.optional(),
  earthingOfPanels: detailedCheckSchema.optional(),
  useOfCableGlands: detailedCheckSchema.optional(),
  calibrationOfTestingKitsForPanels: detailedCheckSchema.optional(),
  irOfBusbarsCablesWires: detailedCheckSchema.optional(),
  testingOfLightingTransformer: detailedCheckSchema.optional(),


  // Step 2 (Tundish / Busduct)
  layingOfBusduct: detailedCheckSchema.optional(),
  cleaningOfBusducts: detailedCheckSchema.optional(),
  fixingOfFishPlates: detailedCheckSchema.optional(),
  fixingOfSupportStructure: detailedCheckSchema.optional(),
  earthingOfTheBusduct: detailedCheckSchema.optional(),
  spaceHeater: detailedCheckSchema.optional(),
  irAndHvOfBusduct: detailedCheckSchema.optional(),
  calibrationOfTestingKitsForBusduct: detailedCheckSchema.optional(),

  // Step 2 (Station Lighting)
  mountingOfLightingFixtures: detailedCheckSchema.optional(),
  mountingOfLightingPanel: detailedCheckSchema.optional(),
  designationOfLighting: detailedCheckSchema.optional(),
  markingInAcEmergency: detailedCheckSchema.optional(),
  cablesEntryInLightingPanel: detailedCheckSchema.optional(),
  layingAndMarkingOfConduits: detailedCheckSchema.optional(),
  pullOutBoxes: detailedCheckSchema.optional(),
  wiringOfLightingFixtures: detailedCheckSchema.optional(),
  separateWiringForReceptacles: detailedCheckSchema.optional(),
  earthingOfConduits: detailedCheckSchema.optional(),
  wiringInConduits: detailedCheckSchema.optional(),
  wiringInBatteryRoom: detailedCheckSchema.optional(),
  irOfLightingSystem: detailedCheckSchema.optional(),

  // Step 2 (Lighting Poles)
  readinessOfCivilFoundation: detailedCheckSchema.optional(),
  mountingOfPoles: detailedCheckSchema.optional(),
  earthingOfPoles: detailedCheckSchema.optional(),
  cableEntryUnderPole: detailedCheckSchema.optional(),
  dressingOfPoleCables: detailedCheckSchema.optional(),
  numberingOfPoles: detailedCheckSchema.optional(),
  lanternCarriageFunction: detailedCheckSchema.optional(),
  testingOfHighMastCablesMotor: detailedCheckSchema.optional(),
  
  // Step 2 (Miscellaneous Equipment)
  miscInspections: z.array(miscInspectionSchema).optional(),

  // Step 2 (Power Transformer)
  powerTransformerInspections: z.array(powerTransformerInspectionSchema).optional(),

  // Step 3
  otherRemarks: z.string().optional(),
  reportUrl: z.string().optional(),
  signatureContractor: signatureSchema.optional(),
  signatureNTPCErection: signatureSchema.optional(),
  signatureNTPCFQA: signatureSchema.optional(),
  inspectedBy: z.string().optional(),
});

type InspectionReportInput = z.infer<typeof inspectionReportSchema>;


export async function submitInspectionReport(inspectionId: string, input: InspectionReportInput) {
  try {
    const validationResult = inspectionReportSchema.safeParse(input);
    if (!validationResult.success) {
      console.error("Invalid input data:", validationResult.error.flatten());
      return { success: false, error: "Invalid input data." };
    }
    
    const inspectionDocRef = doc(db, "inspections", inspectionId);

    // Convert date to ISO string for Firestore serialization
    const reportData = {
        ...validationResult.data,
        inspectionDate: validationResult.data.inspectionDate.toISOString(),
    };
    
    await updateDoc(inspectionDocRef, {
        fullReportData: reportData,
        machineSlNo: reportData.machineSlNo,
        status: "Completed",
        inspectedBy: reportData.inspectedBy,
    });

    revalidatePath("/dashboard");
    revalidatePath("/inspections");

    return { success: true };
  } catch (error) {
    console.error("Failed to submit inspection report:", error);
    return { success: false, error: "An unexpected error occurred while submitting the report." };
  }
}
