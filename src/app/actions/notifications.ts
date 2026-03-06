"use server";

import { createAdminClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export interface DbNotification {
  id: string;
  title: string;
  message: string;
  user_id: string;
  type: string;
  reference_id: string | null;
  timestamp: string;
  is_read: boolean;
}

export async function createNotification(input: {
  title: string;
  message: string;
  user_id: string;
  type: string;
  reference_id?: string;
}) {
  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .insert({
        title: input.title,
        message: input.message,
        user_id: input.user_id,
        type: input.type,
        reference_id: input.reference_id || null,
        timestamp: new Date().toISOString(),
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error("createNotification error:", error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (error: any) {
    console.error("createNotification error:", error);
    return { success: false, error: error.message };
  }
}

export async function createNotificationForRole(input: {
  title: string;
  message: string;
  role: string;
  type: string;
  reference_id?: string;
}) {
  try {
    const supabaseAdmin = createAdminClient();
    // Get all users with the given role
    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("role", input.role);

    if (usersError || !users || users.length === 0) {
      return { success: false, error: "No users found with role: " + input.role };
    }

    const notifications = users.map((u) => ({
      title: input.title,
      message: input.message,
      user_id: u.id,
      type: input.type,
      reference_id: input.reference_id || null,
      timestamp: new Date().toISOString(),
      is_read: false,
    }));

    const { error } = await supabaseAdmin
      .from("notifications")
      .insert(notifications);

    if (error) {
      console.error("createNotificationForRole error:", error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    console.error("createNotificationForRole error:", error);
    return { success: false, error: error.message };
  }
}

export async function getNotifications(userId: string): Promise<DbNotification[]> {
  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("timestamp", { ascending: false })
      .limit(50);

    if (error) {
      console.error("getNotifications error:", error.message);
      return [];
    }
    return (data as DbNotification[]) || [];
  } catch {
    return [];
  }
}

export async function markNotificationRead(id: string) {
  try {
    const supabaseAdmin = createAdminClient();
    await supabaseAdmin
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function markAllNotificationsRead(userId: string) {
  try {
    const supabaseAdmin = createAdminClient();
    await supabaseAdmin
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function clearAllNotifications(userId: string) {
  try {
    const supabaseAdmin = createAdminClient();
    await supabaseAdmin
      .from("notifications")
      .delete()
      .eq("user_id", userId);
    return { success: true };
  } catch {
    return { success: false };
  }
}
