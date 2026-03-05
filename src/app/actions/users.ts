
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase";
import type { User, Role, PendingUser } from "@/lib/types";

// No need for Firestore Timestamp serialization with Supabase

const updateUserSchema = z.object({
  userId: z.string(),
  name: z.string().min(1, "Name cannot be empty."),
  avatar: z.string().url("Invalid avatar URL.").optional(),
});

export async function updateUserProfile(userId: string, name: string, avatar?: string) {
  try {
    const validationResult = updateUserSchema.safeParse({ userId, name, avatar });
    if (!validationResult.success) {
      return { success: false, error: "Invalid input data." };
    }
    const adminClient = createAdminClient();
    const updatedData: { name: string; avatar?: string } = { name };
    if (avatar) {
      updatedData.avatar = avatar;
    }
    const { error: updateError } = await adminClient.from('users').update(updatedData).eq('id', userId);
    if (updateError) {
      return { success: false, error: updateError.message };
    }
    const { data: updatedUser, error: fetchError } = await adminClient.from('users').select('*').eq('id', userId).single();
    if (fetchError || !updatedUser) {
      return { success: false, error: "User not found after update." };
    }
    revalidatePath("/profile");
    revalidatePath("/", "layout");
    return { success: true, data: updatedUser };
  } catch (error) {
    console.error("Failed to update user profile:", error);
    return { success: false, error: "An unexpected error occurred while updating the profile." };
  }
}
  // Update user role (admin only)
  export async function updateUserRole(userId: string, role: Role, adminUid: string) {
    try {
      if (!userId) return { success: false, error: "User ID is required." };
      if (!adminUid) return { success: false, error: "Admin authentication required." };
      const adminClient = createAdminClient();
      // Verify admin
      const { data: adminUser, error: adminError } = await adminClient.from('users').select('role').eq('id', adminUid).single();
      if (adminError || !adminUser || adminUser.role !== 'Admin') {
        return { success: false, error: "Unauthorized: Admin access required." };
      }
      const { error } = await adminClient.from('users').update({ role }).eq('id', userId);
      if (error) return { success: false, error: error.message };
      const { data: updatedUser, error: fetchError } = await adminClient.from('users').select('*').eq('id', userId).single();
      if (fetchError || !updatedUser) return { success: false, error: "User not found after update." };
      revalidatePath("/admin");
      return { success: true, data: updatedUser };
    } catch (error) {
      console.error("Failed to update user role:", error);
      return { success: false, error: "An unexpected error occurred while updating the user role." };
    }
  }

  // Delete user (admin only)
  export async function deleteUser(userId: string, adminUid: string) {
    try {
      if (!userId) return { success: false, error: "User ID is required." };
      if (!adminUid) return { success: false, error: "Admin authentication required." };
      const adminClient = createAdminClient();
      // Verify admin
      const { data: adminUser, error: adminError } = await adminClient.from('users').select('role').eq('id', adminUid).single();
      if (adminError || !adminUser || adminUser.role !== 'Admin') {
        return { success: false, error: "Unauthorized: Admin access required." };
      }
      if (userId === adminUid) {
        return { success: false, error: "You cannot delete your own account." };
      }
      const { error } = await adminClient.from('users').delete().eq('id', userId);
      if (error) return { success: false, error: error.message };
      // Also delete from Supabase Auth
      await adminClient.auth.admin.deleteUser(userId);
      return { success: true };
    } catch (error: any) {
      console.error("Failed to delete user:", error);
      return { success: false, error: error.message || "An unexpected error occurred while deleting the user." };
    }
  }

  // Request signup (add to pending_users)
  export async function requestSignup(values: z.infer<typeof signupRequestSchema>) {
    try {
      const validationResult = signupRequestSchema.safeParse(values);
      if (!validationResult.success) {
        return { success: false, error: "Invalid data." };
      }
      const adminClient = createAdminClient();
      const { error } = await adminClient.from('pending_users').insert({
        ...validationResult.data,
        status: 'pending',
        requestedat: new Date().toISOString(),
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error: any) {
      console.error("Signup request failed with error:", error);
      return { success: false, error: error?.message || "An unexpected error occurred during signup." };
    }
  }

  // Get all pending users
  export async function getPendingUsers(): Promise<PendingUser[]> {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.from('pending_users').select('*').eq('status', 'pending');
    if (error) throw error;
    return (data as PendingUser[]) || [];
  }

  // Reject user (delete from pending_users)
  export async function rejectUser(requestId: string) {
    try {
      if (!requestId) return { success: false, error: "Request ID is required." };
      const adminClient = createAdminClient();
      const { error } = await adminClient.from('pending_users').delete().eq('id', requestId);
      if (error) return { success: false, error: error.message };
      revalidatePath("/admin");
      return { success: true };
    } catch (error) {
      console.error("Failed to reject user:", error);
      return { success: false, error: "An unexpected error occurred while rejecting the user." };
    }
  }



const signupRequestSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(["Inspector", "Client"]),
});




