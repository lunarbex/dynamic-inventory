"use client";

import { useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export function useAuth() {
  // auth.currentUser is populated synchronously from SDK cache for returning users.
  // This avoids the loading flash entirely on repeat visits.
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(auth.currentUser === null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signIn(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function signUp(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  }

  async function logOut() {
    return signOut(auth);
  }

  return { user, loading, signIn, signUp, signInWithGoogle, logOut };
}
