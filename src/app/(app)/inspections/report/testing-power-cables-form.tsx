
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

interface TestingPowerCablesFormProps {
    onBack: () => void;
    onNext: () => void;
    isPending: boolean;
}

export function TestingPowerCablesForm({ onBack, onNext, isPending }: TestingPowerCablesFormProps) {
    const { watch } = useFormContext<InspectionReportFormValues>();
    const checkType = watch('checkType');
    
    const surveillanceChecklist: ChecklistItemProps[] = [
        { 
            name: "layingOfCable", 
            title: "1. Laying of cable as per Drawing", 
            acceptanceCriteria: (
                <ul className="list-decimal list-inside">
                    <li>Cable should be laid as per Appd drawing/Cable Schedule.</li>
                    <li>Drawing should be available at site.</li>
                    <li>Some Extra length cable to be laid.</li>
                </ul>
            )
        },
        { 
            name: "trefoilFormation", 
            title: "2. Trefoil formation in Single core Cables", 
            acceptanceCriteria: "Trefoil Clamp should be provided on every 1 Meter in Vertical trays & Every 2 Meter in Horizontal tray."
        },
        { 
            name: "dressingOfCables", 
            title: "3. Dressing of Cables in Trays", 
            acceptanceCriteria: (
                <ul className="list-decimal list-inside">
                    <li>Cables to be fixed by Nylon tyes in both Vertical & Horizontal Trays.</li>
                    <li>Use of GI Wire for Fixing of cables to be avoided.</li>
                </ul>
            )
        },
        { 
            name: "layingOfDifferentVoltages", 
            title: "4. Laying of Cables of Different Voltages in Different Trays", 
            acceptanceCriteria: "HT Cables are to be laid in top most tier & Subsequent lower Voltages Cables in lower tiers of cable tray racks."
        },
        { 
            name: "testingBeforeLaying", 
            title: "5. Testing of Cables before Laying", 
            acceptanceCriteria: (
                <ul className="list-decimal list-inside">
                    <li>IR test to be done of Cables in the cable drums.</li>
                    <li>Document to be checked & verified on site.</li>
                    <li>Minimum IR value will be (KV+1) Mega Ohm.</li>
                </ul>
            )
        },
        { 
            name: "cableIdentificationTags", 
            title: "6. Cable Identification Tags", 
            acceptanceCriteria: (
                <div>
                    <p>Cable Tags to be provided on:</p>
                    <ul className="list-decimal list-inside ml-4">
                        <li>Both Ends</li>
                        <li>On Every 25 Meter in Straight Run</li>
                        <li>On every Bends & At Both Ends of the Road/Wall Crossings</li>
                    </ul>
                </div>
            )
        },
        { 
            name: "bendingRadius", 
            title: "7. Bending radius of Cables while laying", 
            acceptanceCriteria: "Bending radius should be maintained as per standards."
        },
        { 
            name: "earthingOfSheath", 
            title: "8. Earthing Of Cable Metalic Seath or Screen", 
            acceptanceCriteria: "HT Cables to be earthed on both ends & LT Cables to be earthed atleast one End."
        },
        {
            name: "calibrationOfTestingKits",
            title: "9. Calibration of Testing kits",
            acceptanceCriteria: "Test Kits should be duly calibrated"
        },
        {
            name: "cableIrAndHighVoltageTesting",
            title: "10. Cable IR & High Voltage Testing",
            acceptanceCriteria: (
                <ul className="list-decimal list-inside">
                    <li>IR test Voltage will be as per IS:1255.</li>
                    <li>High Voltage Test Voltages will be as per IS:1255.</li>
                    <li>High Voltage Testing time will be 15 Min.</li>
                    <li>There should not be any Voltage drop during entire High Voltage Testing Time.</li>
                </ul>
            )
        }
    ];
    
    const tqpChecklist: ChecklistItemProps[] = [
        { 
            name: "layingOfCable", 
            title: "1. Laying of cable as per Drawing", 
            acceptanceCriteria: (
                <ul className="list-decimal list-inside">
                    <li>Cable should be laid as per Appd drawing/Cable Schedule.</li>
                    <li>Drawing should be available at site.</li>
                    <li>Some Extra length cable to be laid.</li>
                </ul>
            ) 
        },
        { 
            name: "trefoilFormation", 
            title: "2. Trefoil formation in Single core Cables", 
            acceptanceCriteria: "Trefoil Clamp should be provided on every 1 Meter in Vertical trays & Every 2 Meter in Horizontal tray."
        },
        { 
            name: "dressingOfCables", 
            title: "3. Dressing of Cables in Trays", 
            acceptanceCriteria: (
                 <ul className="list-decimal list-inside">
                    <li>Cables to be fixed by Nylon tyes in both Vertical & Horizontal Trays.</li>
                    <li>Use of GI Wire for Fixing of cables to be avoided.</li>
                </ul>
            )
        },
        { 
            name: "layingOfDifferentVoltages", 
            title: "4. Laying of Cables of Different Voltages in Different Trays", 
            acceptanceCriteria: "HT Cables are to be laid in top most tier & Subsequent lower Voltages Cables in lower tiers of cable tray racks."
        },
        { 
            name: "testingBeforeLaying", 
            title: "5. Testing of Cables before Laying", 
            acceptanceCriteria: (
                <ul className="list-decimal list-inside">
                    <li>IR test to be done of Cables in the cable drums.</li>
                    <li>Document to be checked & verified on site.</li>
                    <li>Minimum IR value will be (KV+1) Mega Ohm.</li>
                </ul>
            )
        },
        { 
            name: "cableIdentificationTags", 
            title: "6. Cable Identification Tags", 
            acceptanceCriteria: (
                <div>
                    <p>Cable Tags to be provided on:</p>
                    <ul className="list-decimal list-inside ml-4">
                        <li>Both Ends</li>
                        <li>On Every 25 Meter in Straight Run</li>
                        <li>On every Bends & At Both Ends of the Road/Wall Crossings</li>
                    </ul>
                </div>
            )
        },
        { 
            name: "bendingRadius", 
            title: "7. Bending radius of Cables while laying", 
            acceptanceCriteria: "Bending radius should be maintained as per standards."
        },
        { 
            name: "earthingOfSheath", 
            title: "8. Earthing Of Cable Metalic Seath or Screen", 
            acceptanceCriteria: "HT Cables to be earthed on both ends & LT Cables to be earthed atleast one End."
        },
        {
            name: "calibrationOfTestingKits",
            title: "9. Calibration of Testing kits",
            acceptanceCriteria: "Test Kits should be duly calibrated"
        },
        {
            name: "cableIrAndHighVoltageTesting",
            title: "10. Cable IR & High Voltage Testing",
            acceptanceCriteria: (
                <ul className="list-decimal list-inside">
                    <li>IR test Voltage will be as per IS:1255.</li>
                    <li>High Voltage Test Voltages will be as per IS:1255.</li>
                    <li>High Voltage Testing time will be 15 Min.</li>
                    <li>There should not be any Voltage drop during entire High Voltage Testing Time.</li>
                </ul>
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

    