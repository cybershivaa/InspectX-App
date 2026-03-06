
"use client";

import React, { useMemo, useState, lazy, Suspense, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Inspection, InspectionStatus } from "@/lib/types";
import type { InspectionReportFormValues } from '../inspections/report/page';
import {
  Search, Download, FileText, User, Calendar, Loader2,
  Clock, ClipboardCheck, AlertCircle, CheckCircle, ClipboardList,
  MapPin, Tag, UserCheck, CalendarCheck, AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/hooks/useAppContext';
import { Separator } from '@/components/ui/separator';

const ReportViewDialog = lazy(() => import('./report-view-dialog'));

const statusConfig: Record<InspectionStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType; color: string }> = {
  Completed:  { variant: 'default',     icon: CheckCircle,    color: 'text-emerald-600' },
  Pending:    { variant: 'secondary',   icon: Clock,          color: 'text-amber-600'  },
  Failed:     { variant: 'destructive', icon: AlertCircle,    color: 'text-red-600'    },
  Partial:    { variant: 'destructive', icon: AlertTriangle,  color: 'text-orange-600' },
  Upcoming:   { variant: 'outline',     icon: Calendar,       color: 'text-blue-600'   },
};

const priorityColor: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700 border-red-200',
  High:     'bg-orange-100 text-orange-700 border-orange-200',
  Medium:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low:      'bg-green-100 text-green-700 border-green-200',
};

function fmt(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch { return dateStr; }
}

function fmtDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return dateStr; }
}

export default function SearchPage() {
  const { user } = useAppContext();
  const [allInspections, setAllInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [clickedMachine, setClickedMachine] = useState<string | null>(null);
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<Inspection['fullReportData'] | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  useEffect(() => {
    const fetchInspections = async () => {
      if (!user) { setLoading(false); return; }
      try {
        const { data, error } = await supabase.from('inspections').select('*');
        if (error) throw error;
        const normalized = (data || []).map((d: any): Inspection => ({
          ...d,
          machineId:   d.machineId   ?? d.machineid   ?? '',
          machineName: d.machineName ?? d.machinename ?? '',
          requestedBy: d.requestedBy ?? d.requestedby ?? '',
          assignedTo:  d.assignedTo  ?? d.assignedto  ?? undefined,
          dueDate:     d.dueDate     ?? d.duedate     ?? '',
          requestDate: d.requestDate ?? d.requestdate ?? '',
          createdAt:   d.createdAt   ?? d.createdat   ?? '',
          completedAt: d.completedAt ?? d.completedat ?? undefined,
          completedBy: d.completedBy ?? d.completedby ?? undefined,
          inspectedBy: d.inspectedBy ?? d.inspectedby ?? undefined,
          machineSlNo: d.machineSlNo ?? d.machineslno ?? undefined,
        }));
        setAllInspections(normalized);
      } catch (err) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch inspection data.' });
      } finally {
        setLoading(false);
      }
    };
    fetchInspections();
  }, [user, toast]);

  // Unique machine list derived from all inspections
  const machineList = useMemo(() => {
    const seen = new Map<string, { name: string; slNo: string; count: number }>();
    allInspections.forEach(i => {
      const key = (i.machineName || '').toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, { name: i.machineName, slNo: i.machineSlNo || i.machineId || '', count: 1 });
      } else {
        seen.get(key)!.count++;
      }
    });
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allInspections]);

  // Filtered machines from search term
  const filteredMachines = useMemo(() => {
    if (!searchTerm.trim()) return machineList;
    const term = searchTerm.toLowerCase();
    return machineList.filter(m =>
      m.name.toLowerCase().includes(term) || m.slNo.toLowerCase().includes(term)
    );
  }, [machineList, searchTerm]);

  // Auto-select first matching machine name as user types
  const autoMachineName = useMemo(() => {
    if (!searchTerm.trim() || filteredMachines.length === 0) return null;
    return filteredMachines[0].name;
  }, [filteredMachines, searchTerm]);

  // Resolve which machine name to display
  const displayMachineName = clickedMachine || autoMachineName;

  // Reset clicked when search term changes
  useEffect(() => { setClickedMachine(null); }, [searchTerm]);

  // Get inspections for the displayed machine (instant, client-side)
  const displayRecords = useMemo(() => {
    if (!displayMachineName) return [];
    return allInspections
      .filter(i => (i.machineName || '').toLowerCase() === displayMachineName.toLowerCase())
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [allInspections, displayMachineName]);

  const handleDownloadReport = (inspection: Inspection) => {
    if (inspection.fullReportData) {
      setSelectedReport(inspection.fullReportData);
      setIsReportOpen(true);
    } else {
      toast({ title: 'No Report Available', description: 'A detailed report is not available for this inspection.' });
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
        <div className="lg:col-span-2">
          <Skeleton className="h-[80vh] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT PANEL */}
      <div className="lg:col-span-1 space-y-4">
        {/* Search box */}
        <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
          <CardHeader className="pb-2 pt-5 px-5">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4 text-indigo-500" /> Machine Search
            </CardTitle>
            <CardDescription className="text-xs">Type a machine name to instantly see all its inspection records.</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search machine name or serial no..."
                className="pl-10 rounded-xl border-gray-200 focus:border-indigo-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </CardContent>
        </Card>

        {/* Machine list */}
        {searchTerm.trim() && (
          <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-indigo-400 to-purple-500" />
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm text-gray-600">
                {filteredMachines.length} machine{filteredMachines.length !== 1 ? 's' : ''} found
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-4 max-h-[50vh] overflow-y-auto space-y-1">
              {filteredMachines.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No machines match your search.</p>
              ) : (
                filteredMachines.map((m) => {
                  const isActive = (clickedMachine || filteredMachines[0]?.name) === m.name;
                  return (
                    <button
                      key={m.name}
                      onClick={() => setClickedMachine(m.name)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-all duration-150 ${
                        isActive
                          ? 'bg-indigo-50 border border-indigo-200 shadow-sm'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-sm text-gray-800">{m.name}</p>
                        {m.slNo && <p className="text-xs text-gray-400 font-mono">{m.slNo}</p>}
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0 ml-2">{m.count}</Badge>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        )}

        {/* Summary stats */}
        {displayMachineName && displayRecords.length > 0 && (
          <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
            <CardContent className="px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Summary</p>
              <div className="grid grid-cols-2 gap-2">
                {(['Completed', 'Pending', 'Failed', 'Upcoming'] as InspectionStatus[]).map(status => {
                  const count = displayRecords.filter(i => i.status === status).length;
                  const cfg = statusConfig[status];
                  return (
                    <div key={status} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <cfg.icon className={`h-4 w-4 ${cfg.color}`} />
                      <div>
                        <p className="text-base font-bold text-gray-800 leading-none">{count}</p>
                        <p className="text-xs text-gray-400">{status}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* RIGHT PANEL — Inspection Records */}
      <div className="lg:col-span-2">
        <Card className="border-0 shadow-md rounded-2xl overflow-hidden min-h-[80vh]">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          <CardHeader className="px-4 sm:px-6 pt-5 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg text-gray-800">
                  {displayMachineName ? (
                    <>Inspection Records — <span className="text-indigo-600">{displayMachineName}</span></>
                  ) : 'Inspection Records'}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {displayMachineName
                    ? `${displayRecords.length} inspection${displayRecords.length !== 1 ? 's' : ''} found`
                    : 'Type a machine name in the search box to instantly view its inspection history.'}
                </CardDescription>
              </div>
              {displayRecords.length > 0 && (
                <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50">
                  <ClipboardList className="h-3 w-3 mr-1" />
                  {displayRecords.length} total
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="px-4 sm:px-6 pb-6">
            {!displayMachineName ? (
              <div className="flex flex-col items-center justify-center py-16 sm:py-32 text-gray-400">
                <Search className="h-10 w-10 sm:h-14 sm:w-14 mb-4 opacity-20" />
                <p className="text-lg font-medium">Search for a machine</p>
                <p className="text-sm mt-1 opacity-70">Inspection records will appear instantly as you type.</p>
              </div>
            ) : displayRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                <ClipboardList className="h-14 w-14 mb-4 opacity-20" />
                <p className="text-lg font-medium">No inspections found</p>
                <p className="text-sm mt-1 opacity-70">No inspection records exist for {displayMachineName}.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayRecords.map((insp, idx) => {
                  const scfg = statusConfig[insp.status] || statusConfig['Pending'];
                  const StatusIcon = scfg.icon;
                  const accentColor =
                    insp.status === 'Completed' ? 'bg-emerald-400' :
                    insp.status === 'Pending'   ? 'bg-amber-400'   :
                    insp.status === 'Failed'    ? 'bg-red-400'     :
                    insp.status === 'Partial'   ? 'bg-orange-400'  :
                    'bg-blue-400';

                  return (
                    <div key={insp.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
                      <div className={`h-0.5 w-full ${accentColor}`} />
                      <div className="p-3 sm:p-5">
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={scfg.variant} className="flex items-center gap-1 text-xs">
                              <StatusIcon className="h-3 w-3" />
                              {insp.status}
                            </Badge>
                            {insp.priority && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${priorityColor[insp.priority] || 'bg-gray-100 text-gray-600'}`}>
                                {insp.priority}
                              </span>
                            )}
                            <span className="text-xs text-gray-400 font-medium">#{idx + 1}</span>
                          </div>
                          {insp.status === 'Completed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 text-xs h-7 px-3 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                              onClick={() => handleDownloadReport(insp)}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Report
                            </Button>
                          )}
                        </div>

                        {/* Machine name + serial */}
                        <div className="flex items-center gap-2 mb-3">
                          <ClipboardCheck className="h-4 w-4 text-indigo-400 shrink-0" />
                          <span className="font-semibold text-gray-800">{insp.machineName}</span>
                          {insp.machineSlNo && (
                            <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded-full">
                              {insp.machineSlNo}
                            </span>
                          )}
                        </div>

                        <Separator className="mb-3" />

                        {/* Detail grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                          <div className="flex items-start gap-2">
                            <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs text-gray-400 leading-none mb-0.5">Inspection Date & Time</p>
                              <p className="text-gray-700 font-medium text-xs">{fmt(insp.createdAt)}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs text-gray-400 leading-none mb-0.5">Due Date</p>
                              <p className="text-gray-700 font-medium text-xs">{fmtDate(insp.dueDate)}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <User className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs text-gray-400 leading-none mb-0.5">Requested By</p>
                              <p className="text-gray-700 font-medium text-xs">{insp.requestedBy || '—'}</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <UserCheck className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs text-gray-400 leading-none mb-0.5">Assigned To</p>
                              <p className="text-gray-700 font-medium text-xs">{insp.assignedTo || insp.inspectedBy || '—'}</p>
                            </div>
                          </div>

                          {insp.requestDate && (
                            <div className="flex items-start gap-2">
                              <Tag className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs text-gray-400 leading-none mb-0.5">Request Date</p>
                                <p className="text-gray-700 font-medium text-xs">{fmtDate(insp.requestDate)}</p>
                              </div>
                            </div>
                          )}

                          {insp.completedAt && (
                            <div className="flex items-start gap-2">
                              <CalendarCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs text-gray-400 leading-none mb-0.5">Completed At</p>
                                <p className="text-gray-700 font-medium text-xs">{fmt(insp.completedAt)}</p>
                              </div>
                            </div>
                          )}

                          {insp.completedBy && (
                            <div className="flex items-start gap-2">
                              <UserCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs text-gray-400 leading-none mb-0.5">Completed By</p>
                                <p className="text-gray-700 font-medium text-xs">{insp.completedBy}</p>
                              </div>
                            </div>
                          )}

                          {insp.fullReportData?.reportNo && (
                            <div className="flex items-start gap-2">
                              <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs text-gray-400 leading-none mb-0.5">Report No.</p>
                                <p className="text-gray-700 font-medium text-xs font-mono">{insp.fullReportData.reportNo}</p>
                              </div>
                            </div>
                          )}

                          {insp.fullReportData?.areaDetails && (
                            <div className="flex items-start gap-2">
                              <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs text-gray-400 leading-none mb-0.5">Area</p>
                                <p className="text-gray-700 font-medium text-xs">{insp.fullReportData.areaDetails}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        {insp.notes && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                              <FileText className="h-3 w-3" /> Notes
                            </p>
                            <p className="text-xs text-gray-600 leading-relaxed">{insp.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
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
            reportData={selectedReport as InspectionReportFormValues}
          />
        </Suspense>
      )}
    </div>
  );
}
