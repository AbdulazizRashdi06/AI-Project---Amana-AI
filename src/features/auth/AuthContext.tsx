import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, assertFirebaseConfigured, db } from "@/firebase/config";
import { emailSchema, passwordSchema } from "@/lib/validation";
import type { UserProfile } from "@/types/domain";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function ensureUserProfile(user: User, displayName?: string | null) {
  const profileRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(profileRef);

  if (!snapshot.exists()) {
    await setDoc(profileRef, {
      uid: user.uid,
      email: user.email,
      displayName: displayName ?? user.displayName ?? null,
      role: "user",
      campusId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

async function loadUserProfile(user: User | null): Promise<UserProfile | null> {
  if (!user) {
    return null;
  }

  await ensureUserProfile(user);
  const profileRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(profileRef);
  return snapshot.exists() ? ({ ...snapshot.data(), uid: user.uid } as UserProfile) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      try {
        setProfile(await loadUserProfile(nextUser));
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      async signIn(email, password) {
        assertFirebaseConfigured();
        emailSchema.parse(email);
        passwordSchema.parse(password);
        const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
        await ensureUserProfile(credential.user);
      },
      async signUp(email, password, displayName) {
        assertFirebaseConfigured();
        emailSchema.parse(email);
        passwordSchema.parse(password);
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(credential.user, { displayName });
        await ensureUserProfile(credential.user, displayName);
      },
      async resetPassword(email) {
        assertFirebaseConfigured();
        emailSchema.parse(email);
        await sendPasswordResetEmail(auth, email.trim());
      },
      async signOutUser() {
        await signOut(auth);
      },
    }),
    [loading, profile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
