
"use client";

import React, { useMemo, useState, useTransition, useRef, lazy, Suspense, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Machine, MachineStatus, Inspection } from "@/lib/types";
import { Search, SlidersHorizontal, Package, ChevronRight, Download, FileText, User, Calendar, Loader2, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAppContext } from '@/hooks/useAppContext';

const ReportViewDialog = lazy(() => import('./report-view-dialog'));

const statusConfig: Record<MachineStatus, { base: string, pulse: string, badge: string }> = {
  Active: { base: 'bg-green-500', pulse: 'animate-pulse-green', badge: 'border-transparent bg-secondary text-secondary-foreground' },
  Maintenance: { base: 'bg-yellow-500', pulse: 'animate-pulse-yellow', badge: 'border-transparent bg-secondary text-secondary-foreground' },
  Inactive: { base: 'bg-red-500', pulse: 'animate-pulse-red', badge: 'border-transparent bg-secondary text-secondary-foreground' },
};

const inspectionStatusConfig = {
  Completed: { variant: 'default', label: 'Completed' },
  Pending: { variant: 'secondary', label: 'Pending' },
  Failed: { variant: 'destructive', label: 'Failed' },
  Partial: { variant: 'destructive', label: 'Partial' },
  Upcoming: { variant: 'outline', label: 'Upcoming' },
} as const

export default function SearchPage() {
  const { user } = useAppContext();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<MachineStatus | 'All'>('All');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [inspectionHistory, setInspectionHistory] = useState<Inspection[]>([]);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<Inspection['fullReportData'] | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  
  useEffect(() => {
    const fetchMachines = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        // Fetch all inspections and extract unique machines
        const inspectionsSnapshot = await getDocs(collection(db, "inspections"));
        const inspectionsData = inspectionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Inspection[];
        
        // Create unique machines from inspections
        const machineMap = new Map<string, Machine>();
        
        inspectionsData.forEach(inspection => {
          if (inspection.machineSlNo && !machineMap.has(inspection.machineSlNo)) {
            // Handle Firestore Timestamp
            let lastInspectionDate = new Date().toISOString();
            try {
              if (inspection.createdAt) {
                if (typeof inspection.createdAt === 'string') {
                  lastInspectionDate = inspection.createdAt;
                } else if (inspection.createdAt.toDate) {
                  // Firestore Timestamp
                  lastInspectionDate = inspection.createdAt.toDate().toISOString();
                } else if (inspection.createdAt.seconds) {
                  // Firestore Timestamp object
                  lastInspectionDate = new Date(inspection.createdAt.seconds * 1000).toISOString();
                }
              }
            } catch (e) {
              console.error('Error parsing date:', e);
            }
            
            machineMap.set(inspection.machineSlNo, {
              id: inspection.machineSlNo,
              machineId: inspection.machineSlNo,
              name: inspection.machineName || 'Unknown Machine',
              status: inspection.status === 'Completed' ? 'Active' : 
                      inspection.status === 'Pending' ? 'Maintenance' : 'Active',
              location: inspection.fullReportData?.areaDetails || 'N/A',
              lastInspection: lastInspectionDate,
              model: inspection.fullReportData?.equipmentDetails || 'N/A',
            });
          }
        });
        
        const machinesData = Array.from(machineMap.values());
        setMachines(machinesData);
      } catch (error) {
        console.error("Error fetching machines:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch machines. Please try again.",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchMachines();
  }, [user, toast]);

  const filteredMachines = useMemo(() => {
    let result: Machine[] = machines;

    if (statusFilter !== 'All') {
      result = result.filter(m => m.status === statusFilter);
    }

    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(lowercasedTerm) ||
        m.machineId.toLowerCase().includes(lowercasedTerm)
      );
    }

    return result;
  }, [searchTerm, statusFilter]);

  const handleMachineSelect = (machine: Machine) => {
    setSelectedMachine(machine);
    startTransition(async () => {
      try {
        const q = query(collection(db, "inspections"), where("machineSlNo", "==", machine.machineId));
        const inspectionsSnapshot = await getDocs(q);
        const inspections = inspectionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Inspection[];
        setInspectionHistory(inspections.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } catch (error) {
        console.error("Error fetching inspections:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch inspection history.",
        });
      }
    });
  };

  const handleDownloadReport = (inspection: Inspection) => {
    if (inspection.fullReportData) {
      setSelectedReport(inspection.fullReportData);
      setIsReportOpen(true);
    } else {
      toast({
        variant: "secondary",
        title: "No Report Available",
        description: "A detailed PDF report is not available for this inspection.",
      });
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full mb-4" />
              <Skeleton className="h-96 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Machine Search</CardTitle>
            <CardDescription>Find machines by name or ID.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by machine name or ID..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground hidden sm:block"/>
                <Button size="sm" variant={statusFilter === 'All' ? 'default' : 'outline'} onClick={() => setStatusFilter('All')}>All</Button>
                <Button size="sm" variant={statusFilter === 'Active' ? 'default' : 'outline'} onClick={() => setStatusFilter('Active')}>Active</Button>
                <Button size="sm" variant={statusFilter === 'Maintenance' ? 'default' : 'outline'} onClick={() => setStatusFilter('Maintenance')}>Maintenance</Button>
                <Button size="sm" variant={statusFilter === 'Inactive' ? 'default' : 'outline'} onClick={() => setStatusFilter('Inactive')}>Inactive</Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Search Results</CardTitle>
            <CardDescription>{filteredMachines.length} machine(s) found.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[60vh] overflow-y-auto">
            {filteredMachines.length > 0 ? (
              <div className="space-y-2">
                {filteredMachines.map((machine) => {
                  const config = statusConfig[machine.status];
                  return (
                    <button
                      key={machine.id}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border flex items-center justify-between transition-colors",
                        selectedMachine?.id === machine.id ? 'bg-accent ring-2 ring-primary' : 'hover:bg-accent/50'
                      )}
                      onClick={() => handleMachineSelect(machine)}
                    >
                      <div>
                        <p className="font-semibold">{machine.name}</p>
                        <p className="text-sm text-muted-foreground">{machine.machineId}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-12">
                No machines found.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card className="min-h-[85vh]">
          <CardHeader>
            <CardTitle>Inspection Timeline</CardTitle>
            <CardDescription>
              {selectedMachine ? `Showing history for ${selectedMachine.name}` : 'Select a machine to view its inspection history.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isPending ? (
              <div className="flex justify-center items-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : selectedMachine ? (
              inspectionHistory.length > 0 ? (
                <div className="space-y-8">
                  {inspectionHistory.map((inspection) => {
                    const status = inspectionStatusConfig[inspection.status];
                    return (
                       <div key={inspection.id} className="grid items-start grid-cols-[auto_1fr_auto] gap-x-4 relative">
                          <div className="flex h-full flex-col items-center">
                            <div className="w-4 h-4 rounded-full bg-primary ring-4 ring-primary/20 z-10" />
                            <div className="w-0.5 grow bg-border" />
                          </div>
                          <div className="space-y-2 pb-8">
                            <div className="flex items-center gap-2">
                              <Badge variant={status.variant}>{status.label}</Badge>
                              <span className="text-sm text-muted-foreground font-medium">
                                {new Date(inspection.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="font-semibold text-primary-foreground/90">{inspection.notes || 'General Inspection'}</p>
                             <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5" />
                                  <span>{inspection.inspectedBy || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <FileText className="h-3.5 w-3.5" />
                                  <span>Requested By: {inspection.requestedBy}</span>
                                </div>
                                {inspection.machineSlNo && (
                                   <div className="flex items-center gap-1.5">
                                    <Hash className="h-3.5 w-3.5" />
                                    <span>{inspection.machineSlNo}</span>
                                  </div>
                                )}
                            </div>
                          </div>
                          {inspection.status === 'Completed' && (
                             <Button size="sm" variant="outline" onClick={() => handleDownloadReport(inspection)}>
                              <Download className="mr-2 h-4 w-4" />
                              Report
                            </Button>
                          )}
                        </div>
                    )
                  })}
                </div>
              ) : (
                 <div className="text-center py-24 text-muted-foreground">
                  <p>No inspection history found for {selectedMachine.name}.</p>
                </div>
              )
            ) : (
              <div className="text-center py-24 text-muted-foreground">
                <p>Search and select a machine to begin.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {selectedReport && (
         <Suspense fallback={
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="h-12 w-12 text-white animate-spin" />
            </div>
         }>
            <ReportViewDialog
              isOpen={isReportOpen}
              onClose={() => setIsReportOpen(false)}
              reportData={selectedReport}
            />
         </Suspense>
      )}
    </div>
  );
}
