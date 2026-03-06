import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFormTemplates } from "@/app/actions/forms";
import { getMachines } from "@/app/actions/data";
import { PlusCircle } from "lucide-react";
import { FormBuilderClient } from "./form-builder-client";

export default async function FormBuilderPage() {
  const [formTemplates, machines] = await Promise.all([
    getFormTemplates(),
    getMachines(),
  ]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Form Builder</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Design custom inspection form templates and assign them to machines.
          </p>
        </div>
        <Button asChild size="sm" className="w-full sm:w-auto">
          <Link href="/form-builder/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Template
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Form Templates</CardTitle>
          <CardDescription>
            Manage templates and assign them to specific machines for targeted inspections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormBuilderClient templates={formTemplates} machines={machines} />
        </CardContent>
      </Card>
    </div>
  );
}
