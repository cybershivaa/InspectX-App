

export type Role = 'Admin' | 'Inspector' | 'Client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
}

export interface PendingUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'Inspector' | 'Client';
  status: 'pending';
  requestedat: string;
}

export type MachineStatus = 'Active' | 'Maintenance' | 'Inactive';

export interface Machine {
  id:string;
  name: string;
  machineId: string;
  status: MachineStatus;
  lastInspection: string;
  nextInspection: string;
}

export type InspectionStatus = 'Completed' | 'Pending' | 'Failed' | 'Partial' | 'Upcoming';
export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';
export type ActivityType = 'Inspection' | 'Maintenance' | 'Repair' | 'Calibration';

export interface Inspection {
  id: string;
  machineId: string;
  machineSlNo?: string;
  machineName: string;
  priority: Priority;
  status: InspectionStatus;
  assignedTo?: string;
  requestedBy: string;
  requestDate: string;
  dueDate: string;
  notes?: string;
  fullReportData?: Record<string, any>;
  createdAt: string; // Changed from Date to string for serialization
  completedAt?: string;
  completedBy?: string;
  inspectedBy?: string;
}

export interface InspectionActivity {
  id: string;
  date: string;
  activityType: ActivityType;
  details: string;
  status: 'Completed' | 'Failed' | 'Partial';
  inspectedBy: string;
}

export interface Anomaly {
  machineId: string;
  timestamp: string;
  message: string;
  inspectionId?: string; // Link to the inspection for detailed view
}

export type FormFieldType = 'text' | 'number' | 'select' | 'textarea' | 'checkbox';

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  options?: string[]; // For select type
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
}

    