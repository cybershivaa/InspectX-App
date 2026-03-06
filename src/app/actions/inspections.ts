
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase";
import type { Inspection } from "@/lib/types";
import { createNotificationForRole, createNotification } from "@/app/actions/notifications";
import { createActivityLog } from "@/app/actions/activity-logs";


export async function getInspectionById(id: string) {
    try {
        const supabaseAdmin = createAdminClient();
        const { data, error } = await supabaseAdmin
            .from('inspections')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            return { success: false, error: "Inspection not found." };
        }

        return { success: true, data: data as Inspection };

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

    const supabaseAdmin = createAdminClient();
    const { machineName, priority, notes, fullReport, machineSlNo } = validationResult.data;

    const newInspection = {
      machineid: fullReport?.reportNo || `rep-${Date.now()}`,
      machineslno: machineSlNo,
      machinename: machineName,
      priority,
      status: "Upcoming",
      requestedby: requestedBy,
      requestdate: new Date().toISOString().split('T')[0],
      duedate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: notes || fullReport?.equipmentDetails || null,
      fullreportdata: fullReport ? {
        ...fullReport,
        inspectionDate: fullReport.inspectionDate.toISOString(),
      } : null,
      createdat: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('inspections')
      .insert(newInspection)
      .select()
      .single();

    if (error || !data) {
      console.error("createInspectionCall insert error:", error?.message);
      return { success: false, error: error?.message || "Failed to create inspection." };
    }

    revalidatePath("/dashboard");
    revalidatePath("/inspections");

    // Notify all Admins about the new inspection call
    await createNotificationForRole({
      title: "New Inspection Call",
      message: "New inspection call for " + machineName + " created by " + requestedBy,
      role: "Admin",
      type: "NEW_INSPECTION_CALL",
      reference_id: data.id,
    });

    // Log activity
    await createActivityLog({
      action: "INSPECTION_CREATED",
      entity_type: "inspection",
      entity_id: data.id,
      entity_name: machineName,
      details: "Inspection call created for " + machineName + " with priority " + priority,
      performed_by: requestedBy,
      performed_by_role: "Client",
    });

    return { success: true, data: data as Inspection };
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

    const supabaseAdmin = createAdminClient();
    const { id, status } = validationResult.data;

    const { data, error } = await supabaseAdmin
      .from('inspections')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Inspection not found after update." };
    }

    revalidatePath("/inspections");
    revalidatePath("/dashboard");

    // Log status change
    const updatedMachineName = (data as any).machinename || (data as any).machineName || "Unknown";
    await createActivityLog({
      action: "INSPECTION_STATUS_UPDATED",
      entity_type: "inspection",
      entity_id: id,
      entity_name: updatedMachineName,
      details: "Inspection status changed to " + status,
      performed_by: "System",
      performed_by_role: "System",
    });

    return { success: true, data: data as Inspection };
  } catch (error) {
    console.error("Failed to update inspection:", error);
    return { success: false, error: "An unexpected error occurred while updating the inspection." };
  }
}

export async function assignInspection(inspectionId: string, assigneeName: string) {
  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from('inspections')
      .update({ assignedto: assigneeName, status: 'Pending' })
      .eq('id', inspectionId)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Inspection not found after assignment.' };
    }

    revalidatePath('/inspections');
    revalidatePath('/dashboard');

    // Find the assigned user and notify them
    const { data: assignedUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('name', assigneeName)
      .single();

    if (assignedUser) {
      const machineName = (data as any).machinename || (data as any).machineName || 'An inspection';
      await createNotification({
        title: "Inspection Assigned to You",
        message: "You have been assigned to inspect " + machineName,
        user_id: assignedUser.id,
        type: "INSPECTION_ASSIGNED",
        reference_id: inspectionId,
      });
    }

    // Log activity
    const inspMachineName = (data as any).machinename || (data as any).machineName || 'Unknown';
    await createActivityLog({
      action: "INSPECTION_ASSIGNED",
      entity_type: "inspection",
      entity_id: inspectionId,
      entity_name: inspMachineName,
      details: "Inspection assigned to " + assigneeName,
      performed_by: "Admin",
      performed_by_role: "Admin",
    });

    return { success: true, data: data as Inspection };
  } catch (error) {
    console.error('Failed to assign inspection:', error);
    return { success: false, error: 'An unexpected error occurred while assigning the inspection.' };
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

    const supabaseAdmin = createAdminClient();

    // Convert date to ISO string for serialization
    const reportData = {
      ...validationResult.data,
      inspectionDate: validationResult.data.inspectionDate.toISOString(),
    };

    const { error } = await supabaseAdmin
      .from('inspections')
      .update({
        fullreportdata: reportData,
        machineslno: reportData.machineSlNo,
        status: "Completed",
        inspectedby: reportData.inspectedBy || null,
        completedat: new Date().toISOString(),
      })
      .eq('id', inspectionId);

    if (error) {
      console.error("submitInspectionReport error:", error.message);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard");
    revalidatePath("/inspections");

    // Notify all Admins that inspection is completed
    const machineName = reportData.equipmentDetails || "An inspection";
    await createNotificationForRole({
      title: "Inspection Completed",
      message: "Inspection completed and waiting for approval - " + machineName,
      role: "Admin",
      type: "INSPECTION_COMPLETED",
      reference_id: inspectionId,
    });

    // Log activity
    await createActivityLog({
      action: "INSPECTION_COMPLETED",
      entity_type: "inspection",
      entity_id: inspectionId,
      entity_name: reportData.machineSlNo || machineName,
      details: "Inspection report submitted by " + (reportData.inspectedBy || "Inspector") + " for " + machineName,
      performed_by: reportData.inspectedBy || "Inspector",
      performed_by_role: "Inspector",
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to submit inspection report:", error);
    return { success: false, error: "An unexpected error occurred while submitting the report." };
  }
}
