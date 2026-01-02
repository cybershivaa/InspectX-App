"use client";

import React, { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { detectAnomalies } from '@/app/actions/ai';
import { inspectionDataForAI } from '@/lib/data';
import type { Anomaly } from '@/lib/types';
import { AlertTriangle, Bot, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AnomalyDetectionPage() {
  const [isPending, startTransition] = useTransition();
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const { toast } = useToast();

  const handleDetection = () => {
    startTransition(async () => {
      setAnomalies([]);
      const result = await detectAnomalies({ inspectionData: inspectionDataForAI });
      if (result.success && result.data) {
        setAnomalies(result.data.anomalies);
        toast({
          title: "Analysis Complete",
          description: `Found ${result.data.anomalies.length} potential anomalies.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Analysis Failed",
          description: result.error,
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <Bot className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
            <div>
              <CardTitle className="text-2xl">AI-Powered Anomaly Detection</CardTitle>
              <CardDescription>
                Use AI to automatically flag unusual patterns in inspection data.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-muted-foreground">
            Click the button below to run an analysis on a sample set of inspection data. The AI will review the data for any readings that deviate from the norm and flag them for your review.
          </p>
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertTitle>Sample Data Demonstration</AlertTitle>
            <AlertDescription>
              We'll use a pre-defined set of machine readings, including a simulated spike in temperature and vibration, to demonstrate the AI's capabilities.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button onClick={handleDetection} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {isPending ? 'Analyzing...' : 'Run AI Analysis'}
          </Button>
        </CardFooter>
      </Card>

      {anomalies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detected Anomalies</CardTitle>
            <CardDescription>The following potential anomalies were detected and require review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {anomalies.map((anomaly, index) => (
              <Alert key={index} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Anomaly on {anomaly.machineId}</AlertTitle>
                <AlertDescription>
                  <p className="font-mono text-xs"><strong>Timestamp:</strong> {new Date(anomaly.timestamp).toLocaleString()}</p>
                  <p className="mt-2"><strong>AI Finding:</strong> {anomaly.message}</p>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
