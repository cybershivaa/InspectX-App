
"use server";

import { auth } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";

export async function sendPasswordResetLink(email: string) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to send password reset email:", error);
    // Firebase often returns specific error codes. You could handle these
    // for more specific user feedback if desired.
    // e.g., if (error.code === 'auth/user-not-found') ...
    return { success: false, error: "Failed to send password reset link. The email may not be registered." };
  }
}
