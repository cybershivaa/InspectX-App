
"use client";

import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ReportView } from '../inspections/report/report-view';
import { generatePdf } from '@/lib/pdf';
import type { InspectionReportFormValues } from '../inspections/report/page';

interface ReportViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: InspectionReportFormValues;
}

export default function ReportViewDialog({ isOpen, onClose, reportData }: ReportViewDialogProps) {
  const reportRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (reportRef.current) {
      await generatePdf(reportRef.current, `inspection-report-${reportData.reportNo.replace(/\//g, '_')}.pdf`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Inspection Report</DialogTitle>
          <DialogDescription>
            Report #{reportData.reportNo}. Review the details below or download the PDF.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-6">
          <div ref={reportRef} className="bg-white">
            <ReportView data={reportData} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
          <Button onClick={handleDownload}>Download PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    