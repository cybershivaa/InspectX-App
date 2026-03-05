"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Inspection, InspectionStatus, Priority } from "@/lib/types";
import { PlusCircle, CheckCircle, AlertCircle, Clock, ListFilter, FilePlus, ClipboardCheck, AlertOctagon, ClipboardList } from 'lucide-react';
import React, { useMemo, useState, lazy, Suspense, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Pie, PieChart, ResponsiveContainer, Tooltip, Legend, Cell } from "recharts";
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from "@/components/ui/chart";
import { useAppContext } from "@/hooks/useAppContext";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

const statusConfig = {
  Completed: { icon: CheckCircle, color: 'text-green-500' },
  Pending: { icon: Clock, color: 'text-yellow-500' },
  Failed: { icon: AlertCircle, color: 'text-red-500' },
  Partial: { icon: AlertCircle, color: 'text-orange-500' },
  Upcoming: { icon: Clock, color: 'text-blue-500' },
};

// Fix: Add 'Critical' to priorityVariant to match Priority type
const priorityVariant = {
  Critical: 'destructive',
  High: 'destructive',
  Medium: 'secondary',
  Low: 'outline',
} as const;

function InspectionCard({ inspection }: { inspection: Inspection }) {
  const { icon: Icon, color } = statusConfig[inspection.status];
  const [previousInspectionDate, setPreviousInspectionDate] = useState<string | null>(null);

  useEffect(() => {
    const fetchPreviousInspection = async () => {
      if (!inspection.machineSlNo) return;
      try {
        const { data, error } = await supabase
          .from('inspections')
          .select('*')
          .eq('machineSlNo', inspection.machineSlNo)
          .eq('status', 'Completed');
        if (error) throw error;
        const previousInspections = (data || [])
          .filter((insp: any) => insp.id !== inspection.id)
          .sort((a: any, b: any) => {
            const dateA = a.completedAt || a.createdAt || '';
            const dateB = b.completedAt || b.createdAt || '';
            return new Date(dateB).getTime() - new Date(dateA).getTime();
          });
        if (previousInspections.length > 0) {
          const prev = previousInspections[0];
          const prevDate = (typeof prev.completedAt === 'string' ? prev.completedAt : undefined)
            || (typeof prev.createdAt === 'string' ? prev.createdAt : undefined);
          if (prevDate) {
            setPreviousInspectionDate(prevDate);
          }
        }
      } catch (error) {
        console.error("Error fetching previous inspection:", error);
      }
    };
    fetchPreviousInspection();
  }, [inspection.machineSlNo, inspection.id]);

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium truncate">{inspection.machineName}</CardTitle>
        <Badge variant={priorityVariant[inspection.priority]}>{inspection.priority}</Badge>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Icon className={`h-4 w-4 ${color}`} />
          <span>{inspection.status}</span>
        </div>
        <p className="text-sm mt-2 text-muted-foreground">Due: {inspection.dueDate}</p>
        <p className="text-sm mt-1 text-muted-foreground truncate">Assigned to: {inspection.assignedTo || 'Unassigned'}</p>
        {previousInspectionDate && (
          <p className="text-xs mt-1 text-muted-foreground italic">
            Previous: {new Date(previousInspectionDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const InspectionChart = ({ chartData, chartConfig }: { chartData: any[], chartConfig: any}) => {
   return (
    <ChartContainer config={chartConfig} className="w-full h-[400px]">
      {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
          <PieChart margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
            <Tooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              labelLine={true}
              label={({
                cx,
                cy,
                midAngle,
                innerRadius,
                outerRadius,
                value,
                index,
              }) => {
                const RADIAN = Math.PI / 180
                const radius = innerRadius + (outerRadius - innerRadius) * 1.5
                const x = cx + radius * Math.cos(-midAngle * RADIAN)
                const y = cy + radius * Math.sin(-midAngle * RADIAN)

                return (
                  <text
                    x={x}
                    y={y}
                    className="fill-foreground text-sm font-semibold"
                    textAnchor={x > cx ? "start" : "end"}
                    dominantBaseline="central"
                  >
                    {chartData[index].name} ({value})
                  </text>
                )
              }}
            >
                {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Legend 
              content={<ChartLegendContent />} 
              wrapperStyle={{ paddingTop: "20px" }}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[400px] text-muted-foreground">
          No data to display
        </div>
      )}
    </ChartContainer>
  );
};


export function DashboardClientPage() {
  const { user, loading: authLoading } = useAppContext();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityCount, setActivityCount] = useState(0);
  
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchInspections = async () => {
      try {
        const { data, error } = await supabase.from('inspections').select('*');
        if (error) throw error;
        // Normalize lowercase Supabase column names → camelCase
        const normalized = ((data as any[]) || []).map((d): Inspection => ({
          ...d,
          machineId:      d.machineId      ?? d.machineid      ?? '',
          machineSlNo:    d.machineSlNo    ?? d.machineslno    ?? '',
          machineName:    d.machineName    ?? d.machinename    ?? '',
          requestedBy:    d.requestedBy    ?? d.requestedby    ?? '',
          assignedTo:     d.assignedTo     ?? d.assignedto     ?? undefined,
          dueDate:        d.dueDate        ?? d.duedate        ?? '',
          requestDate:    d.requestDate    ?? d.requestdate    ?? '',
          createdAt:      d.createdAt      ?? d.createdat      ?? '',
          completedAt:    d.completedAt    ?? d.completedat    ?? undefined,
          inspectedBy:    d.inspectedBy    ?? d.inspectedby    ?? undefined,
          fullReportData: d.fullReportData ?? d.fullreportdata ?? undefined,
        }));
        normalized.sort((a, b) => {
          const dateA = new Date(a.createdAt || '').getTime();
          const dateB = new Date(b.createdAt || '').getTime();
          return dateB - dateA;
        });
        setInspections(normalized);
      } catch (error) {
        console.error("Error loading inspections:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInspections();

    // Real-time subscription — update cards instantly on any INSERT/UPDATE/DELETE
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inspections' }, () => {
        fetchInspections();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, authLoading]);

  // Fetch activity count for Client
  useEffect(() => {
    const fetchActivityCount = async () => {
      if (!user || user.role !== 'Client') return;
      try {
        const { count, error } = await supabase
          .from('activities')
          .select('*', { count: 'exact', head: true })
          .eq('createdBy', user.name);
        if (error) throw error;
        setActivityCount(count || 0);
      } catch (error) {
        console.error("Error loading activity count:", error);
      }
    };
    fetchActivityCount();
  }, [user]);
  
  const [activeTab, setActiveTab] = useState<InspectionStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<Priority[]>(['High', 'Medium', 'Low']);

  const handlePriorityFilterChange = (priority: Priority) => {
    setPriorityFilter(prev => 
      prev.includes(priority) 
        ? prev.filter(p => p !== priority) 
        : [...prev, priority]
    );
  };
  
  const userInspections = useMemo(() => {
    if (!user) return [];
    return user?.role === 'Client' 
      ? inspections.filter(i => i.requestedBy === user.name || i.assignedTo === user.name)
      : user?.role === 'Inspector'
      ? inspections.filter(i => i.assignedTo === user.name)
      : inspections;
  }, [user, inspections]);

  const filteredInspections = useMemo(() => {
    let filtered = userInspections;
    if (activeTab !== 'all') {
      filtered = filtered.filter(i => i.status === activeTab);
    }
    if (priorityFilter.length < 3) {
       filtered = filtered.filter(i => priorityFilter.includes(i.priority));
    }
    return filtered;
  }, [userInspections, activeTab, priorityFilter]);

  const stats = useMemo(() => {
    const data = userInspections; // Use all user inspections for the chart
    return {
      total: data.length,
      completed: data.filter(i => i.status === 'Completed').length,
      pending: data.filter(i => i.status === 'Pending').length,
      upcoming: data.filter(i => i.status === 'Upcoming').length,
      failed: data.filter(i => i.status === 'Failed' || i.status === 'Partial').length,
    }
  }, [userInspections]);
  
  const chartData = useMemo(() => [
    { name: "Completed", value: stats.completed, fill: "hsl(var(--chart-2))" },
    { name: "Pending", value: stats.pending, fill: "hsl(var(--chart-4))" },
    { name: "Upcoming", value: stats.upcoming, fill: "hsl(var(--chart-3))" },
    { name: "Alerts", value: stats.failed, fill: "hsl(var(--chart-5))" },
  ].filter(d => d.value > 0), [stats]);

  const chartConfig = {
    count: {
      label: "Count",
    },
    Completed: {
      label: "Completed",
      color: "hsl(var(--chart-2))",
    },
    Pending: {
      label: "Pending",
      color: "hsl(var(--chart-4))",
    },
    Upcoming: {
      label: "Upcoming",
      color: "hsl(var(--chart-3))",
    },
    Alerts: {
      label: "Alerts",
      color: "hsl(var(--chart-5))",
    },
  }

  const StatCard = ({ title, value, icon: Icon, description, href }: {title: string, value: number, icon: React.ElementType, description: string, href?: string}) => {
    const CardComponent = (
        <Card className={href ? "hover:bg-accent/50 transition-colors" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );

    if (href) {
        return <Link href={href}>{CardComponent}</Link>
    }

    return CardComponent;
  }

  const getTitle = () => {
    switch(user?.role) {
      case 'Client': return 'My Inspections';
      case 'Inspector': return 'My Assigned Inspections';
      default: return 'Total Inspections';
    }
  }

  const allTimeStats = useMemo(() => ({
    total: userInspections.length,
    completed: userInspections.filter(i => i.status === 'Completed').length,
    pending: userInspections.filter(i => i.status === 'Pending').length,
    upcoming: userInspections.filter(i => i.status === 'Upcoming').length,
    failed: userInspections.filter(i => i.status === 'Failed' || i.status === 'Partial').length,
  }), [userInspections]);

  // Notifications for client - newly assigned inspections
  const clientNotifications = useMemo(() => {
    if (user?.role !== 'Client') return [];
    return inspections.filter(i => 
      i.assignedTo === user.name && 
      i.status === 'Pending' &&
      i.requestedBy !== user.name // Not created by the client themselves
    );
  }, [user, inspections]);

  // Notifications for inspector - newly assigned inspections
  const inspectorNotifications = useMemo(() => {
    if (user?.role !== 'Inspector') return [];
    return inspections.filter(i => 
      i.assignedTo === user.name && 
      (i.status === 'Pending' || i.status === 'Upcoming')
    );
  }, [user, inspections]);

  const getChartDescription = () => {
    switch (user?.role) {
      case 'Admin': return 'A summary of all inspections in the system.';
      case 'Inspector': return 'A summary of your assigned inspections.';
      case 'Client': return 'A summary of your requested inspection calls.';
      default: return 'A summary of all inspections.';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }


  return (
    <div className="flex flex-col gap-6 min-h-screen bg-gradient-to-br from-blue-900 to-blue-400 p-6">
      <div className="flex items-center justify-between">
        {user?.role === 'Client' && (
          <Button asChild>
            <Link href="/inspections/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Inspection
            </Link>
          </Button>
        )}
        {user?.role === 'Inspector' && (
          <Button asChild>
            <Link href="/inspections/new">
              <FilePlus className="mr-2 h-4 w-4" />
              Add New Inspection
            </Link>
          </Button>
        )}
      </div>

      {/* Admin Panel Notification */}
      {user?.role === 'Admin' && (
        <Card className="border-purple-500 bg-purple-50 dark:bg-purple-950">
          <CardHeader>
            <CardTitle className="text-purple-900 dark:text-purple-100 flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              Admin Quick Access
            </CardTitle>
            <CardDescription className="text-purple-800 dark:text-purple-200">
              For complete inspection management, user administration, and pending approvals, visit the Admin Panel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="default" size="lg" className="w-full">
              <Link href="/admin">
                <ClipboardList className="mr-2 h-5 w-5" />
                Go to Admin Panel
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Notification Alert for Client - Newly Assigned Inspections */}
      {user?.role === 'Client' && clientNotifications.length > 0 && (
        <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              New Assignments ({clientNotifications.length})
            </CardTitle>
            <CardDescription className="text-blue-800 dark:text-blue-200">
              You have been assigned to complete inspection for the following machines. Click "View Details" to start the inspection form.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {clientNotifications.slice(0, 3).map((inspection) => (
                <div key={inspection.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{inspection.machineName}</p>
                    <p className="text-sm text-muted-foreground">
                      Requested by: {inspection.requestedBy} • Due: {inspection.dueDate}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/inspections">View Details</Link>
                  </Button>
                </div>
              ))}
              {clientNotifications.length > 3 && (
                <Button asChild variant="link" className="w-full">
                  <Link href="/inspections">View all {clientNotifications.length} assignments →</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification Alert for Inspector - Newly Assigned Inspections */}
      {user?.role === 'Inspector' && inspectorNotifications.length > 0 && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="text-green-900 dark:text-green-100 flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              Assigned Inspections ({inspectorNotifications.length})
            </CardTitle>
            <CardDescription className="text-green-800 dark:text-green-200">
              You have been assigned to perform inspections. Click "Start Inspection" to begin the inspection process.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inspectorNotifications.slice(0, 3).map((inspection) => (
                <div key={inspection.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{inspection.machineName}</p>
                    <p className="text-sm text-muted-foreground">
                      Requested by: {inspection.requestedBy} • Due: {inspection.dueDate} • Status: {inspection.status}
                    </p>
                  </div>
                  <Button asChild size="sm">
                    <Link href={`/inspections/report?inspectionId=${inspection.id}`}>Start Inspection</Link>
                  </Button>
                </div>
              ))}
              {inspectorNotifications.length > 3 && (
                <Button asChild variant="link" className="w-full">
                  <Link href="/inspections">View all {inspectorNotifications.length} assignments →</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title={getTitle()} value={allTimeStats.total} icon={ClipboardCheck} description={user?.role === 'Client' ? "All inspection calls you raised" : "All time inspection calls"} />
        <StatCard title="Completed" value={allTimeStats.completed} icon={CheckCircle} description="Successfully passed inspections" />
        <StatCard title="Pending" value={allTimeStats.pending} icon={Clock} description="Awaiting inspector action" href="/inspections?status=Pending" />
        {user?.role === 'Client' ? (
          <StatCard title="Activity" value={activityCount} icon={ClipboardList} description="Manage your notes & documents" href="/activity" />
        ) : (
          <StatCard title="Alerts" value={allTimeStats.failed} icon={AlertOctagon} description="Failed or partial inspections" />
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
              <CardTitle>{user?.role === 'Client' ? "My Recent Calls" : "Recent Inspections"}</CardTitle>
              <CardDescription>Overview of all inspection activities.</CardDescription>
          </CardHeader>
          <CardContent>
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
              <div className="flex items-center justify-between mb-4">
                  <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="Pending">Pending</TabsTrigger>
                  <TabsTrigger value="Completed">Completed</TabsTrigger>
                  <TabsTrigger value="Upcoming">Upcoming</TabsTrigger>
                  </TabsList>
                  <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="ml-auto flex h-8 gap-1">
                      <ListFilter className="h-3.5 w-3.5" />
                      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Filter</span>
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                      <DropdownMenuLabel>Filter by priority</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuCheckboxItem 
                        checked={priorityFilter.includes('High')}
                        onCheckedChange={() => handlePriorityFilterChange('High')}
                      >
                        High
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={priorityFilter.includes('Medium')}
                        onCheckedChange={() => handlePriorityFilterChange('Medium')}
                      >
                        Medium
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={priorityFilter.includes('Low')}
                        onCheckedChange={() => handlePriorityFilterChange('Low')}
                      >
                        Low
                      </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                  </DropdownMenu>
              </div>
              <TabsContent value={activeTab}>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredInspections.length > 0 ? filteredInspections.map(inspection => (
                      <InspectionCard key={inspection.id} inspection={inspection} />
                  )) : (
                      <p className="text-muted-foreground col-span-full text-center py-12">No inspections found for this category.</p>
                  )}
                  </div>
              </TabsContent>
              </Tabs>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Inspection Status Overview</CardTitle>
            <CardDescription>{getChartDescription()}</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
             <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
                <InspectionChart chartData={chartData} chartConfig={chartConfig} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
