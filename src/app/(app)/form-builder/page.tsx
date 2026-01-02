"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formTemplates } from "@/lib/data";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge";

export default function FormBuilderPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Form Builder</h1>
          <p className="text-muted-foreground">
            Design and manage custom inspection form templates.
          </p>
        </div>
        <Button asChild>
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
            Browse and manage your existing form templates.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Fields</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell className="text-muted-foreground">{template.description}</TableCell>
                   <TableCell>
                      <Badge variant="secondary">{template.fields.length}</Badge>
                    </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="icon" asChild>
                      <Link href={`/form-builder/${template.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                     <Button variant="destructive" size="icon" onClick={() => alert(`Deleting ${template.name}`)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}