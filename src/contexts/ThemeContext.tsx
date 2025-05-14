import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const ThemeContext = createContext({
  theme: "bw",
  setTheme: (theme: "bw" | "pastel") => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<"bw" | "pastel">("bw");

  useEffect(() => {
    async function fetchTheme() {
      if (!user) return;
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && userSnap.data().theme) {
        setThemeState(userSnap.data().theme);
        document.documentElement.className = `theme-${userSnap.data().theme}`;
      } else {
        setThemeState("bw");
        document.documentElement.className = "theme-bw";
      }
    }
    fetchTheme();
  }, [user]);

  const setTheme = async (t: "bw" | "pastel") => {
    setThemeState(t);
    document.documentElement.className = `theme-${t}`;
    if (user) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { theme: t });
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext); 