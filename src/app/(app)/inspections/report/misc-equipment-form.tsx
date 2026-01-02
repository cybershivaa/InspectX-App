
"use client";

import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PlusCircle, Trash2, Upload } from 'lucide-react';
import type { InspectionReportFormValues } from './page';

interface MiscEquipmentFormProps {
    onBack: () => void;
    onNext: () => void;
    isPending: boolean;
}

function DeviationFields({ inspectionIndex }: { inspectionIndex: number }) {
    const { control } = useFormContext<InspectionReportFormValues>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: `miscInspections.${inspectionIndex}.deviations`,
    });

    return (
        <div className='space-y-4'>
            {fields.map((item, deviationIndex) => (
                <div key={item.id} className="space-y-4 rounded-lg border p-4">
                     <div className="flex justify-between items-center">
                        <FormLabel>Site Images {deviationIndex + 1}</FormLabel>
                        {deviationIndex > 0 && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => remove(deviationIndex)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center justify-center w-full">
                        <label htmlFor={`dropzone-file-${inspectionIndex}-${deviationIndex}`} className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                                <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                            </div>
                            <input id={`dropzone-file-${inspectionIndex}-${deviationIndex}`} type="file" className="hidden" />
                        </label>
                    </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={control}
                            name={`miscInspections.${inspectionIndex}.deviations.${deviationIndex}.deviations`}
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
                            name={`miscInspections.${inspectionIndex}.deviations.${deviationIndex}.rectification`}
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
                </div>
            ))}
             <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ deviations: '', rectification: '' })}
            >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Deviation
            </Button>
        </div>
    )
}

export function MiscEquipmentForm({ onBack, onNext, isPending }: MiscEquipmentFormProps) {
    const { control } = useFormContext<InspectionReportFormValues>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: "miscInspections",
    });

    return (
        <>
            <CardContent className="space-y-6">
                 {fields.map((item, index) => (
                    <div key={item.id} className="space-y-4 rounded-lg border p-4 relative">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-semibold text-base">Inspection {index + 1}</h4>
                            {index > 0 && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => remove(index)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                       
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={control}
                                name={`miscInspections.${index}.location`}
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
                                name={`miscInspections.${index}.systemName`}
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

                        <DeviationFields inspectionIndex={index} />
                    </div>
                ))}
                
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ location: '', systemName: '', deviations: [{ deviations: '', rectification: ''}]})}
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

    