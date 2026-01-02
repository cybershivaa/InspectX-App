
import type { User, Machine, Inspection, InspectionActivity, FormTemplate } from './types';

// Use 'let' instead of 'const' to allow modification for mock signup
export let users: User[] = [
  { id: '1', name: 'Admin User', email: 'admin@inspectx.com', role: 'Admin', avatar: '' },
  { id: '2', name: 'Inspector Gadget', email: 'inspector@inspectx.com', role: 'Inspector', avatar: '' },
  { id: '3', name: 'Client Corp', email: 'client@inspectx.com', role: 'Client', avatar: '' },
];

export const machines: Machine[] = [
  { id: 'm1', name: 'HT Motor', machineId: 'NTPC-HTM-001', status: 'Active', lastInspection: '2024-07-15', nextInspection: '2025-01-15' },
  { id: 'm2', name: 'LT Motor', machineId: 'NTPC-LTM-002', status: 'Active', lastInspection: '2024-07-16', nextInspection: '2025-01-16' },
  { id: 'm3', name: 'Cable Laying/Installation', machineId: 'NTPC-CBL-003', status: 'Maintenance', lastInspection: '2024-06-20', nextInspection: '2024-12-20' },
  { id: 'm4', name: 'Testing of Power Cables', machineId: 'NTPC-TPC-004', status: 'Active', lastInspection: '2024-07-01', nextInspection: '2025-01-01' },
  { id: 'm5', name: 'Cable Trays', machineId: 'NTPC-CT-005', status: 'Inactive', lastInspection: '2023-01-10', nextInspection: '2023-07-10' },
  { id: 'm6', name: 'Earthing System', machineId: 'NTPC-ES-006', status: 'Active', lastInspection: '2024-05-30', nextInspection: '2024-11-30' },
  { id: 'm7', name: 'HT/LT SwitchGear', machineId: 'NTPC-SWG-007', status: 'Active', lastInspection: '2024-07-18', nextInspection: '2025-01-18' },
  { id: 'm8', name: 'LT Panels', machineId: 'NTPC-LTP-008', status: 'Maintenance', lastInspection: '2024-07-05', nextInspection: '2024-08-05' },
  { id: 'm9', name: 'Busduct', machineId: 'NTPC-BSD-009', status: 'Active', lastInspection: '2024-04-22', nextInspection: '2024-10-22' },
  { id: 'm10', name: 'Station Lighting', machineId: 'NTPC-STL-010', status: 'Active', lastInspection: '2024-07-11', nextInspection: '2025-01-11' },
  { id: 'm11', name: 'Lighting Pole/High Mast/FVI', machineId: 'NTPC-LPH-011', status: 'Active', lastInspection: '2024-07-12', nextInspection: '2025-01-12' },
  { id: 'm12', name: 'Miscellaneous Equipment/System', machineId: 'NTPC-MISC-012', status: 'Active', lastInspection: '2024-06-28', nextInspection: '2024-12-28' },
  { id: 'm13', name: 'C&I Equipments/Works', machineId: 'NTPC-CI-013', status: 'Active', lastInspection: '2024-07-02', nextInspection: '2025-01-02' },
  { id: 'm14', name: 'Power Transformer', machineId: 'NTPC-PT-014', status: 'Active', lastInspection: '2024-07-19', nextInspection: '2025-01-19' },
  { id: 'm15', name: 'Outdoor Transformer', machineId: 'NTPC-OT-015', status: 'Maintenance', lastInspection: '2024-06-15', nextInspection: '2024-09-15' },
  { id: 'm16', name: 'Elevator', machineId: 'NTPC-ELV-016', status: 'Active', lastInspection: '2024-07-08', nextInspection: '2024-10-08' },
  { id: 'm17', name: 'Turbogenerator', machineId: 'NTPC-TRB-017', status: 'Active', lastInspection: '2024-07-20', nextInspection: '2025-01-20' },
];

export let inspections: Inspection[] = [];

export const inspectionActivities: Record<string, InspectionActivity[]> = {
  'm1': [
    { id: 'act1', date: '2024-07-15', activityType: 'Inspection', details: 'Routine check-up, all parameters normal.', status: 'Completed', inspectedBy: 'Inspector Gadget' },
    { id: 'act2', date: '2024-01-15', activityType: 'Maintenance', details: 'Oil levels topped up.', status: 'Completed', inspectedBy: 'Inspector Gadget' },
  ],
  'm3': [
    { id: 'act3', date: '2024-06-20', activityType: 'Repair', details: 'Replaced faulty wiring harness. Scheduled for re-inspection.', status: 'Partial', inspectedBy: 'Inspector Gadget' },
  ],
   'm7': [
    { id: 'act4', date: '2024-07-18', activityType: 'Inspection', details: 'Failed on thermal imaging test.', status: 'Failed', inspectedBy: 'Inspector Gadget' },
    { id: 'act5', date: '2024-01-18', activityType: 'Inspection', details: 'Passed all tests.', status: 'Completed', inspectedBy: 'Inspector Gadget' },
  ],
};

export const inspectionDataForAI = [
  {
    machineId: "MX-001",
    timestamp: "2024-07-18T10:00:00Z",
    readings: {
      temperature: 75.5,
      pressure: 101.2,
      vibration: 0.12,
    },
  },
  {
    machineId: "MX-001",
    timestamp: "2024-07-18T10:05:00Z",
    readings: {
      temperature: 76.1,
      pressure: 101.3,
      vibration: 0.15,
    },
  },
  {
    machineId: "MX-001",
    timestamp: "2024-07-18T10:10:00Z",
    readings: {
      temperature: 95.3,
      pressure: 120.5,
      vibration: 1.5,
    },
  },
];


export let formTemplates: FormTemplate[] = [
  {
    id: 'ft1',
    name: 'Standard Equipment Inspection',
    description: 'A general-purpose inspection form for standard equipment checks.',
    fields: [
      { id: 'f1', label: 'Visual Inspection', type: 'select', options: ['Pass', 'Fail', 'N/A'] },
      { id: 'f2', label: 'Temperature (°C)', type: 'number' },
      { id: 'f3', label: 'Pressure (PSI)', type: 'number' },
      { id: 'f4', label: 'Inspector Notes', type: 'textarea' },
    ]
  }
];

    