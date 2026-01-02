
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

interface EarthingSystemFormProps {
    onBack: () => void;
    onNext: () => void;
    isPending: boolean;
}

export function EarthingSystemForm({ onBack, onNext, isPending }: EarthingSystemFormProps) {
    const { watch } = useFormContext<InspectionReportFormValues>();
    const checkType = watch('checkType');

    const surveillanceChecklist: ChecklistItemProps[] = [
        {
            name: "sizeOfEarthingMaterial",
            title: "1. Size/Type of Earthing material",
            acceptanceCriteria: "All Earthing material Should comply the requirement of Tech Specs"
        },
        {
            name: "layingOfEarthStrip",
            title: "2. Laying of Earth Strip",
            acceptanceCriteria: "Earth Strip should be laid properly"
        },
        {
            name: "weldingOfEarthStrip",
            title: "3. Welding of Earth Strip",
            acceptanceCriteria: (
                <ul className="list-decimal list-inside">
                    <li>Welding to be done by Qualified welder Only</li>
                    <li>Slag removal to be done after welding</li>
                    <li>Welding should be proper/As per TS</li>
                </ul>
            )
        },
        {
            name: "applicationOfProtectivePaint",
            title: "4. Application of Protective Paint on Welding",
            acceptanceCriteria: "Welded area should be painted using Two coat of Zinc oxide primer after slag removal"
        },
        {
            name: "preparationOfEarthPit",
            title: "5. Preparation of Earth Pit",
            acceptanceCriteria: (
                 <ul className="list-decimal list-inside">
                    <li>Depth of the earth pit should be as per TS</li>
                    <li>Verify Quantity of Salt & charcoal used for earthing</li>
                </ul>
            )
        },
        {
            name: "installationOfEarthElectrode",
            title: "6. Installation of Earth Electrode",
            acceptanceCriteria: (
                 <ul className="list-decimal list-inside">
                    <li>Earth electrode should be installed in ground straight.</li>
                    <li>Funnel & Clamp should be welded on the top portion of the earth electrode</li>
                </ul>
            )
        },
        {
            name: "connectionOfEarthStrip",
            title: "7. Connection of Earth Strip with Earth Electrode",
            acceptanceCriteria: (
                <ul className="list-decimal list-inside">
                    <li>Connection of the Earth Electrode with Earth Strip to be done using GI Nut Bolt.</li>
                    <li>Proper connection should be ensured between Earth strip & Electrode</li>
                </ul>
            )
        },
        {
            name: "preparationOfConcretePit",
            title: "8. Preparation of Concrete pit & Cover",
            acceptanceCriteria: "Earth Pits & its Cover should be made by using concrete"
        },
    ];

    const tqpChecklist: ChecklistItemProps[] = [
        ...surveillanceChecklist,
        {
            name: "continuityOfEarthingSystem",
            title: "9. Continuity of Earthing System",
            acceptanceCriteria: "Earthing should be continue from Panel/Board to Earth Electrode"
        },
        {
            name: "resistanceOfTheEarthElectrode",
            title: "10. Resistance of the Earth Electrode",
            acceptanceCriteria: "Testing to be donr using calibrated Earth tester. Acceptable value of Earth Resistance is less than 5 Ohm for Domestic. For Industrial Installation please refer TS."
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

    