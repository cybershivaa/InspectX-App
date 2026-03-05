
"use server";

import { supabase } from "@/lib/supabase";

export async function sendPasswordResetLink(email: string) {
  try {
    // Set your deployed reset password page URL here
    const redirectTo = process.env.NEXT_PUBLIC_SUPABASE_RESET_REDIRECT_URL || "http://localhost:3000/reset-password";
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      console.error("Supabase error:", error.message);
      return { success: false, error: error.message || "Failed to send password reset link. The email may not be registered." };
    }
    return { success: true };
  } catch (error: any) {
    console.error("Failed to send password reset email:", error);
    return { success: false, error: error?.message || "Failed to send password reset link. The email may not be registered." };
  }
}
