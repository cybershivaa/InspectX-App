"use client";

/**
 * InspectionRecordsActivity
 *
 * Admin-only screen that displays a searchable, filterable list of all
 * inspection records stored in the database.
 *
 * Features:
 *  - Card layout per record (ID, machine, inspector, date/time, status, priority, remarks)
 *  - Search by Machine Name, Inspector Name, or Inspection ID
 *  - Filter by Status, Date, and Machine Name
 *  - Export All Records as JSON (InspectionExportManager.exportAllInspections)
 *  - Per-card Download JSON (InspectionExportManager.exportSingleInspection)
 *  - Real-time Supabase subscription
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  FileDown,
  Loader2,
  Monitor,
  Search,
  Shield,
  SlidersHorizontal,
  User,
  X,
} from 'lucide-react';
import { useAppContext } from '@/hooks/useAppContext';
import { supabase } from '@/lib/supabase';
import type { Inspection, InspectionStatus, Priority } from '@/lib/types';
import { InspectionExportManager } from '@/lib/inspection-export-manager';
import { format, parseISO, isValid } from 'date-fns';

// ─── helpers ────────────────────────────────────────────────────────────────

const statusConfig: Record<
  InspectionStatus,
  { icon: React.ElementType; badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'; colorClass: string }
> = {
  Completed: { icon: CheckCircle, badgeVariant: 'default', colorClass: 'text-green-600 dark:text-green-400' },
  Pending:   { icon: Clock,        badgeVariant: 'secondary', colorClass: 'text-yellow-600 dark:text-yellow-400' },
  Failed:    { icon: AlertCircle,  badgeVariant: 'destructive', colorClass: 'text-red-600 dark:text-red-400' },
  Partial:   { icon: AlertCircle,  badgeVariant: 'destructive', colorClass: 'text-orange-600 dark:text-orange-400' },
  Upcoming:  { icon: Clock,        badgeVariant: 'outline', colorClass: 'text-blue-600 dark:text-blue-400' },
};

const priorityConfig: Record<Priority, { badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'; dot: string }> = {
  Critical: { badgeVariant: 'destructive', dot: '🔴' },
  High:     { badgeVariant: 'destructive', dot: '🟠' },
  Medium:   { badgeVariant: 'secondary',   dot: '🟡' },
  Low:      { badgeVariant: 'outline',     dot: '🟢' },
};

function normalizeInspection(d: any): Inspection {
  return {
    ...d,
    id:            d.id ?? '',
    machineId:     d.machineId    ?? d.machineid    ?? '',
    machineSlNo:   d.machineSlNo  ?? d.machineslno  ?? '',
    machineName:   d.machineName  ?? d.machinename  ?? '',
    requestedBy:   d.requestedBy  ?? d.requestedby  ?? '',
    assignedTo:    d.assignedTo   ?? d.assignedto   ?? undefined,
    dueDate:       d.dueDate      ?? d.duedate      ?? '',
    requestDate:   d.requestDate  ?? d.requestdate  ?? '',
    createdAt:     d.createdAt    ?? d.createdat    ?? '',
    completedAt:   d.completedAt  ?? d.completedat  ?? undefined,
    inspectedBy:   d.inspectedBy  ?? d.inspectedby  ?? undefined,
    fullReportData: d.fullReportData ?? d.fullreportdata ?? undefined,
  };
}

function safeFormat(dateStr: string | undefined, fmt: string): string {
  if (!dateStr) return '—';
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, fmt) : '—';
  } catch {
    return '—';
  }
}

const ALL_VALUE = '__ALL__';

// ─── main component ──────────────────────────────────────────────────────────

export function InspectionRecordsClientPage() {
  const { user } = useAppContext();

  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading]         = useState(true);
  const [exporting, setExporting]     = useState(false);

  // search + filter state
  const [searchQuery, setSearchQuery]     = useState('');
  const [filterStatus,  setFilterStatus]  = useState<string>(ALL_VALUE);
  const [filterMachine, setFilterMachine] = useState<string>(ALL_VALUE);
  const [filterDate,    setFilterDate]    = useState<string>('');

  // ── fetch data ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('inspections')
          .select('*')
          .order('createdat', { ascending: false });
        if (error) throw error;
        setInspections((data ?? []).map(normalizeInspection));
      } catch (err) {
        console.error('InspectionRecords fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // real-time updates
    const channel = supabase
      .channel('inspection-records-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inspections' }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // ── unique options for filter dropdowns ───────────────────────────────────
  const uniqueMachines = useMemo(
    () => Array.from(new Set(inspections.map(i => i.machineName).filter(Boolean))).sort(),
    [inspections]
  );

  // ── filtered / searched list ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return inspections.filter(insp => {
      // search
      if (q) {
        const hit =
          insp.machineName.toLowerCase().includes(q) ||
          (insp.assignedTo ?? '').toLowerCase().includes(q) ||
          (insp.inspectedBy ?? '').toLowerCase().includes(q) ||
          insp.id.toLowerCase().includes(q);
        if (!hit) return false;
      }
      // status filter
      if (filterStatus !== ALL_VALUE && insp.status !== filterStatus) return false;
      // machine filter
      if (filterMachine !== ALL_VALUE && insp.machineName !== filterMachine) return false;
      // date filter
      if (filterDate) {
        const inspDate = safeFormat(insp.createdAt || insp.requestDate, 'yyyy-MM-dd');
        if (inspDate !== filterDate) return false;
      }
      return true;
    });
  }, [inspections, searchQuery, filterStatus, filterMachine, filterDate]);

  const hasActiveFilters =
    searchQuery || filterStatus !== ALL_VALUE || filterMachine !== ALL_VALUE || filterDate;

  const clearFilters = () => {
    setSearchQuery('');
    setFilterStatus(ALL_VALUE);
    setFilterMachine(ALL_VALUE);
    setFilterDate('');
  };

  // ── export all ────────────────────────────────────────────────────────────
  const handleExportAll = () => {
    setExporting(true);
    try {
      InspectionExportManager.exportAllInspections(filtered);
    } finally {
      setExporting(false);
    }
  };

  // ── guard: admin only ─────────────────────────────────────────────────────
  if (!loading && (!user || user.role !== 'Admin')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Shield className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">Only Admin users can view Inspection Records.</p>
      </div>
    );
  }

  // ── loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-14 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // ── main render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inspection Records</h1>
          <p className="text-muted-foreground mt-1">
            Complete history of all inspection calls —{' '}
            <span className="font-medium text-foreground">{inspections.length}</span> total,{' '}
            <span className="font-medium text-foreground">{filtered.length}</span> shown
          </p>
        </div>
        <Button onClick={handleExportAll} disabled={exporting || filtered.length === 0} className="gap-2 shrink-0">
          {exporting
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Download className="h-4 w-4" />
          }
          Export All Records
        </Button>
      </div>

      {/* ── search + filters ── */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-col gap-4">
            {/* search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by Machine Name, Inspector Name, or Inspection ID…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* filter row */}
            <div className="flex flex-wrap gap-3 items-end">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground self-center shrink-0" />

              {/* status */}
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>All Statuses</SelectItem>
                    {(['Completed', 'Pending', 'Upcoming', 'Failed', 'Partial'] as InspectionStatus[]).map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* machine */}
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Machine</Label>
                <Select value={filterMachine} onValueChange={setFilterMachine}>
                  <SelectTrigger className="w-44 h-8 text-xs">
                    <SelectValue placeholder="All Machines" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>All Machines</SelectItem>
                    {uniqueMachines.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* date */}
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  className="w-40 h-8 text-xs"
                />
              </div>

              {/* clear */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-1.5 h-8 text-xs self-end text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── record cards (virtualized for large datasets via windowed grid) ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-xl">
          <FileDown className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground font-medium">No records match your search or filters.</p>
          {hasActiveFilters && (
            <Button variant="link" size="sm" onClick={clearFilters} className="mt-2 text-xs">
              Clear all filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(insp => (
            <InspectionRecordCard
              key={insp.id}
              inspection={insp}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── InspectionRecordCard ─────────────────────────────────────────────────────

interface CardProps {
  inspection: Inspection;
}

function InspectionRecordCard({ inspection: insp }: CardProps) {
  const sc = statusConfig[insp.status] ?? statusConfig['Pending'];
  const pc = priorityConfig[insp.priority as Priority] ?? priorityConfig['Low'];
  const StatusIcon = sc.icon;

  const inspector   = insp.assignedTo ?? insp.inspectedBy ?? 'Unassigned';
  const dateStr     = safeFormat(insp.createdAt || insp.requestDate, 'dd MMM yyyy');
  const timeStr     = safeFormat(insp.createdAt, 'hh:mm a');

  return (
    <Card className="flex flex-col hover:shadow-md hover:border-primary/40 transition-all duration-200">
      {/* card header */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-mono text-muted-foreground">
              #{insp.id}
            </CardTitle>
            <p className="text-base font-semibold mt-0.5 leading-tight">{insp.machineName || '—'}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant={sc.badgeVariant} className="gap-1 text-xs">
              <StatusIcon className="h-3 w-3" />
              {insp.status}
            </Badge>
            <Badge variant={pc.badgeVariant} className="text-xs">
              {pc.dot} {insp.priority}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <Separator />

      {/* card body */}
      <CardContent className="pt-4 pb-3 flex-1 space-y-2.5">
        {/* inspector */}
        <div className="flex items-center gap-2 text-sm">
          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">Inspector:</span>
          <span className="font-medium truncate">{inspector}</span>
        </div>

        {/* date */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">Date:</span>
          <span className="font-medium">{dateStr}</span>
        </div>

        {/* time */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">Time:</span>
          <span className="font-medium">{timeStr}</span>
        </div>

        {/* machine ID */}
        {insp.machineId && (
          <div className="flex items-center gap-2 text-sm">
            <Monitor className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Machine ID:</span>
            <span className="font-medium text-xs font-mono">{insp.machineId}</span>
          </div>
        )}

        {/* remarks */}
        {insp.notes && (
          <div className="bg-muted/40 rounded-md p-2.5 mt-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Remarks</p>
            <p className="text-xs text-foreground leading-relaxed line-clamp-3">{insp.notes}</p>
          </div>
        )}
      </CardContent>

      {/* download button */}
      <CardContent className="pt-0 pb-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs"
          onClick={() => InspectionExportManager.exportSingleInspection(insp)}
        >
          <FileDown className="h-3.5 w-3.5" />
          Download JSON
        </Button>
      </CardContent>
    </Card>
  );
}
