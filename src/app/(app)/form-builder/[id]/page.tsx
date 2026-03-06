"use client";

import React, { useTransition, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Plus, Trash2, Type, FileText, Image as ImageIcon,
  ChevronDown, Calendar, ToggleLeft, List, GripVertical, X
} from 'lucide-react';
import { saveFormTemplate } from '@/app/actions/forms';
import { supabase } from '@/lib/supabase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

type FieldType = 'text' | 'dropdown' | 'date' | 'yesno' | 'pdf' | 'photo';

interface FormFieldItem {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

const formSchema = z.object({
  name: z.string().min(1, "Template name is required."),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const FIELD_CONFIG: Record<FieldType, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  text: {
    label: 'Text Input',
    icon: <Type className="h-4 w-4" />,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    description: 'Free-form text input for short answers or notes.',
  },
  dropdown: {
    label: 'Dropdown',
    icon: <List className="h-4 w-4" />,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    description: 'Select one option from a predefined list.',
  },
  date: {
    label: 'Date Picker',
    icon: <Calendar className="h-4 w-4" />,
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    description: 'Date input field for recording dates.',
  },
  yesno: {
    label: 'Yes / No',
    icon: <ToggleLeft className="h-4 w-4" />,
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    description: 'Simple boolean toggle — Yes or No answer.',
  },
  pdf: {
    label: 'PDF Upload',
    icon: <FileText className="h-4 w-4" />,
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    description: 'Allow attaching a PDF document (max 10 MB).',
  },
  photo: {
    label: 'Photo Upload',
    icon: <ImageIcon className="h-4 w-4" />,
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    description: 'Allow attaching an image file (JPG/PNG, max 5 MB).',
  },
};

export default function EditFormTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [formFields, setFormFields] = useState<FormFieldItem[]>([]);
  const [loadingTemplate, setLoadingTemplate] = useState(true);

  const isNew = params.id === 'new';

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (isNew) {
      setLoadingTemplate(false);
      return;
    }
    const fetchTemplate = async () => {
      try {
        const { data, error } = await supabase
          .from('form_templates')
          .select('*')
          .eq('id', params.id)
          .single();
        if (error) throw error;
        if (data) {
          form.reset({ name: data.name || '', description: data.description || '' });
          if (Array.isArray(data.fields)) {
            setFormFields(data.fields as FormFieldItem[]);
          }
        }
      } catch {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load template.' });
      } finally {
        setLoadingTemplate(false);
      }
    };
    fetchTemplate();
  }, [isNew, params.id, form, toast]);

  const addField = (type: FieldType) => {
    const cfg = FIELD_CONFIG[type];
    const newField: FormFieldItem = {
      id: `field-${Date.now()}`,
      type,
      label: `New ${cfg.label} Field`,
      required: false,
      ...(type === 'dropdown' ? { options: ['Option 1', 'Option 2'] } : {}),
    };
    setFormFields(prev => [...prev, newField]);
  };

  const removeField = (id: string) => {
    setFormFields(prev => prev.filter(f => f.id !== id));
  };

  const updateField = (id: string, patch: Partial<FormFieldItem>) => {
    setFormFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  };

  const addOption = (fieldId: string) => {
    setFormFields(prev => prev.map(f =>
      f.id === fieldId
        ? { ...f, options: [...(f.options || []), `Option ${(f.options?.length || 0) + 1}`] }
        : f
    ));
  };

  const updateOption = (fieldId: string, index: number, value: string) => {
    setFormFields(prev => prev.map(f => {
      if (f.id !== fieldId) return f;
      const opts = [...(f.options || [])];
      opts[index] = value;
      return { ...f, options: opts };
    }));
  };

  const removeOption = (fieldId: string, index: number) => {
    setFormFields(prev => prev.map(f => {
      if (f.id !== fieldId) return f;
      const opts = [...(f.options || [])];
      opts.splice(index, 1);
      return { ...f, options: opts };
    }));
  };

  const onSubmit = (values: FormValues) => {
    if (formFields.length === 0) {
      toast({ variant: "destructive", title: "No Fields Added", description: "Please add at least one field." });
      return;
    }
    const badDropdown = formFields.find(f => f.type === 'dropdown' && (!f.options || f.options.length < 2));
    if (badDropdown) {
      toast({ variant: "destructive", title: "Incomplete Dropdown", description: `"${badDropdown.label}" needs at least 2 options.` });
      return;
    }

    startTransition(async () => {
      const result = await saveFormTemplate({
        id: isNew ? undefined : (params.id as string),
        name: values.name,
        description: values.description,
        fields: formFields,
        assignedMachineIds: [],
      });

      if (result.success) {
        toast({ title: `Template ${isNew ? 'Created' : 'Updated'}`, description: `Saved with ${formFields.length} field(s).` });
        router.push('/form-builder');
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "Save Failed", description: result.error });
      }
    });
  };

  if (loadingTemplate) {
    return (
      <div className="container max-w-5xl mx-auto py-6 space-y-4">
        <Skeleton className="h-12 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>{isNew ? 'Create New Form Template' : 'Edit Form Template'}</CardTitle>
          <CardDescription>
            {isNew ? 'Define the fields for your new template.' : 'Modify this template and its fields.'}
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {/* Template meta */}
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name <span className="text-destructive">*</span></FormLabel>
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
                      <FormLabel>Description <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Brief description of this form's purpose..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Field management */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Form Fields</h3>
                    <p className="text-sm text-muted-foreground">
                      {formFields.length === 0 ? 'No fields yet — add some below.' : `${formFields.length} field(s) configured`}
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Field
                        <ChevronDown className="h-3 w-3 ml-1 opacity-70" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      {(['text', 'dropdown', 'date', 'yesno'] as FieldType[]).map(type => (
                        <DropdownMenuItem key={type} onClick={() => addField(type)} className="gap-2">
                          <span className={`p-1 rounded ${FIELD_CONFIG[type].color}`}>{FIELD_CONFIG[type].icon}</span>
                          {FIELD_CONFIG[type].label}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      {(['pdf', 'photo'] as FieldType[]).map(type => (
                        <DropdownMenuItem key={type} onClick={() => addField(type)} className="gap-2">
                          <span className={`p-1 rounded ${FIELD_CONFIG[type].color}`}>{FIELD_CONFIG[type].icon}</span>
                          {FIELD_CONFIG[type].label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {formFields.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed rounded-lg bg-muted/20">
                    <Plus className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No fields added yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Click "Add Field" or use the quick-add buttons below</p>
                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                      {(['text', 'dropdown', 'date', 'yesno'] as FieldType[]).map(type => (
                        <Button key={type} variant="outline" size="sm" onClick={() => addField(type)} className="gap-1.5 h-8 text-xs">
                          {FIELD_CONFIG[type].icon}
                          {FIELD_CONFIG[type].label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                    {formFields.map((field, index) => {
                      const cfg = FIELD_CONFIG[field.type];
                      return (
                        <Card key={field.id} className="border-2 hover:border-primary/40 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex flex-col items-center pt-1 gap-1 text-muted-foreground">
                                <GripVertical className="h-4 w-4" />
                                <span className="text-xs font-mono">{index + 1}</span>
                              </div>

                              <div className="flex-1 space-y-3">
                                <div className="flex items-center flex-wrap gap-3">
                                  <Badge className={`gap-1.5 border-0 shrink-0 ${cfg.color}`} variant="outline">
                                    {cfg.icon}
                                    {cfg.label}
                                  </Badge>
                                  <div className="flex-1 min-w-[180px]">
                                    <Input
                                      value={field.label}
                                      onChange={e => updateField(field.id, { label: e.target.value })}
                                      placeholder="Field label"
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <Switch
                                      id={`req-${field.id}`}
                                      checked={field.required}
                                      onCheckedChange={v => updateField(field.id, { required: v })}
                                    />
                                    <Label htmlFor={`req-${field.id}`} className="text-xs text-muted-foreground cursor-pointer">
                                      Required
                                    </Label>
                                  </div>
                                </div>

                                {/* Dropdown options editor */}
                                {field.type === 'dropdown' && (
                                  <div className="bg-muted/30 rounded-md p-3 space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Options</p>
                                    {(field.options || []).map((opt, i) => (
                                      <div key={i} className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                                        <Input
                                          value={opt}
                                          onChange={e => updateOption(field.id, i, e.target.value)}
                                          placeholder={`Option ${i + 1}`}
                                          className="h-7 text-sm bg-background"
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                                          onClick={() => removeOption(field.id, i)}
                                          disabled={(field.options?.length || 0) <= 2}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs gap-1 mt-1"
                                      onClick={() => addOption(field.id)}
                                    >
                                      <Plus className="h-3 w-3" />
                                      Add Option
                                    </Button>
                                  </div>
                                )}

                                <p className="text-xs text-muted-foreground">{cfg.description}</p>
                              </div>

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                onClick={() => removeField(field.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Live Preview */}
              {formFields.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Live Preview</h3>
                    <Card className="bg-muted/20 border-dashed">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{form.watch('name') || 'Untitled Form'}</CardTitle>
                        {form.watch('description') && (
                          <CardDescription>{form.watch('description')}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-5">
                        {formFields.map(field => (
                          <div key={field.id} className="space-y-1.5">
                            <label className="text-sm font-medium">
                              {field.label}
                              {field.required && <span className="text-destructive ml-1">*</span>}
                            </label>
                            {field.type === 'text' && (
                              <Input disabled placeholder="Enter text..." className="bg-background" />
                            )}
                            {field.type === 'dropdown' && (
                              <select disabled className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm cursor-not-allowed opacity-60">
                                <option value="">-- Select an option --</option>
                                {(field.options || []).map((opt, i) => (
                                  <option key={i} value={opt}>{opt}</option>
                                ))}
                              </select>
                            )}
                            {field.type === 'date' && (
                              <Input type="date" disabled className="bg-background w-48" />
                            )}
                            {field.type === 'yesno' && (
                              <div className="flex items-center gap-4 p-3 border rounded-md bg-background w-fit">
                                <label className="flex items-center gap-2 cursor-pointer text-sm">
                                  <input type="radio" name={`prev-${field.id}`} disabled /> Yes
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm">
                                  <input type="radio" name={`prev-${field.id}`} disabled /> No
                                </label>
                              </div>
                            )}
                            {field.type === 'pdf' && (
                              <div className="flex items-center gap-3 border-2 border-dashed rounded-md p-3 bg-background w-fit">
                                <FileText className="h-6 w-6 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Upload PDF file (max 10 MB)</span>
                              </div>
                            )}
                            {field.type === 'photo' && (
                              <div className="flex items-center gap-3 border-2 border-dashed rounded-md p-3 bg-background w-fit">
                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Upload image (JPG/PNG, max 5 MB)</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </CardContent>

            <CardFooter className="flex justify-between border-t pt-6">
              <Button type="button" variant="outline" onClick={() => router.push('/form-builder')}>
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