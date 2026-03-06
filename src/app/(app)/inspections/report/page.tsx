

"use client";

import React, { useState, useTransition, useEffect, useRef, Suspense, lazy } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from '@/hooks/useAppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { supabase } from '@/lib/supabase';
// All Firebase Firestore logic replaced with Supabase below
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { FieldPath } from 'react-hook-form';
import { generatePdf } from '@/lib/pdf';
import { ReportView } from './report-view';
import { Skeleton } from '@/components/ui/skeleton';

const ElectricalSurveillanceCheckForm = lazy(() => import('./electrical-surveillance-check-form').then(m => ({ default: m.ElectricalSurveillanceCheckForm })));
const HtMotorForm = lazy(() => import('./ht-motor-form').then(m => ({ default: m.HtMotorForm })));
const CableLayingForm = lazy(() => import('./cable-laying-form').then(m => ({ default: m.CableLayingForm })));
const LtMotorForm = lazy(() => import('./lt-motor-form').then(m => ({ default: m.LtMotorForm })));
const TestingPowerCablesForm = lazy(() => import('./testing-power-cables-form').then(m => ({ default: m.TestingPowerCablesForm })));
const CableTraysForm = lazy(() => import('./cable-trays-form').then(m => ({ default: m.CableTraysForm })));
const EarthingSystemForm = lazy(() => import('./earthing-system-form').then(m => ({ default: m.EarthingSystemForm })));
const HtLtSwitchgearForm = lazy(() => import('./ht-lt-switchgear-form').then(m => ({ default: m.HtLtSwitchgearForm })));
const LtPanelsForm = lazy(() => import('./lt-panels-form').then(m => ({ default: m.LtPanelsForm })));
const BusductForm = lazy(() => import('./busduct-form').then(m => ({ default: m.BusductForm })));
const StationLightingForm = lazy(() => import('./station-lighting-form').then(m => ({ default: m.StationLightingForm })));
const LightingPoleForm = lazy(() => import('./lighting-pole-form').then(m => ({ default: m.LightingPoleForm })));
const MiscEquipmentForm = lazy(() => import('./misc-equipment-form').then(m => ({ default: m.MiscEquipmentForm })));
const PowerTransformerForm = lazy(() => import('./power-transformer-form').then(m => ({ default: m.PowerTransformerForm })));
const FinalRemarksForm = lazy(() => import('./final-remarks-form').then(m => ({ default: m.FinalRemarksForm })));


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


const formSchema = z.object({
  // Step 1
  agencyName: z.string().min(1, "Agency name is required."),
  areaDetails: z.string().min(1, "Area details are required."),
  unitNo: z.string().min(1, "Unit number is required."),
  inspectionDate: z.date({
    required_error: "Date of inspection is required.",
  }),
  equipmentDetails: z.string().min(1, "Equipment details is required."),
  machineSlNo: z.string().min(1, "Machine SL No. is required."),
  checkType: z.enum(["Surveillance Check", "Testing as per FQP", "Overhauling Check"], {
    required_error: "You need to select a check type.",
  }),
  equipmentName: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one equipment item.",
  }),
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
  
  // Step 2 (Busduct / Busduct)
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
  requestedBy: z.string().optional(),
});

export type InspectionReportFormValues = z.infer<typeof formSchema>;

const equipmentFieldMapping: Record<string, string[]> = {
    'ht-motor': ['installation.result', 'damage.result', 'cleanliness.result', 'termination.result', 'earthing.result', 'rotation.result', 'windingTemp.result', 'testingKitsCalibration.result', 'motorIrPiWr.result', 'spaceHeaterIrWr.result'],
    'lt-motor': ['installation.result', 'damage.result', 'cleanliness.result', 'termination.result', 'earthing.result', 'rotation.result', 'windingTemp.result', 'testingKitsCalibration.result', 'motorIrPiWr.result', 'spaceHeaterIrWr.result'],
    'cable-laying': ['layingOfCable.result', 'trefoilFormation.result', 'dressingOfCables.result', 'layingOfDifferentVoltages.result', 'testingBeforeLaying.result', 'cableIdentificationTags.result', 'bendingRadius.result', 'earthingOfSheath.result'],
    'testing-power-cables': ['calibrationOfTestingKits.result', 'cableIrAndHighVoltageTesting.result'],
    'cable-trays': ['layingOfCableTrays.result', 'qualificationOfWelders.result', 'fixingOfCableTraySupports.result', 'straightnessAlignmentOfCableTray.result', 'alignmentSpacingBetweenTrays.result', 'tightnessOfCoupler.result', 'earthingOfTrays.result', 'trayNumbering.result', 'cableTrayWeldingJoints.result', 'installationOfCableTrays.result'],
    'earthing-system': ['sizeOfEarthingMaterial.result', 'layingOfEarthStrip.result', 'weldingOfEarthStrip.result', 'applicationOfProtectivePaint.result', 'preparationOfEarthPit.result', 'installationOfEarthElectrode.result', 'connectionOfEarthStrip.result', 'preparationOfConcretePit.result', 'continuityOfEarthingSystem.result', 'resistanceOfTheEarthElectrode.result'],
    'ht-lt-switchgear': ['installationOfSwitchgear.result', 'cleanlinessOfPanels.result', 'mountingAndAlignment.result', 'connectionOfBusbar.result', 'earthingOfSwitchgear.result', 'alignmentOfBusbars.result', 'unusedHoles.result', 'conditionOfGaskets.result', 'continuityOfMainAndAuxiliaryCircuits.result', 'calibrationOfTestingKitsForSwitchgear.result', 'irOfMainAndAuxiliaryBus.result'],
    'lt-panels': ['installationOfPanels.result', 'cleanlinessOfPanels.result', 'markingAndDesignationOfPanels.result', 'connectionOfBusbar.result', 'earthingOfPanels.result', 'useOfGlands.result', 'unusedHoles.result', 'conditionOfGaskets.result', 'dressingOfCables.result'],
    'busduct': ['layingOfBusduct.result', 'cleaningOfBusducts.result', 'fixingOfFishPlates.result', 'fixingOfSupportStructure.result', 'earthingOfTheBusduct.result', 'spaceHeater.result', 'calibrationOfTestingKitsForBusduct.result', 'irAndHvOfBusduct.result'],
    'station-lighting': ['mountingOfLightingFixtures.result', 'mountingOfLightingPanel.result', 'designationOfLighting.result', 'markingInAcEmergency.result', 'cablesEntryInLightingPanel.result', 'layingAndMarkingOfConduits.result', 'pullOutBoxes.result', 'wiringOfLightingFixtures.result', 'separateWiringForReceptacles.result', 'earthingOfConduits.result', 'wiringInConduits.result', 'wiringInBatteryRoom.result', 'irOfLightingSystem.result'],
    'lighting-pole': ['readinessOfCivilFoundation.result', 'mountingOfPoles.result', 'earthingOfPoles.result', 'cableEntryUnderPole.result', 'dressingOfPoleCables.result', 'numberingOfPoles.result', 'lanternCarriageFunction.result', 'testingOfHighMastCablesMotor.result'],
    'misc-equipment': ['miscInspections'],
    'ci-equipments': ['miscInspections'],
    'power-transformer': ['powerTransformerInspections'],
    'outdoor-transformer': ['powerTransformerInspections'],
    'elevator': ['powerTransformerInspections'],
    'turbogenerator': ['powerTransformerInspections'],
};

// Maps machine SL No or machine name keywords → equipmentName slug
const machineSlNoToEquipmentSlug: Record<string, string> = {
  'NTPC-HTM-001': 'ht-motor',
  'NTPC-LTM-002': 'lt-motor',
  'NTPC-CBL-003': 'cable-laying',
  'NTPC-TPC-004': 'testing-power-cables',
  'NTPC-CT-005': 'cable-trays',
  'NTPC-ES-006': 'earthing-system',
  'NTPC-SWG-007': 'ht-lt-switchgear',
  'NTPC-LTP-008': 'lt-panels',
  'NTPC-BSD-009': 'busduct',
  'NTPC-STL-010': 'station-lighting',
  'NTPC-LPH-011': 'lighting-pole',
  'NTPC-MISC-012': 'misc-equipment',
  'NTPC-CI-013': 'ci-equipments',
  'NTPC-PT-014': 'power-transformer',
  'NTPC-OT-015': 'outdoor-transformer',
  'NTPC-ELV-016': 'elevator',
  'NTPC-TRB-017': 'turbogenerator',
};

const machineNameToEquipmentSlug = (name: string): string | null => {
  const n = name.toLowerCase();
  if (n.includes('ht motor') || n.includes('ht-motor')) return 'ht-motor';
  if (n.includes('lt motor') || n.includes('lt-motor')) return 'lt-motor';
  if (n.includes('cable laying') || n.includes('cable-laying')) return 'cable-laying';
  if (n.includes('testing') && n.includes('cable')) return 'testing-power-cables';
  if (n.includes('cable tray')) return 'cable-trays';
  if (n.includes('earthing')) return 'earthing-system';
  if (n.includes('switchgear') || n.includes('switch gear')) return 'ht-lt-switchgear';
  if (n.includes('lt panel')) return 'lt-panels';
  if (n.includes('busduct') || n.includes('bus duct')) return 'busduct';
  if (n.includes('station lighting')) return 'station-lighting';
  if (n.includes('lighting pole') || n.includes('high mast')) return 'lighting-pole';
  if (n.includes('power transformer')) return 'power-transformer';
  if (n.includes('outdoor transformer')) return 'outdoor-transformer';
  if (n.includes('elevator')) return 'elevator';
  if (n.includes('turbogenerator')) return 'turbogenerator';
  if (n.includes('c&i') || n.includes('c & i')) return 'ci-equipments';
  if (n.includes('misc')) return 'misc-equipment';
  return null;
};

function FormLoadingSkeleton() {
  return (
    <CardContent className="space-y-8">
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
       <div className="space-y-4">
        <Skeleton className="h-6 w-1/4" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    </CardContent>
  )
}


export default function InspectionReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAppContext();
  const [isPending, startTransition] = useTransition();
  const [currentStep, setCurrentStep] = useState(1); // Start at Step 1 so user confirms equipment selection
  const [isLoading, setIsLoading] = useState(true);
  const [submittedData, setSubmittedData] = useState<InspectionReportFormValues | null>(null);
  const [previousInspectionDate, setPreviousInspectionDate] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const inspectionId = searchParams.get('inspectionId');

  const form = useForm<InspectionReportFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      agencyName: "",
      areaDetails: "",
      unitNo: "",
      inspectionDate: new Date(),
      equipmentDetails: "",
      machineSlNo: "",
      reportNo: "FQA/N/",
      equipmentName: [],
      miscInspections: [{ 
        location: '', 
        systemName: '', 
        deviations: [{ deviations: '', rectification: '', imagePath: '' }]
      }],
      powerTransformerInspections: [{
        location: '',
        systemName: '',
        inspectionTestDetails: '',
        deviationsPendingPoints: '',
        testReportsPath: '',
        deviations: [{ deviations: '', rectification: '', imagePath: '' }]
      }],
      otherRemarks: '',
      signatureContractor: { name: '', signature: '' },
      signatureNTPCErection: { name: '', signature: '' },
      signatureNTPCFQA: { name: '', signature: '' },
    },
  });
  
  useEffect(() => {
    if (!inspectionId) {
        toast({
            variant: "destructive",
            title: "Missing Inspection ID",
            description: "No inspection ID was provided in the URL.",
        });
        setIsLoading(false);
        router.push('/dashboard');
        return;
    };
    
    const fetchInspectionData = async () => {
        setIsLoading(true);
        try {
            const { data: rawData, error: fetchError } = await supabase
              .from('inspections')
              .select('*')
              .eq('id', inspectionId)
              .single();

            if (fetchError || !rawData) {
                toast({
                  variant: "destructive",
                  title: "Failed to load data",
                  description: "Could not find the requested inspection.",
                });
                return;
            }

            // Normalize column names (support both camelCase and lowercase)
            const inspectionData: any = {
              ...rawData,
              machineSlNo: rawData.machineSlNo ?? rawData.machineslno,
              machineName: rawData.machineName ?? rawData.machinename,
              requestedBy: rawData.requestedBy ?? rawData.requestedby,
              assignedTo: rawData.assignedTo ?? rawData.assignedto,
              createdAt: rawData.createdAt ?? rawData.createdat,
              fullReportData: rawData.fullReportData ?? rawData.fullreportdata,
            };

            // Check if user is authorized for this specific inspection
            if (user && user.role === 'Client' && inspectionData.assignedTo !== user.name) {
                toast({
                    variant: "destructive",
                    title: "Unauthorized",
                    description: "You are not assigned to this inspection.",
                });
                router.push('/inspections');
                return;
            }

            // Fetch previous inspection for the same machine
            const machineSlNo = inspectionData.machineSlNo;
            if (machineSlNo) {
                try {
                    const { data: prevData } = await supabase
                      .from('inspections')
                      .select('id, completedat, createdat')
                      .eq('machineslno', machineSlNo)
                      .eq('status', 'Completed')
                      .neq('id', inspectionId);

                    const previousInspections = (prevData || [])
                        .sort((a: any, b: any) => {
                            const dateA = a.completedat || a.createdat || '';
                            const dateB = b.completedat || b.createdat || '';
                            return new Date(dateB).getTime() - new Date(dateA).getTime();
                        });

                    if (previousInspections.length > 0) {
                        const prevDate = (previousInspections[0] as any).completedat || (previousInspections[0] as any).createdat;
                        if (prevDate) setPreviousInspectionDate(prevDate);
                    }
                } catch (error) {
                    console.error("Error fetching previous inspection:", error);
                }
            }

            const reportData = inspectionData.fullReportData || {};
            const combinedData: any = { ...inspectionData, ...reportData };
            if (combinedData.inspectionDate) {
                combinedData.inspectionDate = new Date(combinedData.inspectionDate);
            }

            // Auto-populate equipmentName if missing (e.g. inspections created without it)
            if (!combinedData.equipmentName || (Array.isArray(combinedData.equipmentName) && combinedData.equipmentName.length === 0)) {
                const slNo = (combinedData.machineSlNo || combinedData.machineslno || '');
                const machineName = (combinedData.machineName || combinedData.machinename || '');
                const slugFromSlNo = machineSlNoToEquipmentSlug[slNo];
                const slugFromName = machineNameToEquipmentSlug(machineName);
                const resolvedSlug = slugFromSlNo || slugFromName;
                if (resolvedSlug) {
                    combinedData.equipmentName = [resolvedSlug];
                }
            }

            // Ensure machineSlNo is populated
            if (!combinedData.machineSlNo) {
                combinedData.machineSlNo = combinedData.machineslno || '';
            }

            form.reset(combinedData);
        } catch (error) {
             toast({
              variant: "destructive",
              title: "An unexpected error occurred",
              description: "Failed to fetch inspection details. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchInspectionData();
  }, [inspectionId, form, toast, router]);


  // Helper function to remove undefined values from objects
  const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    
    if (Array.isArray(obj)) {
      return obj.map(item => removeUndefined(item));
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        const value = obj[key];
        if (value !== undefined) {
          cleaned[key] = removeUndefined(value);
        }
      }
      return cleaned;
    }
    
    return obj;
  };

  const onSubmit = (values: InspectionReportFormValues) => {
    console.log('Form submission started', { inspectionId, user: user?.name });
    
    if (!inspectionId || !user) {
       toast({
          variant: "destructive",
          title: "Submission Failed",
          description: "No inspection ID or user found. Please ensure you are logged in.",
        });
        return;
    }

    startTransition(async () => {
      try {
        console.log('Preparing submission data...');
        const submissionData = { ...values, inspectedBy: user.name };

        const reportData = {
          ...submissionData,
          inspectionDate: submissionData.inspectionDate.toISOString(),
        };

        const cleanedReportData = removeUndefined(reportData);

        const { error: updateError } = await supabase
          .from('inspections')
          .update({
            fullreportdata: cleanedReportData,
            machineslno: cleanedReportData.machineSlNo,
            status: 'Completed',
            inspectedby: cleanedReportData.inspectedBy,
            completedat: new Date().toISOString(),
            completedby: user.name,
          })
          .eq('id', inspectionId);

        if (updateError) throw updateError;
        toast({
          title: "Inspection Completed Successfully",
          description: `Report submitted and saved. Admin can now download the PDF.`,
        });
        
        setSubmittedData(submissionData);
      } catch (error) {
        console.error("Failed to submit report:", error);
        toast({
          variant: "destructive",
          title: "Submission Failed",
          description: error instanceof Error ? error.message : "An unexpected error occurred while submitting the report.",
        });
      }
    });
  };

  useEffect(() => {
    if (submittedData && reportRef.current) {
        const generateAndRedirect = async () => {
            try {
                await generatePdf(reportRef.current!, `inspection-report-${submittedData.reportNo.replace(/\//g, '_')}.pdf`);
            } catch (error) {
                console.error('PDF generation error:', error);
                // Continue even if PDF generation fails
            }
            
            // Redirect to inspections page
            router.push('/inspections');
            router.refresh();
        };
        // Use a small timeout to ensure the report view has rendered
        setTimeout(generateAndRedirect, 500);
    }
  }, [submittedData, router]);

  const handleNextStep1 = async () => {
     const isValid = await form.trigger([
        "agencyName", "areaDetails", "unitNo", "inspectionDate", "equipmentDetails", "machineSlNo", "checkType", "equipmentName", "reportNo"
     ]);
     if (isValid) {
        setCurrentStep(2);
     }
  }

  const handleNextStep2 = async () => {
    const selectedEquipment = form.getValues('equipmentName');
    
    const fieldsToValidate = selectedEquipment.flatMap(
        (eq) => equipmentFieldMapping[eq] || []
    ) as FieldPath<InspectionReportFormValues>[];
    
    if (fieldsToValidate.length === 0) {
        setCurrentStep(3);
        return;
    }

    const isValid = await form.trigger(fieldsToValidate);
    
    if (isValid) {
      setCurrentStep(3);
    } else {
      toast({
        variant: "destructive",
        title: "Validation Failed",
        description: "Please fill out all required fields with a valid selection (OK, Not OK, N/A) before proceeding.",
      });
    }
  }
  
  const handleBackToStep1 = () => setCurrentStep(1);
  const handleBackToStep2 = () => setCurrentStep(2);


  if (isLoading) {
     return (
         <Card>
            <CardHeader>
                <CardTitle>NTPC BARH FQA</CardTitle>
                <CardDescription>Loading inspection data...</CardDescription>
            </CardHeader>
             <CardContent>
                <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </CardContent>
        </Card>
     )
  }

  if (submittedData) {
    return (
        <div ref={reportRef} className="absolute -left-[2000px] top-0 p-8 bg-white w-[800px]">
            <ReportView data={submittedData} previousInspectionDate={previousInspectionDate} />
        </div>
    );
  }

  if (!user || !['Inspector', 'Client', 'Admin'].includes(user.role)) {
     return (
       <Card>
        <CardHeader>
          <CardTitle>Unauthorized</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-12">You are not authorized to fill out this report.</p>
        </CardContent>
      </Card>
     )
  }

  const selectedEquipment = form.watch('equipmentName');
  const showHtMotorForm = selectedEquipment?.includes('ht-motor');
  const showLtMotorForm = selectedEquipment?.includes('lt-motor');
  const showCableLayingForm = selectedEquipment?.includes('cable-laying');
  const showTestingPowerCablesForm = selectedEquipment?.includes('testing-power-cables');
  const showCableTraysForm = selectedEquipment?.includes('cable-trays');
  const showEarthingSystemForm = selectedEquipment?.includes('earthing-system');
  const showHtLtSwitchgearForm = selectedEquipment?.includes('ht-lt-switchgear');
  const showLtPanelsForm = selectedEquipment?.includes('lt-panels');
  const showBusductForm = selectedEquipment?.includes('busduct');
  const showStationLightingForm = selectedEquipment?.includes('station-lighting');
  const showLightingPoleForm = selectedEquipment?.includes('lighting-pole');
  const showMiscEquipmentForm = selectedEquipment?.includes('misc-equipment');
  const showCiEquipmentsForm = selectedEquipment?.includes('ci-equipments');
  const showPowerTransformerForm = selectedEquipment?.includes('power-transformer') || selectedEquipment?.includes('outdoor-transformer') || selectedEquipment?.includes('elevator') || selectedEquipment?.includes('turbogenerator');

  const getStep2Title = () => {
    if (showHtMotorForm) return "Checks for HT Motor, LT Panels (sdf)";
    if (showLtMotorForm) return "Checks for LT Motor (sdfc)";
    if (showCableLayingForm) return "Checks for Cable Laying/Installation (sdfc)";
    if (showTestingPowerCablesForm) return "Checks for Testing of Power Cables (sdfc)";
    if (showCableTraysForm) return "Checks for Cable Trays (sdfc)";
    if (showEarthingSystemForm) return "Checks for Earthing System (sdfc)";
    if (showHtLtSwitchgearForm) return "Checks for HT/LT SwitchGear (sdfc)";
    if (showLtPanelsForm) return "Checks for LT Panels (sdf)";
    if (showBusductForm) return "Checks for Busduct (sdf)";
    if (showStationLightingForm) return "Checks for Station Lighting (frrfr)";
    if (showLightingPoleForm) return "Checks for Lighting Poles/High Mast/PTL (frrfr)";
    if (showMiscEquipmentForm) return "Site Inspections of ewrdw";
    if (showCiEquipmentsForm) return "Site Inspections of ewrdw";
    if (showPowerTransformerForm) return "Inspection of sdfc";
    return "Detailed Checks";
  }
  
  const getStep2Instructions = () => {
     if (showHtMotorForm || showCableLayingForm || showLtMotorForm || showTestingPowerCablesForm || showCableTraysForm || showEarthingSystemForm || showHtLtSwitchgearForm || showLtPanelsForm || showBusductForm || showStationLightingForm || showLightingPoleForm) {
       return (
          <ol className="list-decimal list-inside text-xs mt-2 space-y-1 text-muted-foreground">
              <li>If any Deviation is observed, Please write in 'Other' Field.</li>
              <li>Prefer uploading images of deviation from acceptance criteria.</li>
              <li>If any Check is not applicable to that equipment, then Choose Not Applicable in Actual Condition/Result Section.</li>
          </ol>
       )
     }
     return null;
  }

  const renderStep2 = () => {
    const hasSpecificForm = showHtMotorForm || showLtMotorForm || showCableLayingForm || showTestingPowerCablesForm || showCableTraysForm || showEarthingSystemForm || showHtLtSwitchgearForm || showLtPanelsForm || showBusductForm || showStationLightingForm || showLightingPoleForm || showMiscEquipmentForm || showCiEquipmentsForm || showPowerTransformerForm;

    if (!hasSpecificForm) {
        return (
             <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                    <p>Detailed check form for the selected equipment is not yet available.</p>
                    <Button variant="outline" onClick={handleBackToStep1} className="mt-4">Go Back</Button>
                </div>
            </CardContent>
        )
    }

    return (
        <Suspense fallback={<FormLoadingSkeleton />}>
            {showHtMotorForm && (
                <HtMotorForm onBack={handleBackToStep1} onNext={handleNextStep2} isPending={isPending} />
            )}
            {showLtMotorForm && (
                <LtMotorForm onBack={handleBackToStep1} onNext={handleNextStep2} isPending={isPending} />
            )}
            {showCableLayingForm && (
                <CableLayingForm onBack={handleBackToStep1} onNext={handleNextStep2} isPending={isPending} />
            )}
            {showTestingPowerCablesForm && (
                <TestingPowerCablesForm onBack={handleBackToStep1} onNext={handleNextStep2} isPending={isPending} />
            )}
            {showCableTraysForm && (
                <CableTraysForm onBack={handleBackToStep1} onNext={handleNextStep2} isPending={isPending} />
            )}
            {showEarthingSystemForm && (
                <EarthingSystemForm onBack={handleBackToStep1} onNext={handleNextStep2} isPending={isPending} />
            )}
            {showHtLtSwitchgearForm && (
                <HtLtSwitchgearForm onBack={handleBackToStep1} onNext={handleNextStep2} isPending={isPending} />
            )}
            {showLtPanelsForm && (
                <LtPanelsForm onBack={handleBackToStep1} onNext={handleNextStep2} isPending={isPending} />
            )}
            {showBusductForm && (
                <BusductForm onBack={handleBackToStep1} onNext={handleNextStep2} isPending={isPending} />
            )}
            {showStationLightingForm && (
                <StationLightingForm onBack={handleBackToStep1} onNext={handleNextStep2} isPending={isPending} />
            )}
            {showLightingPoleForm && (
                <LightingPoleForm onBack={handleBackToStep1} onNext={handleNextStep2} isPending={isPending} />
            )}
            {(showMiscEquipmentForm || showCiEquipmentsForm) && (
                <MiscEquipmentForm onBack={handleBackToStep1} onNext={handleNextStep2} isPending={isPending} />
            )}
            {showPowerTransformerForm && (
                <PowerTransformerForm onBack={handleBackToStep1} onNext={handleNextStep2} isPending={isPending} />
            )}
        </Suspense>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>NTPC BARH FQA - Inspection Form</CardTitle>
        <CardDescription>
            {currentStep === 1 && "Electrical-C&I Surveillance Checks (Step 1 of 3)"}
            {currentStep === 2 && 
              <div>
                <p className="font-semibold text-primary">{getStep2Title()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Machine: {form.watch('machineSlNo')} | Basic details are pre-filled from inspection call
                </p>
                {getStep2Instructions()}
              </div>
            }
            {currentStep === 3 && (
              <div>
                <p>Final Remarks & Submission</p>
                <p className="text-xs text-muted-foreground mt-1">Complete your inspection and submit the report</p>
              </div>
            )}
        </CardDescription>
      </CardHeader>
       <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            {currentStep === 1 && (
              <Suspense fallback={<FormLoadingSkeleton />}>
                <ElectricalSurveillanceCheckForm onNext={handleNextStep1} />
              </Suspense>
            )}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && (
                 <Suspense fallback={<FormLoadingSkeleton />}>
                    <FinalRemarksForm isPending={isPending} />
                     <CardFooter className="flex justify-between">
                        <Button type="button" variant="outline" onClick={handleBackToStep2} disabled={isPending}>
                            Back
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={isPending}
                            onClick={() => console.log('Submit button clicked', { 
                                formState: form.formState, 
                                errors: form.formState.errors,
                                values: form.getValues()
                            })}
                        >
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Report
                        </Button>
                    </CardFooter>
                 </Suspense>
            )}
        </form>
      </FormProvider>
    </Card>
  );
}
