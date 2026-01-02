
"use client";

import React, { useState, useTransition, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppContext } from '@/hooks/useAppContext';
import type { Inspection, User, InspectionStatus } from '@/lib/types';
import { Download, CheckCircle, Clock, AlertCircle, Play, MoreHorizontal, User as UserIcon, Loader2, FileSearch, ListFilter, Check, FilePlus } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import ReportViewDialog from '@/app/(app)/search/report-view-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusConfig = {
  Completed: { icon: CheckCircle, color: 'text-green-500', variant: 'default' },
  Pending: { icon: Clock, color: 'text-yellow-500', variant: 'secondary' },
  Failed: { icon: AlertCircle, color: 'text-red-500', variant: 'destructive' },
  Partial: { icon: AlertCircle, color: 'text-orange-500', variant: 'destructive' },
  Upcoming: { icon: Clock, color: 'text-blue-500', variant: 'secondary' },
} as const;


function InspectionsClientPageComponent() {
  const { user } = useAppContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [inspectors, setInspectors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Inspection['fullReportData'] | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const inspectionsQuery = query(collection(db, "inspections"), orderBy("createdAt", "desc"));
        const inspectionsSnapshot = await getDocs(inspectionsQuery);
        const inspectionsData = inspectionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Inspection[];
        setInspections(inspectionsData);
        
        // Fetch all users (Inspectors and Clients) for assignment
        const usersQuery = collection(db, "users");
        const usersSnapshot = await getDocs(usersQuery);
        const usersData = usersSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as User[];
        // Filter to only Inspectors and Clients
        const assignableUsers = usersData.filter(u => u.role === 'Inspector' || u.role === 'Client');
        setInspectors(assignableUsers);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);
  
  const initialStatus = searchParams.get('status');
  const [activeTab, setActiveTab] = useState<InspectionStatus | 'all'>(
    initialStatus && ['Pending', 'Completed', 'Upcoming'].includes(initialStatus) ? initialStatus as InspectionStatus : 'all'
  );


  useEffect(() => {
    const status = searchParams.get('status');
    if (status && ['Pending', 'Completed', 'Upcoming', 'all'].includes(status)) {
      setActiveTab(status as InspectionStatus | 'all');
    }
  }, [searchParams]);
  
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!user || !['Admin', 'Client', 'Inspector'].includes(user.role)) {
    return (
       <Card>
        <CardHeader>
          <CardTitle>Unauthorized</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-12">You are not authorized to view this page.</p>
        </CardContent>
      </Card>
    );
  }

  const getDisplayedInspections = () => {
    let filtered = inspections;
    
    switch (user.role) {
      case 'Admin':
        // No filter
        break;
      case 'Client':
        // Show inspections requested by client OR assigned to client
        filtered = filtered.filter(i => i.requestedBy === user.name || i.assignedTo === user.name);
        break;
      case 'Inspector':
        filtered = filtered.filter(i => i.assignedTo === user.name);
        break;
      default:
        return [];
    }

    if (activeTab !== 'all') {
      filtered = filtered.filter(i => i.status === activeTab);
    }
    
    return filtered;
  };

  const displayedInspections = getDisplayedInspections();
  
  const handleAssign = (inspectionId: string, inspectorId: string, inspectorName: string) => {
    startTransition(async () => {
        try {
            const inspectionRef = doc(db, "inspections", inspectionId);
            await updateDoc(inspectionRef, { 
                assignedTo: inspectorName,
                status: "Pending" as const,
            });
            
            const updatedDoc = await getDoc(inspectionRef);
            if (updatedDoc.exists()) {
                const updatedInspection = { id: updatedDoc.id, ...updatedDoc.data() } as Inspection;
                setInspections(prev => prev.map(i => i.id === inspectionId ? updatedInspection : i));
                toast({ title: "Inspection Assigned", description: `Assigned to ${inspectorName}.` });
            }
        } catch (error) {
            console.error("Failed to assign inspection:", error);
            toast({ variant: 'destructive', title: "Assignment Failed", description: "An unexpected error occurred." });
        }
    });
  }
  
  const handleTakeInspection = (inspectionId: string) => {
    handleAssign(inspectionId, user.id, user.name);
  }
  
  const handleStatusUpdate = async (inspectionId: string, status: Inspection['status']) => {
    startTransition(async () => {
      try {
        const inspectionRef = doc(db, "inspections", inspectionId);
        await updateDoc(inspectionRef, { status });
        
        setInspections(prev => prev.map(i => 
          i.id === inspectionId ? { ...i, status } : i
        ));
        toast({ title: "Inspection Updated", description: `Status changed to ${status}.` });
      } catch (error) {
        console.error("Failed to update inspection:", error);
        toast({ variant: 'destructive', title: "Update Failed", description: "An unexpected error occurred." });
      }
    })
  }

  const handleDownloadReport = (inspectionId: string) => {
    const inspection = inspections.find(i => i.id === inspectionId);
    if (inspection?.fullReportData) {
      setSelectedReport(inspection.fullReportData);
      setIsReportOpen(true);
    } else {
       toast({
        variant: "secondary",
        title: "No Report Available",
        description: "A detailed PDF report is not available for this inspection.",
      });
    }
  };

  const handleViewReport = (inspectionId: string) => {
    const inspection = inspections.find(i => i.id === inspectionId);
    if (inspection?.fullReportData) {
      setSelectedReport(inspection.fullReportData);
      setIsReportOpen(true);
    } else {
      toast({
        variant: "secondary",
        title: "No Report Available",
        description: "A detailed report is not available for this inspection.",
      });
    }
  };

  const handleStartInspection = (inspectionId: string) => {
    router.push(`/inspections/report?inspectionId=${inspectionId}`);
  };

  const getTitle = () => {
    switch (user.role) {
      case 'Admin': return "All Inspection Calls";
      case 'Client': return "My Inspection Calls";
      case 'Inspector': return "My Assigned Inspections";
      default: return "Inspections";
    }
  }

  const getDescription = () => {
     switch (user.role) {
      case 'Admin': return "Track and manage all inspection calls across the system.";
      case 'Client': return "Track the progress and reports of your raised inspection calls.";
      case 'Inspector': return "Manage your assigned inspections and file reports.";
      default: return "";
    }
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{getTitle()}</CardTitle>
            <CardDescription>{getDescription()}</CardDescription>
          </div>
          {user?.role === 'Client' && (
            <Button asChild>
              <a href="/inspections/new">
                <FilePlus className="mr-2 h-4 w-4" />
                Add New Inspection
              </a>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="mb-4">
            <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="Pending">Pending</TabsTrigger>
                <TabsTrigger value="Completed">Completed</TabsTrigger>
                <TabsTrigger value="Upcoming">Upcoming</TabsTrigger>
            </TabsList>
        </Tabs>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Machine</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedInspections.length > 0 ? (
              displayedInspections.map((inspection: Inspection) => {
                const config = statusConfig[inspection.status];
                return (
                  <TableRow key={inspection.id}>
                    <TableCell className="font-medium">
                      {inspection.machineName}
                      {user.role === 'Client' && inspection.assignedTo === user.name && (
                        <Badge variant="secondary" className="ml-2">Assigned to You</Badge>
                      )}
                    </TableCell>
                    <TableCell>{inspection.requestedBy}</TableCell>
                    <TableCell>{inspection.assignedTo || <Badge variant="outline">Unassigned</Badge>}</TableCell>
                    <TableCell>
                      <Badge variant={inspection.priority === 'High' ? 'destructive' : inspection.priority === 'Medium' ? 'secondary' : 'outline'}>
                        {inspection.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <config.icon className={`h-4 w-4 ${config.color}`} />
                        <span>{inspection.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>{inspection.dueDate}</TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" disabled={isPending}>
                              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {user.role === 'Admin' && !inspection.assignedTo && (
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <UserIcon className="mr-2 h-4 w-4" />
                                  Assign User
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  {inspectors.length > 0 ? (
                                    inspectors.map(inspector => (
                                      <DropdownMenuItem key={inspector.id} onClick={() => handleAssign(inspection.id, inspector.id, inspector.name)}>
                                        {inspector.name} <Badge variant="outline" className="ml-2">{inspector.role}</Badge>
                                      </DropdownMenuItem>
                                    ))
                                  ) : (
                                    <DropdownMenuItem disabled>No users available</DropdownMenuItem>
                                  )}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                            )}

                            {user.role === 'Inspector' && ['Pending', 'Upcoming'].includes(inspection.status) && (
                              <DropdownMenuItem onClick={() => handleStartInspection(inspection.id)}>
                                <Play className="mr-2 h-4 w-4" />
                                {inspection.assignedTo === user.name ? 'Start Inspection' : 'Start Self-Inspection'}
                              </DropdownMenuItem>
                            )}

                            {user.role === 'Inspector' && !inspection.assignedTo && (
                              <DropdownMenuItem onClick={() => handleTakeInspection(inspection.id)}>
                                <UserIcon className="mr-2 h-4 w-4" />
                                Take Inspection
                              </DropdownMenuItem>
                            )}
                            
                            {inspection.status === 'Completed' && (user.role === 'Admin' || user.role === 'Client') && (
                              <>
                                <DropdownMenuItem onClick={() => handleViewReport(inspection.id)}>
                                  <FileSearch className="mr-2 h-4 w-4" />
                                  View Report
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownloadReport(inspection.id)}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Download PDF
                                </DropdownMenuItem>
                              </>
                            )}

                            {inspection.status === 'Completed' && user.role === 'Client' && (
                              <DropdownMenuItem onClick={() => handleDownloadReport(inspection.id)}>
                                <Download className="mr-2 h-4 w-4" />
                                Download Report
                              </DropdownMenuItem>
                            )}

                             {inspection.status === 'Completed' && user.role === 'Inspector' && (
                              <DropdownMenuItem onClick={() => handleDownloadReport(inspection.id)}>
                                <Download className="mr-2 h-4 w-4" />
                                Download Report
                              </DropdownMenuItem>
                            )}

                             {user.role === 'Admin' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>Update Status</DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                       {(Object.keys(statusConfig) as (keyof typeof statusConfig)[]).map(status => (
                                        <DropdownMenuItem key={status} onClick={() => handleStatusUpdate(inspection.id, status)}>
                                          {status}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuSubContent>
                                  </DropdownMenuSub>
                                </>
                             )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">
                  {user.role === 'Client' ? "You have not raised any inspection calls." : user.role === 'Inspector' ? "You have no assigned inspections." : "No inspection calls found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
      {selectedReport && (
        <ReportViewDialog
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          reportData={selectedReport}
        />
      )}
    </>
  );
}

export function InspectionsClientPage() {
    return (
        <Suspense fallback={<div>Loading filters...</div>}>
            <InspectionsClientPageComponent />
        </Suspense>
    )
}
