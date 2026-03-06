
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

interface HtLtSwitchgearFormProps {
    onBack: () => void;
    onNext: () => void;
    isPending: boolean;
}

export function HtLtSwitchgearForm({ onBack, onNext, isPending }: HtLtSwitchgearFormProps) {
    const { watch } = useFormContext<InspectionReportFormValues>();
    const checkType = watch('checkType');
    
    const surveillanceChecklist: ChecklistItemProps[] = [
        {
            name: "installationOfSwitchgear",
            title: "1. Installation of Switchgear as per Drawing",
            acceptanceCriteria: "Installation should be done as per drawing. Each panel should be mounted properly. There should not be any damage to the panel"
        },
        {
            name: "cleanlinessOfPanels",
            title: "2. Cleanliness of Panels",
            acceptanceCriteria: "Panels should be cleaned from inside & outside. Any dirt/foreign material can cause flashover in switchgear"
        },
        {
            name: "mountingAndAlignment",
            title: "3. Mounting & Allignment of Panels",
            acceptanceCriteria: "Panel Should be properly mounted"
        },
        {
            name: "connectionOfBusbar",
            title: "4. Connection of Busbar between panels",
            acceptanceCriteria: "Busbar Joints should be properly checked for Tightness"
        },
        {
            name: "earthingOfSwitchgear",
            title: "5. Earthing of the Switchgear",
            acceptanceCriteria: "Earthing Busbar should be connected throughout the switchgear between panels. Earthing continuity to be checked. Earthing should be connected with the grid on both end of SWGR"
        },
        {
            name: "alignmentOfBusbars",
            title: "6. Allignment of Main & Control BusBars",
            acceptanceCriteria: "Busbars should be properly alligned"
        },
        {
            name: "unusedHoles",
            title: "7. Unused Holes in the bottom of Switchgear",
            acceptanceCriteria: "Any Unused holes should be covered properly."
        },
        {
            name: "conditionOfGaskets",
            title: "8. Condition of Gaskets",
            acceptanceCriteria: "Interpanel & Panel Cover gaskets should be in good condition"
        },
        {
            name: "dressingOfCables",
            title: "9. Dressing of Control & Power Cables under Switchgear",
            acceptanceCriteria: "Cables should be properly clamped/Secured/dressed in Swichgear. Cable tags should be provided for every cables. Cables lugs are properly crimped."
        },
    ];

    const tqpChecklist: ChecklistItemProps[] = [
        {
            name: "installationOfSwitchgear",
            title: "1. Installation of Switchgear as per Drawing",
            acceptanceCriteria: (
                <ul className="list-decimal list-inside">
                    <li>Installation should be done as per drawing.</li>
                    <li>Each panel should be mounted properly.</li>
                    <li>There should not be any damage to the panel.</li>
                </ul>
            )
        },
        {
            name: "cleanlinessOfPanels",
            title: "2. Cleanliness of Panels",
            acceptanceCriteria: "Panels should be cleaned from inside & outside. Any dirt/foreign material can cause flashover in switchgear."
        },
        {
            name: "mountingAndAlignment",
            title: "3. Mounting & Allignment of Panels",
            acceptanceCriteria: "Panel Should be properly mounted."
        },
        {
            name: "connectionOfBusbar",
            title: "4. Connection of Busbar between panels",
            acceptanceCriteria: "Busbar Joints should be properly checked for Tightness."
        },
        {
            name: "earthingOfSwitchgear",
            title: "5. Earthing of the Switchgear",
            acceptanceCriteria: (
                <ul className="list-decimal list-inside">
                    <li>Earthing Busbar should be connected throughout the switchgear between panels.</li>
                    <li>Earthing continuity to be checked.</li>
                    <li>Earthing should be connected with the grid on both end of SWGR.</li>
                </ul>
            )
        },
        {
            name: "alignmentOfBusbars",
            title: "6. Allignment of Main & Control BusBars",
            acceptanceCriteria: "Busbars should be properly alligned."
        },
        {
            name: "unusedHoles",
            title: "7. Unused Holes in the bottom of Switchgear",
            acceptanceCriteria: "Any Unused holes should be covered properly."
        },
        {
            name: "conditionOfGaskets",
            title: "8. Condition of Gaskets",
            acceptanceCriteria: "Interpanel & Panel Cover gaskets should be in good condition."
        },
        {
            name: "dressingOfCables",
            title: "9. Dressing of Control & Power Cables under Switchgear",
            acceptanceCriteria: (
                <ul className="list-decimal list-inside">
                    <li>Cables should be properly clamped/Secured/dressed in Swichgear.</li>
                    <li>Cable tags should be provided for every cables.</li>
                    <li>Cables lugs are properly crimped.</li>
                </ul>
            )
        },
        {
            name: "continuityOfMainAndAuxiliaryCircuits",
            title: "10. Continuity of Main & Auxilliary Circuits",
            acceptanceCriteria: "Main & Control Bus should be connected properly."
        },
        {
            name: "calibrationOfTestingKitsForSwitchgear",
            title: "11. Calibration of testing Kits for Switchgear",
            acceptanceCriteria: "Testing Kits should be duly calibrated"
        },
        {
            name: "irOfMainAndAuxiliaryBus",
            title: "12. IR of Main & Auxilliary/Control Bus",
            acceptanceCriteria: (
                <div>
                    <p>As per IS:10118-3, Test Voltage & Acceptable Value for IR is</p>
                    <ul className="list-decimal list-inside ml-4">
                        <li>1KV for upto 1KV rating SWGR, IR Value is more than 1 megaOhm</li>
                        <li>2.5 KV & above for more than 1KV of SWGR, IR value is more than 100 MegaOhm.</li>
                        <li>For control Circuits Test Voltage is 500V, IR value should be more than 1 MegaOhm</li>
                    </ul>
                </div>
            )
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

    