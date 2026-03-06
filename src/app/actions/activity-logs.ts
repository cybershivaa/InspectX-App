"use server";

import { createAdminClient } from "@/lib/supabase";

export interface ActivityLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  details: string;
  performed_by: string;
  performed_by_role: string;
  timestamp: string;
}

export async function createActivityLog(input: {
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  details: string;
  performed_by: string;
  performed_by_role: string;
}) {
  try {
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.from("activity_logs").insert({
      action: input.action,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      entity_name: input.entity_name,
      details: input.details,
      performed_by: input.performed_by,
      performed_by_role: input.performed_by_role,
      timestamp: new Date().toISOString(),
    });
    if (error) {
      console.error("createActivityLog error:", error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    console.error("createActivityLog error:", error);
    return { success: false, error: error.message };
  }
}

export async function getActivityLogs(limit: number = 100): Promise<ActivityLog[]> {
  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("activity_logs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("getActivityLogs error:", error.message);
      return [];
    }
    return (data as ActivityLog[]) || [];
  } catch {
    return [];
  }
}

export async function getActivityLogsByEntity(
  entityType: string,
  entityId: string
): Promise<ActivityLog[]> {
  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("activity_logs")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("timestamp", { ascending: false });

    if (error) {
      console.error("getActivityLogsByEntity error:", error.message);
      return [];
    }
    return (data as ActivityLog[]) || [];
  } catch {
    return [];
  }
}
