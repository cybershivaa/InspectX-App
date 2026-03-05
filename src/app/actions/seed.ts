"use server";

import { supabase } from "@/lib/supabase";
// TODO: Replace Firestore logic below with Supabase equivalent

const mockMachines = [
  { id: 'm1', name: 'HT Motor', machineId: 'NTPC-HTM-001', status: 'Active', lastInspection: '2024-07-15', nextInspection: '2025-01-15' },
  { id: 'm2', name: 'LT Motor', machineId: 'NTPC-LTM-002', status: 'Active', lastInspection: '2024-07-16', nextInspection: '2025-01-16' },
  { id: 'm3', name: 'Cable Laying/Installation', machineId: 'NTPC-CBL-003', status: 'Maintenance', lastInspection: '2024-06-20', nextInspection: '2024-12-20' },
  { id: 'm4', name: 'Testing of Power Cables', machineId: 'NTPC-TPC-004', status: 'Active', lastInspection: '2024-07-01', nextInspection: '2025-01-01' },
  { id: 'm5', name: 'Cable Trays', machineId: 'NTPC-CT-005', status: 'Inactive', lastInspection: '2023-01-10', nextInspection: '2023-07-10' },
  { id: 'm6', name: 'Earthing System', machineId: 'NTPC-ES-006', status: 'Active', lastInspection: '2024-05-30', nextInspection: '2024-11-30' },
  { id: 'm7', name: 'HT/LT SwitchGear', machineId: 'NTPC-SWG-007', status: 'Active', lastInspection: '2024-07-18', nextInspection: '2025-01-18' },
  { id: 'm8', name: 'LT Panels', machineId: 'NTPC-LTP-008', status: 'Maintenance', lastInspection: '2024-07-05', nextInspection: '2024-08-05' },
];

const mockInspections = [
  {
    id: 'i1',
    machineId: 'm1',
    machineName: 'HT Motor',
    status: 'Completed',
    priority: 'High',
    assignedTo: 'Inspector Gadget',
    dueDate: '2025-01-15',
    createdAt: Timestamp.fromDate(new Date('2024-12-20')),
  },
  {
    id: 'i2',
    machineId: 'm2',
    machineName: 'LT Motor',
    status: 'Pending',
    priority: 'Medium',
    assignedTo: 'Inspector Gadget',
    dueDate: '2025-01-16',
    createdAt: Timestamp.fromDate(new Date('2024-12-22')),
  },
  {
    id: 'i3',
    machineId: 'm3',
    machineName: 'Cable Laying/Installation',
    status: 'Failed',
    priority: 'High',
    assignedTo: 'Inspector Gadget',
    dueDate: '2024-12-20',
    createdAt: Timestamp.fromDate(new Date('2024-12-10')),
  },
  {
    id: 'i4',
    machineId: 'm7',
    machineName: 'HT/LT SwitchGear',
    status: 'Upcoming',
    priority: 'Low',
    assignedTo: null,
    dueDate: '2025-01-18',
    createdAt: Timestamp.fromDate(new Date('2024-12-25')),
  },
  {
    id: 'i5',
    machineId: 'm8',
    machineName: 'LT Panels',
    status: 'Pending',
    priority: 'Medium',
    assignedTo: 'Inspector Gadget',
    dueDate: '2025-01-05',
    createdAt: Timestamp.fromDate(new Date('2024-12-26')),
  },
];

export async function seedSampleData() {
  try {
    // Check if data already exists
    const checkDoc = await getDoc(doc(db, "_meta", "seeded"));
    if (checkDoc.exists()) {
      return { success: true, message: "Data already seeded" };
    }

    // Seed machines
    for (const machine of mockMachines) {
      await setDoc(doc(db, "machines", machine.id), machine);
    }

    // Seed inspections
    for (const inspection of mockInspections) {
      await setDoc(doc(db, "inspections", inspection.id), inspection);
    }

    // Mark as seeded
    await setDoc(doc(db, "_meta", "seeded"), { 
      seededAt: Timestamp.now(),
      version: "1.0"
    });

    return { 
      success: true, 
      message: `Seeded ${mockMachines.length} machines and ${mockInspections.length} inspections` 
    };
  } catch (error: any) {
    console.error("Error seeding data:", error);
    return { 
      success: false, 
      error: error.message || "Failed to seed data" 
    };
  }
}
