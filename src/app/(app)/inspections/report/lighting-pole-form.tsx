
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
    name: keyof InspectionReportFormValues;
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
                        name={`${name}.result`}
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel>Actual Condition/Result<span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
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
                        name={`${name}.remarks`}
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input placeholder="Enter remarks if 'Not OK'" {...field} value={field.value ?? ''} />
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

interface LightingPoleFormProps {
    onBack: () => void;
    onNext: () => void;
    isPending: boolean;
}

export function LightingPoleForm({ onBack, onNext, isPending }: LightingPoleFormProps) {
    const { watch } = useFormContext<InspectionReportFormValues>();
    const checkType = watch('checkType');
    
    const surveillanceChecklist: ChecklistItemProps[] = [
        {
            name: "mountingOfPoles",
            title: "1. Mounting/Allignment of Poles",
            acceptanceCriteria: "Pole should be properly alligned. Pole/Lighting Fixures should not be damaged"
        },
        {
            name: "earthingOfPoles",
            title: "2. Eathing of Poles",
            acceptanceCriteria: "POles should be propely earthed by Strip/Wires"
        },
        {
            name: "cableEntryUnderPole",
            title: "3. Cable Entry under Pole/Mast",
            acceptanceCriteria: "Proper cable gland as per cable size should be used. Cable identification tags to be provided."
        },
        {
            name: "numberingOfPoles",
            title: "4. Numbering/Identification of Poles",
            acceptanceCriteria: "Poles should be properly identified by marking."
        },
    ];

    const tqpChecklist: ChecklistItemProps[] = [
        {
            name: "readinessOfCivilFoundation",
            title: "1. Readiness of civil foundation",
            acceptanceCriteria: "Civil works should be complted for rerction of poles/mast"
        },
        {
            name: "mountingOfPoles",
            title: "2. Mounting/Allignment of Poles",
            acceptanceCriteria: "Pole should be properly alligned. Pole/Lighting Fixures should not be damaged"
        },
        {
            name: "earthingOfPoles",
            title: "3. Eathing of Poles",
            acceptanceCriteria: "POles should be propely earthed by Strip/Wires"
        },
        {
            name: "cableEntryUnderPole",
            title: "4. Cable Entry under Pole/Mast",
            acceptanceCriteria: "Proper cable gland as per cable size should be used. Cable identification tags to be provided. Proper lugging/Termination should be done"
        },
        {
            name: "dressingOfPoleCables",
            title: "5. Dressing of Cables",
            acceptanceCriteria: "Cables should be propely dressed under poles using nylon Tyes"
        },
        {
            name: "numberingOfPoles",
            title: "6. Numbering/Identification of Poles",
            acceptanceCriteria: "Poles should be properly identified by marking."
        },
        {
            name: "lanternCarriageFunction",
            title: "7. Lantern Carriage function of High Mast",
            acceptanceCriteria: "Proper functioning of Lantern Carriage mechanism to be ensured (Both Manual & Motorised)."
        },
        {
            name: "testingOfHighMastCablesMotor",
            title: "8. Testing of Cables (& Motor in case of High Mast)",
            acceptanceCriteria: "Tests to be done using calibrated test kits. IR test to be done using 500 V. For Motors, IR (on 500 V) & WR test to be performed."
        },
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

    