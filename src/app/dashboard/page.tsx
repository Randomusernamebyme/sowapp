"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, getDocs, collection, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function DashboardPage() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();
  const [activeTeamMissions, setActiveTeamMissions] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth");
        return;
      }
      const userRef = doc(db, "users", user.uid);
      const unsub = onSnapshot(userRef, (userSnap) => {
        if (userSnap.exists()) {
          setUserData(userSnap.data());
        }
        setLoading(false);
      });
      return () => unsub();
    });
  }, [router]);

  useEffect(() => {
    async function fetchActiveMissions() {
      if (!user) return;
      const teamSnap = await getDocs(collection(db, "teams"));
      const teams = teamSnap.docs
        .filter(doc => doc.data().members.some((m: any) => m.userId === user.uid))
        .map(doc => ({
          id: doc.id,
          name: doc.data().name,
          activeMission: doc.data().activeMission,
          missionProgress: doc.data().missionProgress,
          members: doc.data().members
        }));
      const missions: any[] = [];
      for (const team of teams) {
        if (team.activeMission) {
          const missionDoc = await getDoc(doc(db, "missions", team.activeMission));
          if (missionDoc.exists()) {
            missions.push({
              teamId: team.id,
              teamName: team.name,
              missionId: team.activeMission,
              missionTitle: missionDoc.data().title,
              missionProgress: team.missionProgress || {},
            });
          }
        }
      }
      setActiveTeamMissions(missions);
    }
    fetchActiveMissions();
  }, [user]);

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
      {activeTeamMissions.length > 0 && (
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-6 border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-black mb-4">進行中團隊任務</h2>
          {activeTeamMissions.map(m => (
            <div key={m.teamId} className="mb-4">
              <div className="text-black font-semibold">{m.teamName}</div>
              <div className="text-gray-700">任務：{m.missionTitle}</div>
              <div className="text-gray-500 text-sm mb-2">進度：{m.missionProgress.completedCheckpoints?.length || 0} / ?</div>
              <Link
                href={`/missions/${m.missionId}/active?teamId=${m.teamId}`}
                className="inline-block px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition"
              >
                前往任務
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 