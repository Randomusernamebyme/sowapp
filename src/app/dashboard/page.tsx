"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function DashboardPage() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth");
        return;
      }
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setUserData(userSnap.data());
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-black">載入中...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
        <h1 className="text-2xl font-bold mb-4 text-black tracking-tight">歡迎，{userData?.displayName || "用戶"}！</h1>
        <div className="mb-6 space-y-1">
          <div className="text-gray-700">體能等級：<span className="font-semibold text-black">{userData?.fitnessLevel || "未設定"}</span></div>
          <div className="text-gray-700">Email：<span className="font-semibold text-black">{userData?.email}</span></div>
        </div>
        <div className="flex flex-col gap-4">
          <button
            className="w-full bg-black text-white py-3 rounded-xl font-semibold shadow hover:bg-gray-800 transition"
            onClick={() => router.push("/missions")}
          >
            開始新任務
          </button>
          <button
            className="w-full bg-gray-200 text-black py-3 rounded-xl font-semibold shadow hover:bg-gray-300 transition"
            onClick={() => router.push("/teams")}
          >
            加入/創建團隊
          </button>
        </div>
      </div>
    </div>
  );
} 