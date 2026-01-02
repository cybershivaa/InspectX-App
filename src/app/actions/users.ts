
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc, addDoc, collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import type { User, Role, PendingUser } from "@/lib/types";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";

// Helper function to safely convert Firestore Timestamps to strings in nested objects
const serializeTimestamps = (docData: any) => {
    if (!docData) return docData;
    const data = { ...docData };
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate().toISOString();
        } else if (data[key] && typeof data[key] === 'object' && !Array.isArray(data[key])) {
            data[key] = serializeTimestamps(data[key]);
        }
    }
    return data;
};

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

    const userDocRef = doc(db, "users", userId);

    const updatedData: { name: string; avatar?: string } = { name };
    if (avatar) {
      updatedData.avatar = avatar;
    }

    await setDoc(userDocRef, updatedData, { merge: true });

    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
        return { success: false, error: "User not found after update." };
    }
    const updatedUser = {id: userDoc.id, ...userDoc.data()} as User;
    
    revalidatePath("/profile");
    revalidatePath("/", "layout"); 

    return { success: true, data: updatedUser };
  } catch (error) {
    console.error("Failed to update user profile:", error);
    return { success: false, error: "An unexpected error occurred while updating the profile." };
  }
}


const updateUserRoleSchema = z.object({
  userId: z.string(),
  role: z.enum(["Admin", "Inspector", "Client"]),
});

export async function updateUserRole(userId: string, role: Role) {
  try {
    const validationResult = updateUserRoleSchema.safeParse({ userId, role });
    if (!validationResult.success) {
      return { success: false, error: "Invalid input data." };
    }

    const userDocRef = doc(db, "users", userId);
    await setDoc(userDocRef, { role }, { merge: true });

    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
        return { success: false, error: "User not found after update." };
    }
    const updatedUser = {id: userDoc.id, ...userDoc.data()} as User;

    revalidatePath("/admin");

    return { success: true, data: updatedUser };
  } catch (error) {
    console.error("Failed to update user role:", error);
    return { success: false, error: "An unexpected error occurred while updating the user role." };
  }
}

export async function deleteUser(userId: string) {
   try {
    if (!userId) {
      return { success: false, error: "User ID is required." };
    }

    const userDocRef = doc(db, "users", userId);
    await deleteDoc(userDocRef);

    // This would be where you use the Admin SDK to delete the auth user
    // await serverAuth.deleteUser(userId);

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete user:", error);
    return { success: false, error: "An unexpected error occurred while deleting the user." };
  }
}

const signupRequestSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.string().email("Please enter a valid email address."),
  role: z.enum(["Inspector", "Client"]),
});

export async function requestSignup(values: z.infer<typeof signupRequestSchema>) {
  try {
    const validationResult = signupRequestSchema.safeParse(values);
    if (!validationResult.success) {
      return { success: false, error: "Invalid data." };
    }

    // Check if a user with this email already exists
    const userQuery = query(collection(db, "users"), where("email", "==", values.email));
    const userSnapshot = await getDocs(userQuery);
    if (!userSnapshot.empty) {
        return { success: false, error: "A user with this email already exists." };
    }

    // Check if a pending request with this email already exists
    const pendingQuery = query(collection(db, "pendingUsers"), where("email", "==", values.email));
    const pendingSnapshot = await getDocs(pendingQuery);
    if (!pendingSnapshot.empty) {
        return { success: false, error: "A registration request for this email is already pending." };
    }

    await addDoc(collection(db, "pendingUsers"), {
      ...validationResult.data,
      status: 'pending',
      requestedAt: Timestamp.now(),
    });

    return { success: true };
  } catch (error) {
    console.error("Signup request failed:", error);
    return { success: false, error: "An unexpected error occurred during signup." };
  }
}

export async function getPendingUsers(): Promise<PendingUser[]> {
  const q = query(collection(db, "pendingUsers"), where("status", "==", "pending"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...serializeTimestamps(doc.data())
  })) as PendingUser[];
}

const approveUserSchema = z.object({
  requestId: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(["Inspector", "Client", "Admin"]),
  password: z.string().min(8, "Password must be at least 8 characters.")
});

export async function approveUser(data: z.infer<typeof approveUserSchema>) {
  try {
    const validationResult = approveUserSchema.safeParse(data);
    if (!validationResult.success) {
      return { success: false, error: "Invalid data provided." };
    }

    // Get pending user data first
    const pendingDocRef = doc(db, "pendingUsers", data.requestId);
    const pendingDoc = await getDoc(pendingDocRef);
    
    if (!pendingDoc.exists()) {
      return { success: false, error: "Pending user request not found." };
    }

    // Since we can't create Firebase Auth users from server actions directly,
    // we'll create the user document and let the seed script handle auth creation
    // In production, use Firebase Admin SDK here
    
    const newUserId = `approved-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const newUser: User = {
      id: newUserId,
      name: data.name,
      email: data.email,
      role: data.role,
      avatar: '',
      tempPassword: data.password, // Store temporarily for the seed script
    };
    
    const userDocRef = doc(db, "users", newUserId);
    await setDoc(userDocRef, newUser);
    
    // Delete the pending request
    await deleteDoc(pendingDocRef);
    
    revalidatePath("/admin");
    return { 
      success: true, 
      data: newUser,
      message: `User approved. Run: npm run create-auth ${newUserId} to create Firebase Auth account.`
    };
  } catch (error) {
    console.error("Failed to approve user:", error);
    return { success: false, error: "An unexpected error occurred while approving the user." };
  }
}

export async function rejectUser(requestId: string) {
  try {
    if (!requestId) {
      return { success: false, error: "Request ID is required." };
    }
    
    const pendingUserDocRef = doc(db, "pendingUsers", requestId);
    await deleteDoc(pendingUserDocRef);

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to reject user:", error);
    return { success: false, error: "An unexpected error occurred while rejecting the user." };
  }
}
