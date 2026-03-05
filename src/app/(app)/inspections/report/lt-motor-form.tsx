

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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
// All Firebase storage logic replaced with Supabase Storage below

interface ChecklistItemProps {
    name: keyof InspectionReportFormValues;
    title: string;
    acceptanceCriteria: React.ReactNode;
}

function ChecklistItem({ name, title, acceptanceCriteria }: ChecklistItemProps) {
    const { control, setValue } = useFormContext<InspectionReportFormValues>();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setFileName(file.name);
        try {
            const filePath = `inspections/${name}/${Date.now()}_${file.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('inspections')
              .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('inspections').getPublicUrl(filePath);
            const fieldName = `${name}.imagePath` as const;
            setValue(fieldName, urlData.publicUrl, { shouldValidate: true });

            toast({ title: 'Image Uploaded', description: 'The image has been successfully uploaded.' });
        } catch (error) {
            console.error("Upload failed", error);
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'There was an error uploading the image.' });
        } finally {
            setIsUploading(false);
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
                             <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                {isUploading ? 'Uploading...' : fileName ? 'Change' : 'Upload'}
                            </Button>
                             <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleFileChange}
                                disabled={isUploading}
                            />
                            {fileName && !isUploading && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Paperclip className="h-4 w-4" />
                                    <span className="truncate max-w-xs">{fileName}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

interface LtMotorFormProps {
    onBack: () => void;
    onNext: () => void;
    isPending: boolean;
}

export function LtMotorForm({ onBack, onNext, isPending }: LtMotorFormProps) {
    const { control, watch } = useFormContext<InspectionReportFormValues>();
    const checkType = watch('checkType');

    const surveillanceChecklist: ChecklistItemProps[] = [
        { 
            name: "installation", 
            title: "1. Installation of motor on foundation", 
            acceptanceCriteria: "Motor should be properly installed on foundation" 
        },
        { 
            name: "damage", 
            title: "2. Any damage to the Motor/Mounting Instruments", 
            acceptanceCriteria: "Motor should not have any damage/Missing of any Components" 
        },
        { 
            name: "cleanliness", 
            title: "3. Cleanliness of Motor", 
            acceptanceCriteria: "Properly Cleaned" 
        },
        { 
            name: "termination", 
            title: "4. Termination of Power Cables to Motor", 
            acceptanceCriteria: "1. Cable gland should not be loose. 2. Cable Tags to be provided"
        },
        { 
            name: "earthing", 
            title: "5. Earthing Connection to the Motor/TBs using Proper Earth Strip", 
            acceptanceCriteria: "1. Double earthing should be given. Terminal box should also be earthed seperately. Earth Strip should be as per TS"
        },
        { 
            name: "rotation", 
            title: "6. Free Rotation of Motor", 
            acceptanceCriteria: "Motor should be rotated freely by hand. There should not be any sound/noise whlie rotating"
        },
    ];

    const tqpChecklist: ChecklistItemProps[] = [
        { 
            name: "installation", 
            title: "1. Installation of motor on foundation", 
            acceptanceCriteria: "Motor should be properly installed on foundation" 
        },
        { 
            name: "damage", 
            title: "2. Any damage to the Motor/Mounting Instruments", 
            acceptanceCriteria: "Motor should not have any damage/Missing of any Components" 
        },
        { 
            name: "cleanliness", 
            title: "3. Cleanliness of Motor", 
            acceptanceCriteria: "Properly Cleaned" 
        },
        { 
            name: "termination", 
            title: "4. Termination of Power Cables to Motor", 
            acceptanceCriteria: (
                <ul className="list-decimal list-inside">
                    <li>Cable gland should not be loose.</li>
                    <li>Cable Tags to be provided</li>
                </ul>
            )
        },
        { 
            name: "earthing", 
            title: "5. Earthing Connection to the Motor/TBs using Proper Earth Strip", 
            acceptanceCriteria: (
                <ul className="list-decimal list-inside">
                    <li>Double earthing should be given.</li>
                    <li>Terminal box should also be earthed seperately.</li>
                    <li>Earth Strip should be as per TS</li>
                </ul>
            )
        },
        { 
            name: "rotation", 
            title: "6. Free Rotation of Motor", 
            acceptanceCriteria: "Motor should be rotated freely by hand. There should not be any sound/noise whlie rotating" 
        },
        {
            name: "windingTemp",
            title: "7. Winding temperature of Motor",
            acceptanceCriteria: "winding Temp should be equal to or slightly higher than Amb Temp"
        },
        {
            name: "testingKitsCalibration",
            title: "8. Calibration of Testing kits for motor",
            acceptanceCriteria: "Test Kits should be duly calibrated"
        },
        {
            name: "motorIrPiWr",
            title: "9. IR & WR of Motor",
            acceptanceCriteria: "For IR, IR (1Min) should be more than 5 Mohm. WR should be balanced & deviations should be within 5% of average reading.( Check FQP for Final Acceptance)"
        },
        {
            name: "spaceHeaterIrWr",
            title: "10. IR,WR of Space Heater & RTD (If Applicable)",
            acceptanceCriteria: "IR of space Heater to be done by 250 V megger. For RTD, IR to be done based on Mfr's reccomendation."
        }
    ];

    const showTqpForm = checkType === 'Testing as per FQP' || checkType === 'Overhauling Check';
    const checklistItems = showTqpForm ? tqpChecklist : surveillanceChecklist;

    return (
        <>
            <CardContent className="space-y-6">
                 {showTqpForm && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 rounded-lg border p-4">
                        <FormField
                            control={control}
                            name="ambientTemp"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ambient Temp:<span className="text-red-500">*</span></FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter ambient temperature" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={control}
                            name="relativeHumidity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Relative Humidity (%)<span className="text-red-500">*</span></FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter relative humidity" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )}
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

    