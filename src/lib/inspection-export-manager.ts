/**
 * InspectionExportManager
 *
 * Helper class for exporting inspection records as JSON files.
 * All exports are triggered as browser downloads.
 * Files are named following the InspectX_Reports naming convention.
 */

import type { Inspection } from '@/lib/types';

export interface InspectionExportPayload {
  inspection_id: string;
  machine_name: string;
  assigned_inspector: string;
  inspection_date: string;
  inspection_time: string;
  status: string;
  priority: string;
  remarks: string;
  machine_id?: string;
  machine_sl_no?: string;
  requested_by?: string;
  due_date?: string;
  created_at?: string;
  completed_at?: string;
  inspected_by?: string;
}

function toExportPayload(insp: Inspection): InspectionExportPayload {
  const dt = insp.createdAt ? new Date(insp.createdAt) : null;
  return {
    inspection_id: insp.id,
    machine_name: insp.machineName,
    assigned_inspector: insp.assignedTo ?? insp.inspectedBy ?? 'Unassigned',
    inspection_date: dt
      ? dt.toISOString().split('T')[0]
      : (insp.requestDate ?? ''),
    inspection_time: dt
      ? dt.toTimeString().slice(0, 5)
      : '',
    status: insp.status,
    priority: insp.priority,
    remarks: insp.notes ?? '',
    machine_id: insp.machineId,
    machine_sl_no: insp.machineSlNo,
    requested_by: insp.requestedBy,
    due_date: insp.dueDate,
    created_at: insp.createdAt,
    completed_at: insp.completedAt,
    inspected_by: insp.inspectedBy,
  };
}

function triggerDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export class InspectionExportManager {
  /**
   * Export all inspections into a single JSON file.
   * Filename: inspection_records_YYYY_MM_DD.json
   */
  static exportAllInspections(inspections: Inspection[]): void {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '_');
    const filename = `inspection_records_${dateStr}.json`;

    const payload = {
      exported_at: today.toISOString(),
      total_records: inspections.length,
      records: inspections.map(toExportPayload),
    };

    triggerDownload(JSON.stringify(payload, null, 2), filename);
  }

  /**
   * Export a single inspection by its ID.
   * Filename: inspection_<ID>.json
   */
  static exportSingleInspection(inspection: Inspection): void {
    const safeId = inspection.id.replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `inspection_${safeId}.json`;
    const payload = toExportPayload(inspection);
    triggerDownload(JSON.stringify(payload, null, 2), filename);
  }
}
