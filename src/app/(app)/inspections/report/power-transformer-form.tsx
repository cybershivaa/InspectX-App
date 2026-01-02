
"use client";

import React, { useRef, useState } from 'react';
import { useFormContext, useFieldArray, useWatch } from 'react-hook-form';
import { CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PlusCircle, Trash2, Upload, Paperclip } from 'lucide-react';
import type { InspectionReportFormValues } from './page';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes } from 'firebase/storage';

interface PowerTransformerFormProps {
    onBack: () => void;
    onNext: () => void;
    isPending: boolean;
}

function FileUploadButton({
    fieldPath,
    label
}: {
    fieldPath: `powerTransformerInspections.${number}.testReportsPath` | `powerTransformerInspections.${number}.deviations.${number}.imagePath`;
    label: string;
}) {
    const { setValue, getValues } = useFormContext<InspectionReportFormValues>();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    
    const existingValue = useWatch({ name: fieldPath });
    const [fileName, setFileName] = useState<string | null>(null);

    React.useEffect(() => {
        const currentPath = getValues(fieldPath);
        if (currentPath) {
            // Extract file name from path
            const parts = currentPath.split('/');
            const lastPart = parts.pop() || '';
            const nameOnly = lastPart.split('-').slice(0, -1).join('-') || lastPart;
            setFileName(nameOnly);
        }
    }, [existingValue, fieldPath, getValues]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setFileName(file.name);
        try {
            const filePath = `inspections/${fieldPath}/${file.name}-${Date.now()}`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, file);
            
            setValue(fieldPath, filePath, { shouldValidate: true, shouldDirty: true });

            toast({ title: 'Upload Successful', description: 'The file has been uploaded.' });
        } catch (error) {
            console.error("Upload failed", error);
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'There was an error uploading the file.' });
        } finally {
            setIsUploading(false);
        }
    };

    return (
         <div className="space-y-2">
            <FormLabel>{label}</FormLabel>
            <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    {isUploading ? 'Uploading...' : fileName ? 'Change File' : 'Upload File'}
                </Button>
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
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
    );
}


function DeviationFields({ inspectionIndex }: { inspectionIndex: number }) {
    const { control } = useFormContext<InspectionReportFormValues>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: `powerTransformerInspections.${inspectionIndex}.deviations`,
    });

    return (
        <div className='space-y-4'>
             <h5 className="font-semibold">Deviations</h5>
            {fields.map((item, deviationIndex) => (
                <div key={item.id} className="space-y-4 rounded-lg border p-4 relative">
                     <div className="flex justify-between items-center">
                        <FormLabel>Deviation {deviationIndex + 1}</FormLabel>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => remove(deviationIndex)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    <FileUploadButton
                        fieldPath={`powerTransformerInspections.${inspectionIndex}.deviations.${deviationIndex}.imagePath`}
                        label="Site Images"
                    />

                    <FormField
                        control={control}
                        name={`powerTransformerInspections.${inspectionIndex}.deviations.${deviationIndex}.deviations`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Deviations/Issues</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Describe any deviations or issues found..." {...field} value={field.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name={`powerTransformerInspections.${inspectionIndex}.deviations.${deviationIndex}.rectification`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Proposed Rectification</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Describe the proposed rectification..." {...field} value={field.value ?? ''} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            ))}
             <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ deviations: '', rectification: '', imagePath: '' })}
            >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Deviation
            </Button>
        </div>
    )

}

export function PowerTransformerForm({ onBack, onNext, isPending }: PowerTransformerFormProps) {
    const { control } = useFormContext<InspectionReportFormValues>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: "powerTransformerInspections",
    });

    return (
        <>
            <CardContent className="space-y-6">
                 {fields.map((item, index) => (
                    <div key={item.id} className="space-y-4 rounded-lg border p-4 relative">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-semibold text-base">Inspection {index + 1}</h4>
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() => remove(index)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={control}
                                name={`powerTransformerInspections.${index}.location`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Location</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter location" {...field} value={field.value ?? ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name={`powerTransformerInspections.${index}.systemName`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name of the System/Equipment</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter system/equipment name" {...field} value={field.value ?? ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={control}
                            name={`powerTransformerInspections.${index}.inspectionTestDetails`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Inspection/Test Details</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Describe inspection/test details..." {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={control}
                            name={`powerTransformerInspections.${index}.deviationsPendingPoints`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Deviations/Pending Point Details</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Describe deviations/pending points..." {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         
                         <FileUploadButton
                            fieldPath={`powerTransformerInspections.${index}.testReportsPath`}
                            label="Test Reports/Protocols"
                         />

                        <Separator className='my-6' />

                        <DeviationFields inspectionIndex={index} />
                    </div>
                ))}
                
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ 
                        location: '', 
                        systemName: '', 
                        inspectionTestDetails: '', 
                        deviationsPendingPoints: '', 
                        testReportsPath: '',
                        deviations: [{ deviations: '', rectification: '', imagePath: ''}]
                    })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Inspection
                </Button>

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
