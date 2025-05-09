"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth");
        return;
      }
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const data = userSnap.data();
      if (!data?.displayName || !data?.fitnessLevel) {
        router.push("/profile-setup");
      } else {
        router.push("/dashboard");
      }
    });
    setLoading(false);
    return () => unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-black">
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200 text-center">
        載入中...
      </div>
    </div>
  );
}
