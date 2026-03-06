
"use client";

import React, { useTransition, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon } from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';
import { createInspectionCall } from '@/app/actions/inspections';
import Image from 'next/image';

const equipmentNames = [
    { id: "ht-motor", label: "HT Motor" },
    { id: "lt-motor", label: "LT Motor" },
    { id: "cable-laying", label: "Cable Laying/Installation" },
    { id: "testing-power-cables", label: "Testing of Power Cables" },
    { id: "cable-trays", label: "Cable Trays" },
    { id: "earthing-system", label: "Earthing System" },
    { id: "ht-lt-switchgear", label: "HT/LT SwitchGear" },
    { id: "lt-panels", label: "LT Panels" },
    { id: "busduct", label: "Busduct" },
    { id: "station-lighting", label: "Station Lighting" },
    { id: "lighting-pole", label: "Lighting Pole/High Mast/FVI" },
    { id: "misc-equipment", label: "Miscellaneous Equipment/System" },
    { id: "ci-equipments", label: "C&I Equipments/Works" },
    { id: "power-transformer", label: "Power Transformer" },
    { id: "outdoor-transformer", label: "Outdoor Transformer" },
    { id: "elevator", label: "Elevator" },
    { id: "turbogenerator", label: "Turbogenerator" },
];

const machineOptions = [
    { value: "NTPC-HTM-001", label: "HT Motor (NTPC-HTM-001)" },
    { value: "NTPC-LTM-002", label: "LT Motor (NTPC-LTM-002)" },
    { value: "NTPC-CBL-003", label: "Cable Laying/Installation (NTPC-CBL-003)" },
    { value: "NTPC-TPC-004", label: "Testing of Power Cables (NTPC-TPC-004)" },
    { value: "NTPC-CT-005", label: "Cable Trays (NTPC-CT-005)" },
    { value: "NTPC-ES-006", label: "Earthing System (NTPC-ES-006)" },
    { value: "NTPC-SWG-007", label: "HT/LT SwitchGear (NTPC-SWG-007)" },
    { value: "NTPC-LTP-008", label: "LT Panels (NTPC-LTP-008)" },
    { value: "NTPC-BSD-009", label: "Busduct (NTPC-BSD-009)" },
    { value: "NTPC-STL-010", label: "Station Lighting (NTPC-STL-010)" },
    { value: "NTPC-LPH-011", label: "Lighting Pole/High Mast/FVI (NTPC-LPH-011)" },
    { value: "NTPC-MISC-012", label: "Miscellaneous Equipment/System (NTPC-MISC-012)" },
    { value: "NTPC-CI-013", label: "C&I Equipments/Works (NTPC-CI-013)" },
    { value: "NTPC-PT-014", label: "Power Transformer (NTPC-PT-014)" },
    { value: "NTPC-OT-015", label: "Outdoor Transformer (NTPC-OT-015)" },
    { value: "NTPC-ELV-016", label: "Elevator (NTPC-ELV-016)" },
    { value: "NTPC-TRB-017", label: "Turbogenerator (NTPC-TRB-017)" },
];


const agencyNames = ["PMIL", "DPSI(Doosan)", "Bajaj Mukand", "RKSCPL", "Melco", "Deepak Electricals", "Yokogawa", "Minimax", "BHEL", "Overhauling Checks"];
const areaDetailsNames = ["Store", "Audit of Store"];


const formSchema = z.object({
  agencyName: z.string().min(1, "Agency name is required."),
  areaDetails: z.string().min(1, "Area details are required."),
  unitNo: z.string().min(1, "Unit number is required."),
  inspectionDate: z.date({
    required_error: "Date of inspection is required.",
  }),
  equipmentDetails: z.string().min(1, "Equipment details are required."),
  machineSlNo: z.string().min(1, "Machine SL No. is required."),
  checkType: z.enum(["Surveillance Check", "Testing as per FQP", "Overhauling Check"], {
    required_error: "You need to select a check type.",
  }),
  equipmentName: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one equipment item.",
  }),
  reportNo: z.string().min(1, "Report number is required."),
  priority: z.enum(["Low", "Medium", "High", "Critical"], {
    required_error: "You need to select a priority level.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export function NewInspectionForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAppContext();
  const [isPending, startTransition] = useTransition();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      agencyName: "",
      areaDetails: "",
      unitNo: "",
      inspectionDate: new Date(),
      equipmentDetails: "",
      machineSlNo: "",
      reportNo: "FQA/N/",
      equipmentName: [],
      priority: "Medium",
    },
  });

  const agencyNameValue = form.watch('agencyName');

  useEffect(() => {
    if (agencyNameValue) {
      form.setValue('reportNo', `FQA/N/${agencyNameValue}/`);
    } else {
      form.setValue('reportNo', 'FQA/N/');
    }
  }, [agencyNameValue, form]);

  const onSubmit = (values: FormValues) => {
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to create an inspection call." });
      return;
    }

    // Only Clients can raise new inspection calls
    if (user.role !== 'Client') {
      toast({ variant: "destructive", title: "Unauthorized", description: "Only Clients can raise new inspection calls." });
      return;
    }

    startTransition(async () => {
      try {
        const selectedMachine = machineOptions.find(m => m.value === values.machineSlNo);
        const machineName = selectedMachine ? selectedMachine.label.split(' (')[0] : 'N/A';

        const result = await createInspectionCall({
          machineName,
          machineSlNo: values.machineSlNo,
          priority: values.priority,
          notes: values.equipmentDetails,
          fullReport: {
            agencyName: values.agencyName,
            areaDetails: values.areaDetails,
            unitNo: values.unitNo,
            inspectionDate: values.inspectionDate,
            equipmentDetails: values.equipmentDetails,
            machineSlNo: values.machineSlNo,
            checkType: values.checkType,
            equipmentName: values.equipmentName,
            reportNo: values.reportNo,
          },
        }, user.name);

        if (!result.success) {
          throw new Error(result.error || 'Failed to create inspection.');
        }

        toast({
          title: "Inspection Call Created",
          description: "Your inspection call has been successfully created.",
        });
        router.push('/inspections');
      } catch (error: any) {
        console.error("Failed to create inspection:", error);
        toast({
          variant: "destructive",
          title: "Creation Failed",
          description: error?.message || "An unexpected error occurred while creating the inspection call.",
        });
      }
    });
  };
  
  if (!user || user.role !== 'Client') {
     return (
       <Card>
        <CardHeader>
          <CardTitle>Unauthorized</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-12">Only Clients can raise new inspection calls.</p>
        </CardContent>
      </Card>
     )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>NTPC BARH FQA - Add New Inspection</CardTitle>
        <CardDescription>Fill out the form for Electrical-C&I Surveillance Checks.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8">
            {/* Basic Details Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Basic Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="agencyName"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Name of the Agency <span className="text-red-500">*</span></FormLabel>
                       <Combobox
                          options={agencyNames.map(name => ({ value: name, label: name }))}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select or type agency..."
                        />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="areaDetails"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Area Details <span className="text-red-500">*</span></FormLabel>
                      <Combobox
                          options={areaDetailsNames.map(name => ({ value: name, label: name }))}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select or type area..."
                        />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unitNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit No <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Enter unit number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="inspectionDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Inspection</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Priority Level <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl><RadioGroupItem value="Low" /></FormControl>
                            <FormLabel className="font-normal">🟢 Low - Routine check</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl><RadioGroupItem value="Medium" /></FormControl>
                            <FormLabel className="font-normal">🟡 Medium - Normal priority</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl><RadioGroupItem value="High" /></FormControl>
                            <FormLabel className="font-normal">🟠 High - Urgent attention</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl><RadioGroupItem value="Critical" /></FormControl>
                            <FormLabel className="font-normal">🔴 Critical - Immediate action</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormDescription>
                        High and Critical priorities will be assigned to inspectors automatically when available.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="machineSlNo"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Equipment/Machine SL No: <span className="text-red-500">*</span></FormLabel>
                       <Combobox
                          options={machineOptions}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select machine..."
                          emptyMessage="No machine found."
                        />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Equipment Details Section */}
            <div className="space-y-4">
               <h3 className="text-lg font-medium border-b pb-2">Equipment Details</h3>
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-1 space-y-6">
                    <FormField
                      control={form.control}
                      name="equipmentDetails"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Equipment Details <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="Enter equipment details" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="checkType"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Type of Check <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-1"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl><RadioGroupItem value="Surveillance Check" /></FormControl>
                                <FormLabel className="font-normal">Surveillance Check</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl><RadioGroupItem value="Testing as per FQP" /></FormControl>
                                <FormLabel className="font-normal">Testing as per FQP</FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl><RadioGroupItem value="Overhauling Check" /></FormControl>
                                <FormLabel className="font-normal">Overhauling Check</FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                 </div>
                 <div className="lg:col-span-2">
                    <FormField
                      control={form.control}
                      name="equipmentName"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel className="text-base">Equipment Name <span className="text-red-500">*</span></FormLabel>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {equipmentNames.map((item) => (
                            <FormField
                              key={item.id}
                              control={form.control}
                              name="equipmentName"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={item.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...(field.value || []), item.id])
                                            : field.onChange(
                                                (field.value || [])?.filter(
                                                  (value) => value !== item.id
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      {item.label}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                 </div>
               </div>
            </div>

            {/* Report No */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="reportNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Report No</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

    

    