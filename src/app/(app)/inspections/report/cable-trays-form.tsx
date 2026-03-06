
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

interface CableTraysFormProps {
    onBack: () => void;
    onNext: () => void;
    isPending: boolean;
}

export function CableTraysForm({ onBack, onNext, isPending }: CableTraysFormProps) {
    const { watch } = useFormContext<InspectionReportFormValues>();
    const checkType = watch('checkType');
    
    const surveillanceChecklist: ChecklistItemProps[] = [
        {
            name: "layingOfCableTrays",
            title: "1. Laying of cable Trays as per Drawing",
            acceptanceCriteria: (
                <ul className="list-decimal list-inside">
                    <li>Cable Trays should be laid as per Appd drawing</li>
                    <li>Drawing should be available at site.</li>
                </ul>
            )
        },
        {
            name: "qualificationOfWelders",
            title: "2. Qualification of Welders for Tray Works",
            acceptanceCriteria: (
                <ul className="list-decimal list-inside">
                    <li>Welder should be Qualified by Site FQA as per FWS.</li>
                    <li>Welder cards should be availabe at site</li>
                </ul>
            )
        },
        {
            name: "fixingOfCableTraySupports",
            title: "3. Fixing of Cable Trays Supports",
            acceptanceCriteria: (
                <ul className="list-decimal list-inside">
                    <li>Cable Tray Support should be erected at site using bracket, clamps, fittings, bolts, nut etc</li>
                    <li>Welding of component is not allowed. (Beam or Structure Steel insert plates welding may be permitted)</li>
                </ul>
            )
        },
        {
            name: "straightnessAlignmentOfCableTray",
            title: "4. Straightness/Alignment of Cable Tray Erection",
            acceptanceCriteria: "Cable Trays/Cable Tray Supports should be Visually Straight"
        },
        {
            name: "alignmentSpacingBetweenTrays",
            title: "5. Allignment/Spacing between Parallel Trays",
            acceptanceCriteria: "Minimum Gap of 300 mm to be ensured between Trays"
        },
        {
            name: "tightnessOfCoupler",
            title: "6. Tightness of Clamp Coupler/Fish Plates",
            acceptanceCriteria: "All coupler plate bolts should be tightned. Missing of Bolts not allowed"
        },
        {
            name: "earthingOfTrays",
            title: "7. Earthing of Trays",
            acceptanceCriteria: (
                <ul className="list-decimal list-inside">
                    <li>Earthing Strip should run Continuously supported with Z-Clamp.</li>
                    <li>Earthing should be connected with grid</li>
                    <li>Tray will be shorted with earthing Strip on every 30 M</li>
                    <li>Size of earthing strip should be as per TS</li>
                </ul>
            )
        },
        {
            name: "trayNumbering",
            title: "8. Tray Numbering & Identification",
            acceptanceCriteria: (
                 <ul className="list-decimal list-inside">
                    <li>Tray Numbering should done on evry 10 M in Straight run,on Every Bend & Both side of wall Crossing</li>
                    <li>Height of letter will be minm 75mm.</li>
                </ul>
            )
        },
        {
            name: "cableTrayWeldingJoints",
            title: "9. Cable Tray Welding Joints",
            acceptanceCriteria: (
                 <ul className="list-decimal list-inside">
                    <li>Cleaning of welding Joints should be proper.</li>
                    <li>Zinc rich protective paint should be applied</li>
                </ul>
            )
        },
        {
            name: "installationOfCableTrays",
            title: "10. Installation of Cable Trays",
            acceptanceCriteria: (
                <ul className="list-decimal list-inside">
                    <li>Welding of Cable Trays with support should not be done</li>
                    <li>Remove any Edges/Burns from Cable Trays</li>
                </ul>
            )
        }
    ];

    const tqpChecklist: ChecklistItemProps[] = surveillanceChecklist; // Use the same detailed list for both

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

    