"use client";

import React, { createContext, useContext, useEffect, useState, useLayoutEffect } from "react";
import { useAuth } from "./AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";

const ThemeContext = createContext({
  theme: "bw",
  setTheme: (theme: "bw" | "pastel") => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<"bw" | "pastel">("bw");

  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    // 監聽 Firestore user 資料
    const unsub = onSnapshot(userRef, (userSnap) => {
      if (userSnap.exists() && userSnap.data().theme) {
        setThemeState(userSnap.data().theme);
        console.log("[ThemeContext] onSnapshot user theme:", userSnap.data().theme);
      } else {
        setThemeState("bw");
        console.log("[ThemeContext] 預設 theme-bw");
      }
    });
    return () => unsub();
  }, [user]);

  useLayoutEffect(() => {
    document.documentElement.className = `theme-${theme}`;
  }, [theme]);

  const setTheme = async (t: "bw" | "pastel") => {
    setThemeState(t);
    console.log("[ThemeContext] setTheme called:", t);
    if (user) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { theme: t });
      console.log("[ThemeContext] theme 寫入 Firestore:", t);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext); 