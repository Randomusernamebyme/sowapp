"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

interface Team {
  id: string;
  name: string;
  members: { userId: string; role: string; status: string }[];
  activeMission?: string;
  completedMissions?: string[];
  createdAt?: any;
}

export default function TeamDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeam() {
      if (!id) return;
      const teamSnap = await getDoc(doc(db, "teams", id as string));
      if (teamSnap.exists()) {
        setTeam({ id: teamSnap.id, ...teamSnap.data() } as Team);
      }
      setLoading(false);
    }
    fetchTeam();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-black">載入中...</div>;
  }
  if (!team) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-400">找不到團隊資料</div>;
  }

  const isMember = team.members.some(m => m.userId === user?.uid);

  return (
    <div className="min-h-screen flex flex-col items-center bg-white pt-8">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-black mb-2">{team.name}</h1>
        <div className="mb-4 text-gray-600">團隊 ID：{team.id}</div>
        <div className="mb-6">
          <div className="font-semibold text-black mb-2">成員列表</div>
          <ul className="space-y-2">
            {team.members.map((m, idx) => (
              <li key={m.userId + idx} className="flex items-center gap-2 text-gray-700">
                <span className="font-mono text-xs bg-gray-100 rounded px-2 py-1">{m.userId}</span>
                <span className="text-black font-semibold">角色：{m.role || "-"}</span>
                <span className="text-xs text-gray-400">({m.status})</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mb-6">
          <div className="font-semibold text-black mb-2">進行中任務</div>
          <div className="text-gray-700">{team.activeMission ? team.activeMission : "無"}</div>
        </div>
        <div className="mb-6">
          <div className="font-semibold text-black mb-2">歷史任務</div>
          <div className="text-gray-700">{team.completedMissions && team.completedMissions.length > 0 ? team.completedMissions.join(", ") : "無"}</div>
        </div>
        {isMember && (
          <button
            className="w-full bg-gray-200 text-black py-3 rounded-xl font-semibold shadow hover:bg-gray-300 transition"
            onClick={() => router.push("/teams")}
          >
            離開團隊（功能待開發）
          </button>
        )}
      </div>
    </div>
  );
} 