

"use server";

import { createAdminClient } from "@/lib/supabase";
import type { Machine, Inspection, User } from "@/lib/types";

export async function getMachines(): Promise<Machine[]> {
  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin.from('machines').select('*');
  if (error) {
    console.error("getMachines error:", error.message);
    return [];
  }
  return (data as Machine[]) || [];
}

export async function getInspections(): Promise<Inspection[]> {
  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin
    .from('inspections')
    .select('*')
    .order('createdat', { ascending: false });
  if (error) {
    console.error("getInspections error:", error.message);
    return [];
  }
  return (data as Inspection[]) || [];
}

export async function getInspectionsByMachineId(machineId: string): Promise<Inspection[]> {
  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin
    .from('inspections')
    .select('*')
    .eq('machineid', machineId);
  if (error) {
    console.error("getInspectionsByMachineId error:", error.message);
    return [];
  }
  return (data as Inspection[]) || [];
}

export async function getUsers(): Promise<User[]> {
  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin.from('users').select('*');
  if (error) {
    console.error("getUsers error:", error.message);
    return [];
  }
  return (data as User[]) || [];
}

export async function getInspectors(): Promise<User[]> {
  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('role', 'Inspector');
  if (error) {
    console.error("getInspectors error:", error.message);
    return [];
  }
  return (data as User[]) || [];
}
