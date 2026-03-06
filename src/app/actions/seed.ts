"use server";

import { createAdminClient } from "@/lib/supabase";

const mockMachines = [
  { id: 'm1', name: 'HT Motor', machineid: 'NTPC-HTM-001', status: 'Active', lastinspection: '2024-07-15', nextinspection: '2025-01-15' },
  { id: 'm2', name: 'LT Motor', machineid: 'NTPC-LTM-002', status: 'Active', lastinspection: '2024-07-16', nextinspection: '2025-01-16' },
  { id: 'm3', name: 'Cable Laying/Installation', machineid: 'NTPC-CBL-003', status: 'Maintenance', lastinspection: '2024-06-20', nextinspection: '2024-12-20' },
  { id: 'm4', name: 'Testing of Power Cables', machineid: 'NTPC-TPC-004', status: 'Active', lastinspection: '2024-07-01', nextinspection: '2025-01-01' },
  { id: 'm5', name: 'Cable Trays', machineid: 'NTPC-CT-005', status: 'Inactive', lastinspection: '2023-01-10', nextinspection: '2023-07-10' },
  { id: 'm6', name: 'Earthing System', machineid: 'NTPC-ES-006', status: 'Active', lastinspection: '2024-05-30', nextinspection: '2024-11-30' },
  { id: 'm7', name: 'HT/LT SwitchGear', machineid: 'NTPC-SWG-007', status: 'Active', lastinspection: '2024-07-18', nextinspection: '2025-01-18' },
  { id: 'm8', name: 'LT Panels', machineid: 'NTPC-LTP-008', status: 'Maintenance', lastinspection: '2024-07-05', nextinspection: '2024-08-05' },
];

const mockInspections = [
  {
    id: 'i1',
    machineid: 'm1',
    machinename: 'HT Motor',
    status: 'Completed',
    priority: 'High',
    assignedto: 'Inspector Gadget',
    duedate: '2025-01-15',
    createdat: new Date('2024-12-20').toISOString(),
  },
  {
    id: 'i2',
    machineid: 'm2',
    machinename: 'LT Motor',
    status: 'Pending',
    priority: 'Medium',
    assignedto: 'Inspector Gadget',
    duedate: '2025-01-16',
    createdat: new Date('2024-12-22').toISOString(),
  },
  {
    id: 'i3',
    machineid: 'm3',
    machinename: 'Cable Laying/Installation',
    status: 'Failed',
    priority: 'High',
    assignedto: 'Inspector Gadget',
    duedate: '2024-12-20',
    createdat: new Date('2024-12-10').toISOString(),
  },
  {
    id: 'i4',
    machineid: 'm7',
    machinename: 'HT/LT SwitchGear',
    status: 'Upcoming',
    priority: 'Low',
    assignedto: null,
    duedate: '2025-01-18',
    createdat: new Date('2024-12-25').toISOString(),
  },
  {
    id: 'i5',
    machineid: 'm8',
    machinename: 'LT Panels',
    status: 'Pending',
    priority: 'Medium',
    assignedto: 'Inspector Gadget',
    duedate: '2025-01-05',
    createdat: new Date('2024-12-26').toISOString(),
  },
];

export async function seedSampleData() {
  try {
    const supabaseAdmin = createAdminClient();

    // Check if data already exists
    const { data: existing } = await supabaseAdmin
      .from('machines')
      .select('id')
      .limit(1);
    if (existing && existing.length > 0) {
      return { success: true, message: "Data already seeded" };
    }

    // Seed machines
    const { error: machineError } = await supabaseAdmin
      .from('machines')
      .upsert(mockMachines, { onConflict: 'id' });
    if (machineError) throw machineError;

    // Seed inspections
    const { error: inspError } = await supabaseAdmin
      .from('inspections')
      .upsert(mockInspections, { onConflict: 'id' });
    if (inspError) throw inspError;

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
