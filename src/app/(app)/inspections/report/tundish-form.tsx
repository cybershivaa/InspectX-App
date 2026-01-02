
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
                                <FormLabel>Actual Condition/Result*</FormLabel>
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
                        <FormLabel>Site Images</FormLabel>
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

interface TundishFormProps {
    onBack: () => void;
    onNext: () => void;
    isPending: boolean;
}

export function TundishForm({ onBack, onNext, isPending }: TundishFormProps) {
    const checklistItems: ChecklistItemProps[] = [
        {
            name: "layingOfBusduct",
            title: "1. Laying of Busduct as per Drawing",
            acceptanceCriteria: "Busduct should be properly alligned to switchgear"
        },
        {
            name: "cleaningOfBusducts",
            title: "2. Cleaning of the busducts",
            acceptanceCriteria: "Busduct insulators, Conductor, Flexibles should be properly cleaned"
        },
        {
            name: "fixingOfFishPlates",
            title: "3. Fixing of Fish Plates/Rubber Bellow",
            acceptanceCriteria: "Should be fixed properly. Tightness to be ensured"
        },
        {
            name: "fixingOfSupportStructure",
            title: "4. Fixing of Support Structure",
            acceptanceCriteria: (
                <ul className="list-decimal list-inside">
                    <li>Support structure should be positioned as per drawing.</li>
                    <li>Proper grouting/ fixing done of support structure</li>
                </ul>
            )
        },
        {
            name: "earthingOfTheBusduct",
            title: "5. Earthing of the Busduct",
            acceptanceCriteria: (
                <ul className="list-decimal list-inside">
                    <li>Proper earth strip as per drawing/TS should be used.</li>
                    <li>Earth Strip connection should be fully tight</li>
                    <li>Earthing Continuity with grid to be ensured</li>
                </ul>
            )
        },
        {
            name: "spaceHeater",
            title: "6. Space Heater/Breather of the busduct",
            acceptanceCriteria: (
                <ul className="list-decimal list-inside">
                    <li>Silica Gel of breather to be checked & replaced if necessary</li>
                    <li>IR & WR of space heater to be done & Healthiness to be ensured</li>
                </ul>
            )
        }
    ];

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
                <Button type="button" onClick={onNext}>
                    Next
                </Button>
            </CardFooter>
        </>
    );
}

    