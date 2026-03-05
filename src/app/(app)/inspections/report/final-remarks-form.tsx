

"use client";

import React, { useState, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Paperclip } from 'lucide-react';
import type { InspectionReportFormValues } from './page';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
// All Firebase storage logic replaced with Supabase Storage below
import { Button } from '@/components/ui/button';

interface SignatureFieldsProps {
    role: "Contractor" | "NTPCErection" | "NTPCFQA";
    label: string;
}

function SignatureFields({ role, label }: SignatureFieldsProps) {
    const { control } = useFormContext<InspectionReportFormValues>();

    return (
        <div className="space-y-4 rounded-lg border p-4">
            <h4 className="text-center font-semibold">{label}</h4>
            <FormField
                control={control}
                name={`signature${role}.name`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                            <Input placeholder="Enter name" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={control}
                name={`signature${role}.signature`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Signature</FormLabel>
                        <FormControl>
                             <div className="flex items-center justify-center w-full">
                                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                        <p className="text-xs text-muted-foreground">Click to upload signature</p>
                                    </div>
                                    <input type="file" className="hidden" />
                                </label>
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    )
}


interface FinalRemarksFormProps {
    isPending: boolean;
}

export function FinalRemarksForm({ isPending }: FinalRemarksFormProps) {
    const { control, setValue } = useFormContext<InspectionReportFormValues>();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            handleFileUpload(file);
        }
    };

    const handleFileUpload = async (file: File) => {
        setIsUploading(true);
        setUploadedFile(file);
        try {
            const filePath = `reports/${Date.now()}_${file.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('inspections')
              .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('inspections').getPublicUrl(filePath);
            setValue('reportUrl', urlData.publicUrl);
            toast({ title: 'Upload Successful', description: 'Test report has been uploaded.' });
        } catch(error) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'There was an error uploading your file.' });
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <>
            <CardContent className="space-y-8">
                <FormField
                    control={control}
                    name="otherRemarks"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Other Remarks</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Enter any other remarks here..."
                                    className="min-h-[120px]"
                                    {...field}
                                    value={field.value ?? ''}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormItem>
                    <FormLabel>File Upload (Test Report)</FormLabel>
                    <div 
                        className="flex items-center justify-center w-full"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                handleFileUpload(e.dataTransfer.files[0]);
                            }
                        }}
                    >
                        <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                {isUploading ? (
                                    <Loader2 className="w-8 h-8 mb-4 text-muted-foreground animate-spin" />
                                ) : (
                                    <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                                )}
                                <p className="mb-2 text-sm text-muted-foreground">
                                    <span className="font-semibold">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-muted-foreground">PDF, PNG, JPG (MAX. 5MB)</p>
                            </div>
                            <input 
                                id="dropzone-file" 
                                type="file" 
                                className="hidden" 
                                ref={fileInputRef}
                                onChange={handleFileChange} 
                                disabled={isUploading}
                            />
                        </label>
                    </div>
                     {uploadedFile && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                            <Paperclip className="h-4 w-4" />
                            <span>{uploadedFile.name}</span>
                        </div>
                    )}
                </FormItem>

                <Separator />
                
                <h3 className="text-lg font-medium text-center">Signatures</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                    <SignatureFields role="Contractor" label="For Contractor/Sub-Contractor" />
                    <SignatureFields role="NTPCErection" label="For NTPC Erection" />
                    <SignatureFields role="NTPCFQA" label="For NTPC FQA" />
                </div>

            </CardContent>
        </>
    );
}

    