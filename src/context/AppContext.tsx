
"use client";

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import type { User, Role } from '@/lib/types';
import { auth, db } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";

interface AppContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<User | null>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: User) => void;
}

export const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() } as User;
            
            // Fix placeholder avatars - if avatar is a placeholder URL, replace with empty string
            if (userData.avatar && userData.avatar.includes('placehold.co')) {
              userData.avatar = '';
              // Update in database
              await setDoc(userDocRef, { avatar: '' }, { merge: true });
            }
            
            setUser(userData);
          } else {
             // This case is less likely with the new approval flow, but good as a fallback.
             const newUser: User = {
               id: firebaseUser.uid,
               name: firebaseUser.displayName || 'New User',
               email: firebaseUser.email!,
               role: 'Client', // Default role
               avatar: ''
             }
             await setDoc(userDocRef, newUser);
             setUser(newUser);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password?: string): Promise<User | null> => {
    if (!password) throw new Error("Password is required.");
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            const appUser = {id: userDoc.id, ...userDoc.data()} as User;
            setUser(appUser);
            return appUser;
        } else {
            // This could happen if the Firestore doc creation fails after auth creation
            throw new Error("User data not found in database.");
        }
    } catch (error: any) {
        // Fallback for mock users if Firebase Auth fails
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/network-request-failed') {
             console.warn("Login with Firebase Auth failed. Checking Firestore for mock user.");
             try {
                 const usersRef = collection(db, "users");
                 const q = query(usersRef, where("email", "==", email));
                 const querySnapshot = await getDocs(q);

                 if (!querySnapshot.empty) {
                    const userDoc = querySnapshot.docs[0];
                    const appUser = {id: userDoc.id, ...userDoc.data()} as User;
                    console.log(`Mock login successful for ${appUser.name}`);
                    setUser(appUser);
                    return appUser;
                 } else {
                    // No mock user found either, so throw a clearer error.
                    throw new Error("User not found");
                 }
             } catch (dbError) {
                 console.error("Mock user lookup failed:", dbError);
                 // Propagate the original error if mock lookup fails
                 throw error;
             }
        }
        // Re-throw other errors to be caught by the form handler
        throw error;
    }
  };
  
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AppContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AppContext.Provider>
  );
}
