"use client";

import React, { useState, useTransition, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { detectAnomalies } from '@/app/actions/ai';
import type { Anomaly, Inspection } from '@/lib/types';
import { AlertTriangle, Bot, Loader2, Sparkles, RefreshCw, Filter, TrendingUp, AlertCircle, Eye, Calendar, User, Clock, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from '@/lib/supabase';
// All Firebase Firestore logic replaced with Supabase below
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AnomalyDetectionPage() {
  const [isPending, startTransition] = useTransition();
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [useAI, setUseAI] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Rule-based anomaly detection helper (defined before useEffect so it can be called inside)
  const detectAnomaliesRuleBasedFn = useCallback((data: Inspection[]): Anomaly[] => {
    const detectedAnomalies: Anomaly[] = [];
    data.forEach(inspection => {
      if (inspection.status === 'Failed' || inspection.status === 'Partial') {
        detectedAnomalies.push({
          machineId: inspection.machineName || inspection.machineId,
          timestamp: inspection.createdAt || new Date().toISOString(),
          message: `Inspection ${inspection.status.toLowerCase()}: ${inspection.notes || 'Requires immediate attention'}`,
          inspectionId: inspection.id
        });
      }
      const dueDate = new Date(inspection.dueDate);
      const today = new Date();
      if (inspection.status === 'Pending' && dueDate < today) {
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        detectedAnomalies.push({
          machineId: inspection.machineName || inspection.machineId,
          timestamp: inspection.createdAt || new Date().toISOString(),
          message: `Inspection overdue by ${daysOverdue} days. Priority: ${inspection.priority}`,
          inspectionId: inspection.id
        });
      }
      if ((inspection.priority === 'High' || inspection.priority === 'Critical') && inspection.status === 'Pending') {
        detectedAnomalies.push({
          machineId: inspection.machineName || inspection.machineId,
          timestamp: inspection.createdAt || new Date().toISOString(),
          message: `${inspection.priority} priority inspection pending. Due: ${inspection.dueDate}`,
          inspectionId: inspection.id
        });
      }
    });
    return detectedAnomalies;
  }, []);

  // Fetch real inspections from Supabase and auto-run analysis
  useEffect(() => {
    const fetchInspections = async () => {
      try {
        const { data, error } = await supabase.from('inspections').select('*');
        if (error) throw error;
        const normalized = (data || []).map((d: any): Inspection => ({
          ...d,
          machineId: d.machineId ?? d.machineid ?? '',
          machineName: d.machineName ?? d.machinename ?? '',
          requestedBy: d.requestedBy ?? d.requestedby ?? '',
          assignedTo: d.assignedTo ?? d.assignedto ?? undefined,
          dueDate: d.dueDate ?? d.duedate ?? '',
          requestDate: d.requestDate ?? d.requestdate ?? '',
          createdAt: d.createdAt ?? d.createdat ?? '',
        }));
        setInspections(normalized);
        // Auto-run rule-based analysis on load
        const autoAnomalies = detectAnomaliesRuleBasedFn(normalized);
        setAnomalies(autoAnomalies);
      } catch (error) {
        console.error('Error fetching inspections:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load inspection data.' });
      } finally {
        setLoading(false);
      }
    };
    fetchInspections();
  }, [toast, detectAnomaliesRuleBasedFn]);

  // Rule-based anomaly detection (wrapper for handleDetection)
  const detectAnomaliesRuleBased = detectAnomaliesRuleBasedFn;

  // Handler to view inspection details
  const handleViewDetails = (anomaly: Anomaly) => {
    if (anomaly.inspectionId) {
      const inspection = inspections.find(i => i.id === anomaly.inspectionId);
      if (inspection) {
        setSelectedInspection(inspection);
        setIsDialogOpen(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Inspection details not found.'
        });
      }
    }
  };

  const handleDetection = () => {
    startTransition(async () => {
      setAnomalies([]);
      
      // Filter inspections based on status
      let dataToAnalyze = inspections;
      if (statusFilter !== 'all') {
        dataToAnalyze = inspections.filter(i => i.status === statusFilter);
      }
      
      if (useAI) {
        // Try AI-based detection using real inspection data
        const aiPayload = dataToAnalyze.map(i => ({
          machineId: i.machineId || i.machineName,
          timestamp: i.createdAt || new Date().toISOString(),
          readings: { status: i.status, priority: i.priority, dueDate: i.dueDate } as any,
        }));
        const result = await detectAnomalies({ inspectionData: aiPayload });
        if (result.success && result.data) {
          setAnomalies(result.data.anomalies);
          toast({
            title: "AI Analysis Complete",
            description: `Found ${result.data.anomalies.length} potential anomalies using AI.`,
          });
        } else {
          // Fallback to rule-based
          const ruleBasedAnomalies = detectAnomaliesRuleBased(dataToAnalyze);
          setAnomalies(ruleBasedAnomalies);
          toast({
            variant: "default",
            title: "Rule-Based Analysis Complete",
            description: `AI unavailable. Found ${ruleBasedAnomalies.length} anomalies using rule-based detection.`,
          });
        }
      } else {
        // Use rule-based detection
        const ruleBasedAnomalies = detectAnomaliesRuleBased(dataToAnalyze);
        setAnomalies(ruleBasedAnomalies);
        toast({
          title: "Analysis Complete",
          description: `Found ${ruleBasedAnomalies.length} potential anomalies.`,
        });
      }
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Bot className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <CardTitle className="text-2xl">Anomaly Detection System</CardTitle>
                <CardDescription>
                  Automatically detect unusual patterns, failed inspections, and overdue tasks.
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {inspections.length} Inspections
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter by Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Detection Method */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Detection Method
              </label>
              <Select value={useAI ? 'ai' : 'rule'} onValueChange={(val) => setUseAI(val === 'ai')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rule">Rule-Based (Fast)</SelectItem>
                  <SelectItem value="ai">AI-Powered (Advanced)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Detection Capabilities</AlertTitle>
            <AlertDescription>
              {useAI 
                ? "AI analysis will detect complex patterns and anomalies in inspection data using machine learning."
                : "Rule-based detection identifies: Failed/Partial inspections, Overdue tasks, High-priority pending inspections."}
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={handleDetection} disabled={isPending} className="flex-1">
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : useAI ? (
              <Sparkles className="mr-2 h-4 w-4" />
            ) : (
              <AlertTriangle className="mr-2 h-4 w-4" />
            )}
            {isPending ? 'Analyzing...' : 'Run Analysis'}
          </Button>
          <Button variant="outline" onClick={() => { setAnomalies([]); setStatusFilter('all'); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      {/* Results Section */}
      {anomalies.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Detected Anomalies</CardTitle>
                <CardDescription>The following potential anomalies were detected and require review.</CardDescription>
              </div>
              <Badge variant="destructive" className="text-sm">
                {anomalies.length} {anomalies.length === 1 ? 'Anomaly' : 'Anomalies'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {anomalies.map((anomaly, index) => (
              <Alert key={index} variant="destructive" className="relative hover:bg-destructive/20 transition-colors">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="flex items-center justify-between">
                  <span>Anomaly: {anomaly.machineId}</span>
                  <Badge variant="outline" className="text-xs">
                    #{index + 1}
                  </Badge>
                </AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      <strong>Detected:</strong> {new Date(anomaly.timestamp).toLocaleString('en-US', { 
                        dateStyle: 'medium', 
                        timeStyle: 'short' 
                      })}
                    </p>
                    <p className="mt-2">
                      <strong>Finding:</strong> {anomaly.message}
                    </p>
                    {anomaly.inspectionId && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2 w-full"
                        onClick={() => handleViewDetails(anomaly)}
                      >
                        <Eye className="mr-2 h-3 w-3" />
                        View Details
                      </Button>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      ) : (
        !isPending && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-2">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="text-lg font-semibold">No Anomalies Detected</h3>
                <p className="text-sm text-muted-foreground">
                  {inspections.length === 0 
                    ? "No inspection data available. Create inspections to start anomaly detection."
                    : "Click 'Run Analysis' to start detecting anomalies in your inspection data."}
                </p>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* Inspection Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Inspection Details
            </DialogTitle>
            <DialogDescription>
              Complete information for the detected anomaly
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            {selectedInspection && (
              <div className="space-y-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Machine Name
                      </Label>
                      <p className="font-medium">{selectedInspection.machineName}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Machine ID</Label>
                      <p className="font-medium font-mono text-sm">{selectedInspection.machineId}</p>
                    </div>
                    {selectedInspection.machineSlNo && (
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Serial Number</Label>
                        <p className="font-medium font-mono text-sm">{selectedInspection.machineSlNo}</p>
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Status</Label>
                      <Badge variant={
                        selectedInspection.status === 'Completed' ? 'default' :
                        selectedInspection.status === 'Failed' ? 'destructive' :
                        selectedInspection.status === 'Pending' ? 'secondary' : 'outline'
                      }>
                        {selectedInspection.status}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Priority</Label>
                      <Badge variant={
                        selectedInspection.priority === 'High' ? 'destructive' :
                        selectedInspection.priority === 'Medium' ? 'secondary' : 'outline'
                      }>
                        {selectedInspection.priority}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* People & Dates */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Assignment & Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Requested By
                      </Label>
                      <p className="font-medium">{selectedInspection.requestedBy}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Assigned To
                      </Label>
                      <p className="font-medium">{selectedInspection.assignedTo || 'Unassigned'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Request Date
                      </Label>
                      <p className="font-medium">
                        {new Date(selectedInspection.requestDate).toLocaleDateString('en-US', {
                          dateStyle: 'medium'
                        })}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Due Date
                      </Label>
                      <p className="font-medium">
                        {new Date(selectedInspection.dueDate).toLocaleDateString('en-US', {
                          dateStyle: 'medium'
                        })}
                      </p>
                    </div>
                    {selectedInspection.completedBy && (
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Completed By</Label>
                        <p className="font-medium">{selectedInspection.completedBy}</p>
                      </div>
                    )}
                    {selectedInspection.completedAt && (
                      <div className="space-y-1">
                        <Label className="text-muted-foreground">Completed At</Label>
                        <p className="font-medium">
                          {new Date(selectedInspection.completedAt).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Notes */}
                {selectedInspection.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{selectedInspection.notes}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Report Data */}
                {selectedInspection.fullReportData && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Report Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedInspection.fullReportData.reportNo && (
                        <div className="space-y-1">
                          <Label className="text-muted-foreground">Report Number</Label>
                          <p className="font-medium font-mono">{selectedInspection.fullReportData.reportNo}</p>
                        </div>
                      )}
                      {selectedInspection.fullReportData.agencyName && (
                        <div className="space-y-1">
                          <Label className="text-muted-foreground">Agency</Label>
                          <p className="font-medium">{selectedInspection.fullReportData.agencyName}</p>
                        </div>
                      )}
                      {selectedInspection.fullReportData.inspectionDate && (
                        <div className="space-y-1">
                          <Label className="text-muted-foreground">Inspection Date</Label>
                          <p className="font-medium">
                            {new Date(selectedInspection.fullReportData.inspectionDate).toLocaleDateString('en-US', {
                              dateStyle: 'medium'
                            })}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
