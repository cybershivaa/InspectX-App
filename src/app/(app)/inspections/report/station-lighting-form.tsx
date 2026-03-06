
"use client";

import React, { useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Paperclip } from 'lucide-react';
import type { InspectionReportFormValues } from './page';

interface ChecklistItemProps {
    name: string;
    title: string;
    acceptanceCriteria: React.ReactNode;
}

function ChecklistItem({ name, title, acceptanceCriteria }: ChecklistItemProps) {
    const { control } = useFormContext<InspectionReportFormValues>();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };


    return (
        <div className="space-y-4 rounded-lg border p-4">
            <h4 className="font-semibold text-base">{title}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">Acceptance Criteria:</p>
                    <div className="text-sm">{acceptanceCriteria}</div>
                </div>
                <div className="space-y-4">
                    <FormField
                        control={control}
                        name={`${name}.result` as any}
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel>Actual Condition/Result<span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value as string}
                                        className="flex items-center gap-4"
                                    >
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value="OK" /></FormControl>
                                            <FormLabel className="font-normal">OK</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value="Not OK" /></FormControl>
                                            <FormLabel className="font-normal">Not OK</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value="Not Applicable" /></FormControl>
                                            <FormLabel className="font-normal">Not Applicable</FormLabel>
                                        </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name={`${name}.remarks` as any}
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input placeholder="Enter remarks if 'Not OK'" {...field} value={String(field.value ?? '')} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <div>
                        <FormLabel>Site Images (Optional)</FormLabel>
                        <div className="mt-2 flex items-center gap-2">
                             <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                <Upload className="mr-2 h-4 w-4" />
                                {selectedFile ? 'Change' : 'Upload'}
                            </Button>
                             <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                            {selectedFile && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Paperclip className="h-4 w-4" />
                                    <span>{selectedFile.name}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

interface StationLightingFormProps {
    onBack: () => void;
    onNext: () => void;
    isPending: boolean;
}

export function StationLightingForm({ onBack, onNext, isPending }: StationLightingFormProps) {
    const { watch } = useFormContext<InspectionReportFormValues>();
    const checkType = watch('checkType');
    
    const surveillanceChecklist: ChecklistItemProps[] = [
        {
            name: "mountingOfLightingFixtures",
            title: "1. Mounting/Allignment of Lighting Fixtures",
            acceptanceCriteria: "Light should be properly mounted in all areas (Boiler, Staircase,False Ceiling)"
        },
        {
            name: "mountingOfLightingPanel",
            title: "2. Mounting/Bolting & Earthing of Lighting Panel/SwitchBoxes",
            acceptanceCriteria: "Mounting should be done properly by using Bolts 2. Double Earthing provided for Panels"
        },
        {
            name: "designationOfLighting",
            title: "3. Designation of Lighting Panel/Switch Box/Fixtures",
            acceptanceCriteria: "Lighting Panels/SB/Fixtures should be marked/designated as per Specs for Identification"
        },
        {
            name: "markingInAcEmergency",
            title: "4. Marking in the AC Emergency Lighting System",
            acceptanceCriteria: "Red Circular Mark to be painted on the fixture for Emergency Lighting"
        },
        {
            name: "cablesEntryInLightingPanel",
            title: "5. Cables/Wires Entry in Lighting Panel",
            acceptanceCriteria: "Cable Glands should be of proper size. Cable should be crimped & lugged using proper die. 2. Wire should be properly lugged & Crimped"
        },
        {
            name: "layingAndMarkingOfConduits",
            title: "6. Laying & Marking of Conduits",
            acceptanceCriteria: "Saddle clamps on every one meter should be used for supporting of Conduits 2. Conduits marked/designated on each termination end."
        },
        {
            name: "pullOutBoxes",
            title: "7. Pull Out Boxes for Long Conduits",
            acceptanceCriteria: "Pull Out Boxes to be installed on every 4 Meter in long Conduits 2. Proper Mounting of Pull Out Boxes to be done"
        },
        {
            name: "wiringOfLightingFixtures",
            title: "8. Wiring of the Lighting Fixtures",
            acceptanceCriteria: "Lights will be group controlled by LP in Site Area & by SB in Office Area. 2. AC Normal, AC emergency & DC Lighting to be done in different conduits"
        },
        {
            name: "separateWiringForReceptacles",
            title: "9. Seperate wiring for Receptacles",
            acceptanceCriteria: "Seperate wiring to be done for Welding Receptacles"
        },
        {
            name: "earthingOfConduits",
            title: "10. Earthing of Conduits",
            acceptanceCriteria: "Seperate Earth Wire will run along with every conduit. 2. Continuity of the earthing should be checked"
        },
        {
            name: "wiringInConduits",
            title: "11. Wiring in the conduits",
            acceptanceCriteria: "Proper size of wire to be used for wiring & Earthing of the conduits 2. Verify wire size using Tech Specs"
        },
        {
            name: "wiringInBatteryRoom",
            title: "12. Wiring in the Battery Room/WTP Area",
            acceptanceCriteria: "Epoxy coated GI Conduits & Accessories should be used"
        },
    ];

    const tqpChecklist: ChecklistItemProps[] = [
        ...surveillanceChecklist,
        {
            name: "irOfLightingSystem",
            title: "13. IR of Fixture/Panel/Wires/Cables",
            acceptanceCriteria: "Testing to be done using 500 V Calibrated IR Tester. Acceptable IR Value Will be More than 1 Mohm"
        }
    ];
    
    const checklistItems = (checkType === 'Testing as per FQP' || checkType === 'Overhauling Check') ? tqpChecklist : surveillanceChecklist;

    return (
        <>
            <CardContent className="space-y-6">
                {checklistItems.map(item => (
                    <ChecklistItem key={item.name as string} {...item} />
                ))}
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={onBack}>
                    Back
                </Button>
                <Button type="button" onClick={onNext} disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Next
                </Button>
            </CardFooter>
        </>
    );
}

    