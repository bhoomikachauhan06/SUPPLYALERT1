"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, updateProfile, User } from "firebase/auth";
import axios from "axios";

// Standard client-side firebase config (needs env vars)
// Demo mode gracefully handles missing keys
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Axios instance configured for cross-origin cookies
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000/api",
  withCredentials: true,
});

interface AuthContextType {
  user: User | null;
  dbUser: any | null; // The profile from our Express backend
  loading: boolean;
  login: (e: string, p: string) => Promise<void>;
  register: (e: string, p: string, n: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Synchronize Firebase auth state with backend httpOnly cookie
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Get Firebase token and send to backend to establish HTTP-only session
          const token = await firebaseUser.getIdToken();
          const { data } = await api.post("/auth/login", { idToken: token });
          setDbUser(data.data);
        } catch (error) {
          console.error("Backend auth sync failed:", error);
        }
      } else {
        setDbUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, pass: string) => {
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      await signInWithEmailAndPassword(auth, email, pass);
    } else {
      // Demo mode fallback
      setDbUser({ name: "Demo User", email, role: "ADMIN" });
    }
  };

  const register = async (email: string, pass: string, name: string) => {
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      // 1. Create in backend first so Firestore profile is created
      await api.post("/auth/register", { email, password: pass, name });
      
      // 2. Sign in on client
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, { displayName: name });
    } else {
      setDbUser({ name, email, role: "ADMIN" });
    }
  };

  const logout = async () => {
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      await firebaseSignOut(auth);
      await api.post("/auth/logout");
    } else {
      setDbUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, dbUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
