
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
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";

const statusConfig = {
  Completed: { icon: CheckCircle, color: 'text-green-500' },
  Pending: { icon: Clock, color: 'text-yellow-500' },
  Failed: { icon: AlertCircle, color: 'text-red-500' },
  Partial: { icon: AlertCircle, color: 'text-orange-500' },
  Upcoming: { icon: Clock, color: 'text-blue-500' },
};

const priorityVariant = {
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
        const q = query(
          collection(db, "inspections"),
          where("machineSlNo", "==", inspection.machineSlNo),
          where("status", "==", "Completed")
        );
        const snapshot = await getDocs(q);
        
        const previousInspections = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter((insp: any) => insp.id !== inspection.id)
          .sort((a: any, b: any) => {
            const dateA = a.completedAt || a.createdAt || '';
            const dateB = b.completedAt || b.createdAt || '';
            return new Date(dateB).getTime() - new Date(dateA).getTime();
          });
        
        if (previousInspections.length > 0) {
          const prevDate = previousInspections[0].completedAt || previousInspections[0].createdAt;
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
    <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
      {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Tooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              labelLine={false}
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
                const radius = 0 + innerRadius + (outerRadius - innerRadius)
                const x = cx + radius * Math.cos(-midAngle * RADIAN)
                const y = cy + radius * Math.sin(-midAngle * RADIAN)

                return (
                  <text
                    x={x}
                    y={y}
                    className="fill-muted-foreground text-xs"
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
            <Legend content={<ChartLegendContent />} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[250px] text-muted-foreground">
          No data to display
        </div>
      )}
    </ChartContainer>
  );
};


export function DashboardClientPage() {
  const { user } = useAppContext();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityCount, setActivityCount] = useState(0);
  
  useEffect(() => {
    const fetchInspections = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const inspectionsQuery = query(collection(db, "inspections"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(inspectionsQuery);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Inspection[];
        setInspections(data);
      } catch (error: any) {
        console.error("Error loading inspections:", error);
        if (error.code === 'permission-denied') {
          console.error("Permission denied. User may not be authenticated properly.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchInspections();
  }, [user]);

  // Fetch activity count for Client
  useEffect(() => {
    const fetchActivityCount = async () => {
      if (!user || user.role !== 'Client') return;
      
      try {
        const q = query(
          collection(db, "activities"),
          where("createdBy", "==", user.name)
        );
        const snapshot = await getDocs(q);
        setActivityCount(snapshot.size);
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
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
          <CardContent>
             <Suspense fallback={<Skeleton className="h-[250px] w-full" />}>
                <InspectionChart chartData={chartData} chartConfig={chartConfig} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
