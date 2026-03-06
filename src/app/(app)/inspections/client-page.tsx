
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
import { supabase } from '@/lib/supabase';
import { getUsers } from '@/app/actions/data';
import { assignInspection, updateInspection } from '@/app/actions/inspections';
// All Firebase Firestore logic replaced with Supabase below
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
// All Firestore doc/updateDoc/getDoc logic replaced with Supabase below
import ReportViewDialog from '@/app/(app)/search/report-view-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusConfig = {
  Completed: { icon: CheckCircle, color: 'text-green-500', variant: 'default' },
  Pending: { icon: Clock, color: 'text-yellow-500', variant: 'secondary' },
  Failed: { icon: AlertCircle, color: 'text-red-500', variant: 'destructive' },
  Partial: { icon: AlertCircle, color: 'text-orange-500', variant: 'destructive' },
  Upcoming: { icon: Clock, color: 'text-blue-500', variant: 'secondary' },
} as const;

const priorityConfig = {
  Critical: { variant: 'destructive' as const, icon: '🔴', sortOrder: 4 },
  High: { variant: 'destructive' as const, icon: '🟠', sortOrder: 3 },
  Medium: { variant: 'secondary' as const, icon: '🟡', sortOrder: 2 },
  Low: { variant: 'outline' as const, icon: '🟢', sortOrder: 1 },
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
        // Run both fetches in parallel to cut load time in half
        const [{ data: inspData, error: inspError }, usersData] = await Promise.all([
          supabase.from('inspections').select('*'),
          getUsers(),
        ]);
        if (inspError) throw inspError;

        // If server action returned empty, try client-side fetch for users
        let finalUsersData = usersData;
        if (finalUsersData.length === 0) {
          const { data: clientUsers } = await supabase.from('users').select('*');
          if (clientUsers && clientUsers.length > 0) finalUsersData = clientUsers as User[];
        }

        // Normalize column names (support both camelCase Firestore style and lowercase Supabase style)
        const normalized = (inspData || []).map((d: any): Inspection => ({
          ...d,
          machineId: d.machineId ?? d.machineid ?? '',
          machineSlNo: d.machineSlNo ?? d.machineslno ?? '',
          machineName: d.machineName ?? d.machinename ?? '',
          requestedBy: d.requestedBy ?? d.requestedby ?? '',
          assignedTo: d.assignedTo ?? d.assignedto ?? undefined,
          dueDate: d.dueDate ?? d.duedate ?? '',
          requestDate: d.requestDate ?? d.requestdate ?? '',
          createdAt: d.createdAt ?? d.createdat ?? '',
          completedAt: d.completedAt ?? d.completedat ?? undefined,
          inspectedBy: d.inspectedBy ?? d.inspectedby ?? undefined,
          fullReportData: d.fullReportData ?? d.fullreportdata ?? undefined,
        }));
        setInspections(normalized);

        const assignableUsers = finalUsersData.filter((u: User) => u.role === 'Inspector' || u.role === 'Client');
        setInspectors(assignableUsers);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Real-time subscription for live updates
    const channel = supabase
      .channel('inspections-page-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inspections' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
    
    // Sort by priority (Critical/High first) then by creation date
    return filtered.sort((a, b) => {
      const priorityA = priorityConfig[a.priority as keyof typeof priorityConfig]?.sortOrder || 0;
      const priorityB = priorityConfig[b.priority as keyof typeof priorityConfig]?.sortOrder || 0;
      
      if (priorityB !== priorityA) {
        return priorityB - priorityA; // Higher priority first
      }
      
      // If same priority, sort by creation date (newest first)
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  };

  const displayedInspections = getDisplayedInspections();
  
  const handleAssign = (inspectionId: string, inspectorId: string, inspectorName: string) => {
    startTransition(async () => {
      const result = await assignInspection(inspectionId, inspectorName);
      if (result.success) {
        setInspections(prev => prev.map(i =>
          i.id === inspectionId ? { ...i, assignedTo: inspectorName, status: 'Pending' as const } : i
        ));
        toast({ title: "Inspection Assigned", description: `Assigned to ${inspectorName}.` });
      } else {
        console.error("Failed to assign inspection:", result.error);
        toast({ variant: 'destructive', title: "Assignment Failed", description: result.error || "An unexpected error occurred." });
      }
    });
  }
  
  const handleTakeInspection = (inspectionId: string) => {
    handleAssign(inspectionId, user.id, user.name);
  }
  
  const handleStatusUpdate = async (inspectionId: string, status: Inspection['status']) => {
    startTransition(async () => {
      const result = await updateInspection({ id: inspectionId, status });
      if (result.success) {
        setInspections(prev => prev.map(i =>
          i.id === inspectionId ? { ...i, status } : i
        ));
        toast({ title: "Inspection Updated", description: `Status changed to ${status}.` });
      } else {
        console.error("Failed to update inspection:", result.error);
        toast({ variant: 'destructive', title: "Update Failed", description: result.error || "An unexpected error occurred." });
      }
    });
  }

  const handleDownloadReport = (inspectionId: string) => {
    const inspection = inspections.find(i => i.id === inspectionId);
    if (inspection?.fullReportData) {
      setSelectedReport(inspection.fullReportData);
      setIsReportOpen(true);
    } else {
       toast({
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
        title: "No Report Available",
        description: "A detailed report is not available for this inspection.",
      });
    }
  };

  const handleStartInspection = (inspectionId: string) => {
    router.push(`/inspections/report?inspectionId=${inspectionId}`);
  };

  const renderInspectionActions = (inspection: Inspection) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" disabled={isPending} className="h-8 w-8">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.role === 'Admin' && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <UserIcon className="mr-2 h-4 w-4" />
              {inspection.assignedTo ? 'Reassign User' : 'Assign User'}
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
        {user.role === 'Admin' && inspection.assignedTo && inspection.status !== 'Completed' && (
          <DropdownMenuItem onClick={() => handleStartInspection(inspection.id)}>
            <Play className="mr-2 h-4 w-4" />
            Start Inspection
          </DropdownMenuItem>
        )}
        {user.role === 'Inspector' && !inspection.assignedTo && (
          <DropdownMenuItem onClick={() => handleTakeInspection(inspection.id)}>
            <UserIcon className="mr-2 h-4 w-4" />
            Take Inspection
          </DropdownMenuItem>
        )}
        {user.role === 'Inspector' && inspection.assignedTo === user.name && ['Pending', 'Upcoming'].includes(inspection.status) && (
          <DropdownMenuItem onClick={() => handleStartInspection(inspection.id)}>
            <Play className="mr-2 h-4 w-4" />
            Start / Complete Inspection
          </DropdownMenuItem>
        )}
        {inspection.status === 'Completed' && (
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
        {user.role === 'Admin' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Update Status</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {(Object.keys(statusConfig) as (keyof typeof statusConfig)[]).map(s => {
                  const sc = statusConfig[s];
                  return (
                    <DropdownMenuItem key={s} onClick={() => handleStatusUpdate(inspection.id, s)}>
                      <sc.icon className={`mr-2 h-4 w-4 ${sc.color}`} />
                      {s}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const getTitle = () => {
    switch (user.role) {
      case 'Admin': return "All Inspection Calls";
      case 'Client': return "My Raised Calls";
      case 'Inspector': return "Assigned Inspections";
      default: return "Inspections";
    }
  }

  const getDescription = () => {
     switch (user.role) {
      case 'Admin': return "Track and manage all inspection calls across the system.";
      case 'Client': return "View and track all inspection calls you have raised.";
      case 'Inspector': return "Complete your assigned inspections and submit reports.";
      default: return "";
    }
  }

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg sm:text-xl">{getTitle()}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">{getDescription()}</CardDescription>
          </div>
          {user?.role === 'Client' && (
            <Button asChild size="sm" className="w-full sm:w-auto">
              <a href="/inspections/new">
                <FilePlus className="mr-2 h-4 w-4" />
                Raise Inspection Call
              </a>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="mb-4">
            <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="Pending">Pending</TabsTrigger>
                <TabsTrigger value="Completed">Done</TabsTrigger>
                <TabsTrigger value="Upcoming">Upcoming</TabsTrigger>
            </TabsList>
        </Tabs>
        <div className="table-responsive hidden sm:block">
        <Table className="min-w-[700px]">
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
                      {(['Client', 'Inspector'] as string[]).includes(user.role) && inspection.assignedTo === user.name && (
                        <Badge variant="secondary" className="ml-2">Assigned to You</Badge>
                      )}
                    </TableCell>
                    <TableCell>{inspection.requestedBy}</TableCell>
                    <TableCell>{inspection.assignedTo || <Badge variant="outline">Unassigned</Badge>}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={priorityConfig[inspection.priority as keyof typeof priorityConfig]?.variant || 'outline'}
                        className="font-semibold"
                      >
                        {priorityConfig[inspection.priority as keyof typeof priorityConfig]?.icon} {inspection.priority}
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
                       {renderInspectionActions(inspection)}
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
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden space-y-3">
          {displayedInspections.length > 0 ? (
            displayedInspections.map((inspection: Inspection) => {
              const config = statusConfig[inspection.status];
              return (
                <div key={inspection.id} className="border rounded-xl p-4 space-y-3 bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{inspection.machineName}</p>
                      {(['Client', 'Inspector'] as string[]).includes(user.role) && inspection.assignedTo === user.name && (
                        <Badge variant="secondary" className="mt-1 text-[10px]">Assigned to You</Badge>
                      )}
                    </div>
                    {renderInspectionActions(inspection)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Requested:</span>
                      <p className="font-medium truncate">{inspection.requestedBy}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Assigned:</span>
                      <p className="font-medium truncate">{inspection.assignedTo || 'Unassigned'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Due:</span>
                      <p className="font-medium">{inspection.dueDate || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Priority:</span>
                      <Badge 
                        variant={priorityConfig[inspection.priority as keyof typeof priorityConfig]?.variant || 'outline'}
                        className="font-semibold text-[10px] mt-0.5"
                      >
                        {priorityConfig[inspection.priority as keyof typeof priorityConfig]?.icon} {inspection.priority}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t">
                    <config.icon className={`h-3.5 w-3.5 ${config.color}`} />
                    <span className="text-xs font-medium">{inspection.status}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {user.role === 'Client' ? "You have not raised any inspection calls." : user.role === 'Inspector' ? "You have no assigned inspections." : "No inspection calls found."}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
      {selectedReport && (
        <ReportViewDialog
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          reportData={selectedReport as any}
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
