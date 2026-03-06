"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Trash2, Monitor, Loader2, CheckCheck } from "lucide-react";
import { assignFormToMachines, deleteFormTemplate } from "@/app/actions/forms";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import type { FormTemplate, Machine } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  templates: FormTemplate[];
  machines: Machine[];
}

export function FormBuilderClient({ templates, machines }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Assign dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<FormTemplate | null>(null);

  const openAssignDialog = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setSelectedMachineIds(template.assignedMachineIds || []);
    setAssignDialogOpen(true);
  };

  const toggleMachine = (machineId: string) => {
    setSelectedMachineIds(prev =>
      prev.includes(machineId)
        ? prev.filter(id => id !== machineId)
        : [...prev, machineId]
    );
  };

  const handleAssign = () => {
    if (!selectedTemplate) return;
    startTransition(async () => {
      const result = await assignFormToMachines(selectedTemplate.id, selectedMachineIds);
      if (result.success) {
        toast({
          title: "Assigned Successfully",
          description: selectedMachineIds.length === 0
            ? `"${selectedTemplate.name}" is now unassigned from all machines.`
            : `"${selectedTemplate.name}" assigned to ${selectedMachineIds.length} machine(s).`,
        });
        setAssignDialogOpen(false);
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "Assignment Failed", description: result.error });
      }
    });
  };

  const openDeleteDialog = (template: FormTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (!templateToDelete) return;
    startTransition(async () => {
      const result = await deleteFormTemplate(templateToDelete.id);
      if (result.success) {
        toast({ title: "Template Deleted", description: `"${templateToDelete.name}" has been deleted.` });
        setDeleteDialogOpen(false);
        router.refresh();
      } else {
        toast({ variant: "destructive", title: "Delete Failed", description: result.error });
      }
    });
  };

  return (
    <>
      {/* Desktop Table View */}
      <div className="table-responsive hidden sm:block">
      <Table className="min-w-[600px]">
        <TableHeader>
          <TableRow>
            <TableHead>Template Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Fields</TableHead>
            <TableHead>Assigned Machines</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                No form templates yet. Click "Create Template" to get started.
              </TableCell>
            </TableRow>
          ) : (
            templates.map(template => {
              const assignedCount = template.assignedMachineIds?.length || 0;
              const assignedNames = (template.assignedMachineIds || [])
                .map(id => machines.find(m => m.id === id)?.name)
                .filter(Boolean);

              return (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[220px] truncate">
                    {template.description || <span className="italic text-xs">No description</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{template.fields.length}</Badge>
                  </TableCell>
                  <TableCell>
                    {assignedCount === 0 ? (
                      <span className="text-xs text-muted-foreground italic">Not assigned</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {assignedNames.slice(0, 2).map(name => (
                          <Badge key={name} variant="outline" className="text-xs gap-1">
                            <Monitor className="h-3 w-3" />
                            {name}
                          </Badge>
                        ))}
                        {assignedNames.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{assignedNames.length - 2} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => openAssignDialog(template)}
                      >
                        <Monitor className="h-3.5 w-3.5" />
                        Assign
                      </Button>
                      <Button variant="outline" size="icon" asChild>
                        <Link href={`/form-builder/${template.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => openDeleteDialog(template)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-3">
        {templates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No form templates yet. Click "Create Template" to get started.
          </div>
        ) : (
          templates.map(template => {
            const assignedCount = template.assignedMachineIds?.length || 0;
            const assignedNames = (template.assignedMachineIds || [])
              .map(id => machines.find(m => m.id === id)?.name)
              .filter(Boolean);

            return (
              <div key={template.id} className="border rounded-xl p-4 space-y-3 bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{template.name}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {template.description || 'No description'}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-xs">{template.fields.length} fields</Badge>
                </div>
                {assignedCount > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {assignedNames.slice(0, 3).map(name => (
                      <Badge key={name} variant="outline" className="text-[10px] gap-1">
                        <Monitor className="h-2.5 w-2.5" />
                        {name}
                      </Badge>
                    ))}
                    {assignedNames.length > 3 && (
                      <Badge variant="outline" className="text-[10px]">
                        +{assignedNames.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
                {assignedCount === 0 && (
                  <p className="text-[10px] text-muted-foreground italic">Not assigned to any machines</p>
                )}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 text-xs h-8"
                    onClick={() => openAssignDialog(template)}
                  >
                    <Monitor className="h-3 w-3" />
                    Assign
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 px-3" asChild>
                    <Link href={`/form-builder/${template.id}`}>
                      <Edit className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => openDeleteDialog(template)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Assign to Machine Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Assign to Machines
            </DialogTitle>
            <DialogDescription>
              Select the machines this form template should be linked to.
              {selectedTemplate && (
                <span className="block mt-1 font-medium text-foreground">"{selectedTemplate.name}"</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-72 pr-2">
            {machines.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No machines available.</p>
            ) : (
              <div className="space-y-2 py-1">
                {machines.map(machine => (
                  <label
                    key={machine.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedMachineIds.includes(machine.id)}
                      onCheckedChange={() => toggleMachine(machine.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{machine.name}</p>
                      <p className="text-xs text-muted-foreground">{machine.machineId} · {machine.status}</p>
                    </div>
                    {selectedMachineIds.includes(machine.id) && (
                      <CheckCheck className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </label>
                ))}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Assignment ({selectedMachineIds.length} machines)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-medium text-foreground">"{templateToDelete?.name}"</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
