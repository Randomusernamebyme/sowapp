"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function MissionsPage() {
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchMissions() {
      const querySnapshot = await getDocs(collection(db, "missions"));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMissions(data);
      setLoading(false);
    }
    fetchMissions();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center bg-white pt-8">
      <h1 className="text-2xl font-bold mb-6 text-black tracking-tight">任務列表</h1>
      {loading ? (
        <div className="text-gray-500">載入中...</div>
      ) : missions.length === 0 ? (
        <div className="text-gray-400">目前沒有任務</div>
      ) : (
        <div className="w-full max-w-xl space-y-4">
          {missions.map(mission => (
            <button
              key={mission.id}
              className="w-full text-left bg-white border border-gray-200 rounded-2xl shadow p-6 hover:bg-gray-50 transition flex flex-col gap-2"
              onClick={() => router.push(`/missions/${mission.id}`)}
            >
              <div className="text-lg font-semibold text-black">{mission.title}</div>
              <div className="text-gray-600 text-sm">{mission.description}</div>
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span>難度：{mission.difficulty || "-"}</span>
                <span>預估時間：{mission.estimatedDuration || "-"}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 