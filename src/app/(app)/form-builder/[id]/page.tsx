"use client";

import React, { useTransition, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formTemplates } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Type, FileText, Image as ImageIcon } from 'lucide-react';
import { saveFormTemplate } from '@/app/actions/forms';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

type FieldType = 'text' | 'pdf' | 'photo';

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
}

const formSchema = z.object({
  name: z.string().min(1, "Template name is required."),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditFormTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [formFields, setFormFields] = useState<FormField[]>([]);

  const isNew = params.id === 'new';
  const template = isNew ? null : formTemplates.find(t => t.id === params.id);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: template?.name || "",
      description: template?.description || "",
    },
  });

  const addField = (type: FieldType) => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type,
      label: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      required: false,
    };
    setFormFields([...formFields, newField]);
    toast({
      title: "Field Added",
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} field added successfully.`,
    });
  };

  const removeField = (id: string) => {
    setFormFields(formFields.filter(field => field.id !== id));
    toast({
      title: "Field Removed",
      description: "Field has been removed from the form.",
    });
  };

  const updateFieldLabel = (id: string, label: string) => {
    setFormFields(formFields.map(field => 
      field.id === id ? { ...field, label } : field
    ));
  };

  const getFieldIcon = (type: FieldType) => {
    switch (type) {
      case 'text': return <Type className="h-4 w-4" />;
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'photo': return <ImageIcon className="h-4 w-4" />;
    }
  };

  const onSubmit = (values: FormValues) => {
    if (formFields.length === 0) {
      toast({
        variant: "destructive",
        title: "No Fields Added",
        description: "Please add at least one field to the form template.",
      });
      return;
    }

    startTransition(async () => {
      const result = await saveFormTemplate({
        id: isNew ? undefined : template!.id,
        ...values,
        fields: formFields,
      });

      if (result.success) {
        toast({
          title: `Template ${isNew ? 'Created' : 'Updated'}`,
          description: `The form template has been successfully saved with ${formFields.length} field(s).`,
        });
        router.push('/form-builder');
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Save Failed",
          description: result.error,
        });
      }
    });
  };
  
  return (
    <div className="container max-w-5xl mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>{isNew ? 'Create New Form Template' : 'Edit Form Template'}</CardTitle>
          <CardDescription>
            {isNew ? 'Define the basic details for your new template.' : `Modify the details for "${template?.name}".`}
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Monthly Maintenance Checklist" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the purpose or scope of this form template..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Field Management Section */}
              <div className="space-y-4 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Form Fields</h3>
                    <p className="text-sm text-muted-foreground">Add and configure fields for your form template</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="default">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Field
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => addField('text')}>
                        <Type className="h-4 w-4 mr-2" />
                        Text Field
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addField('pdf')}>
                        <FileText className="h-4 w-4 mr-2" />
                        PDF Upload
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addField('photo')}>
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Photo Upload
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {formFields.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed rounded-lg bg-muted/30">
                    <Plus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground font-medium">No fields added yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Click "Add Field" button above to start building your form</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {formFields.map((field, index) => (
                        <Card key={field.id} className="bg-muted/30 border-2 hover:border-primary/50 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className="mt-2">
                                <Badge variant="secondary" className="gap-1.5">
                                  {getFieldIcon(field.type)}
                                  <span className="font-medium">{field.type.toUpperCase()}</span>
                                </Badge>
                              </div>
                              <div className="flex-1 space-y-3">
                                <div>
                                  <label className="text-sm font-medium mb-1.5 block">Field Label</label>
                                  <Input
                                    value={field.label}
                                    onChange={(e) => updateFieldLabel(field.id, e.target.value)}
                                    placeholder="Enter field label"
                                    className="bg-background"
                                  />
                                </div>
                                <div className="bg-background/50 p-3 rounded-md border">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">Field Description:</p>
                                  <p className="text-xs text-muted-foreground">
                                    {field.type === 'text' && '📝 Text input field where users can enter free-form text responses'}
                                    {field.type === 'pdf' && '📄 File upload field that allows users to attach PDF documents (Max 10MB)'}
                                    {field.type === 'photo' && '📷 Image upload field for users to attach photos or images (JPG, PNG, Max 5MB)'}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeField(field.id)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    
                    {/* Preview Section */}
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold mb-4">Form Preview</h3>
                      <Card className="bg-accent/30">
                        <CardHeader>
                          <CardTitle className="text-base">{form.watch('name') || 'Untitled Form'}</CardTitle>
                          <CardDescription>{form.watch('description') || 'No description provided'}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {formFields.map((field) => (
                            <div key={field.id} className="space-y-2">
                              <label className="text-sm font-medium">{field.label}</label>
                              {field.type === 'text' && (
                                <Input placeholder="Enter text..." disabled className="bg-background" />
                              )}
                              {field.type === 'pdf' && (
                                <div className="border-2 border-dashed rounded-md p-4 text-center bg-background">
                                  <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                  <p className="text-xs text-muted-foreground">Click to upload PDF file</p>
                                </div>
                              )}
                              {field.type === 'photo' && (
                                <div className="border-2 border-dashed rounded-md p-4 text-center bg-background">
                                  <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                  <p className="text-xs text-muted-foreground">Click to upload image</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </div>

            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.push('/form-builder')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isNew ? 'Create Template' : 'Save Changes'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}