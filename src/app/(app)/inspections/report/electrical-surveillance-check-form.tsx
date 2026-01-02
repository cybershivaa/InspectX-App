
"use client";

import React, { useState, useEffect } from 'react';
import { useFormContext } from "react-hook-form";
import { format } from "date-fns";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { InspectionReportFormValues } from './page';
import { Combobox } from '@/components/ui/combobox';

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

const agencyNames = ["PMIL", "DPSI(Doosan)", "Bajaj Mukand", "RKSCPL", "Melco", "Deepak Electricals", "Yokogawa", "Minimax", "BHEL", "Overhauling Checks"];
const areaDetailsNames = ["Store", "Audit of Store"];


interface ElectricalSurveillanceCheckFormProps {
    onNext: () => void;
}

export function ElectricalSurveillanceCheckForm({ onNext }: ElectricalSurveillanceCheckFormProps) {
  const form = useFormContext<InspectionReportFormValues>();
  const { control, watch, setValue } = form;

  const agencyNameValue = watch('agencyName');

  useEffect(() => {
    if (agencyNameValue) {
      setValue('reportNo', `FQA/N/${agencyNameValue}/`);
    } else {
      setValue('reportNo', 'FQA/N/');
    }
  }, [agencyNameValue, setValue]);


  return (
    <>
      <CardContent className="space-y-8">
        {/* Basic Details Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b pb-2">Basic Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={control}
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
                  control={control}
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
              control={control}
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
              control={control}
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
                            format(new Date(field.value), "PPP")
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
              control={control}
              name="machineSlNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Equipment/Machine SL No: <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Enter Machine Serial Number" {...field} value={field.value ?? ''} />
                  </FormControl>
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
                  control={control}
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
                  control={control}
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
                  control={control}
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
                          control={control}
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
                                            (field.value || []).filter(
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
            control={control}
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
        <Button type="button" onClick={onNext}>
          Next
        </Button>
      </CardFooter>
    </>
  );
}

    