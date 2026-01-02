

"use server";

import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, Timestamp, orderBy } from "firebase/firestore";
import type { Machine, Inspection, User } from "@/lib/types";

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


export async function getMachines(): Promise<Machine[]> {
  const machinesSnapshot = await getDocs(collection(db, "machines"));
  return machinesSnapshot.docs.map(doc => ({ id: doc.id, ...serializeTimestamps(doc.data()) })) as Machine[];
}

export async function getInspections(): Promise<Inspection[]> {
  const inspectionsQuery = query(collection(db, "inspections"), orderBy("createdAt", "desc"));
  const inspectionsSnapshot = await getDocs(inspectionsQuery);
  return inspectionsSnapshot.docs.map(doc => ({ id: doc.id, ...serializeTimestamps(doc.data()) })) as Inspection[];
}

export async function getInspectionsByMachineId(machineId: string): Promise<Inspection[]> {
    const q = query(collection(db, "inspections"), where("machineId", "==", machineId));
    const inspectionsSnapshot = await getDocs(q);
    return inspectionsSnapshot.docs.map(doc => ({ id: doc.id, ...serializeTimestamps(doc.data()) })) as Inspection[];
}

export async function getUsers(): Promise<User[]> {
  const usersSnapshot = await getDocs(collection(db, "users"));
  return usersSnapshot.docs.map(doc => ({ id: doc.id, ...serializeTimestamps(doc.data()) })) as User[];
}

export async function getInspectors(): Promise<User[]> {
  const q = query(collection(db, "users"), where("role", "==", "Inspector"));
  const inspectorsSnapshot = await getDocs(q);
  return inspectorsSnapshot.docs.map(doc => ({ id: doc.id, ...serializeTimestamps(doc.data()) })) as User[];
}

    