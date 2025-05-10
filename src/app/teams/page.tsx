"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface Team {
  id: string;
  name: string;
  members: { userId: string; role: string; status: string }[];
  createdAt?: any;
}

export default function TeamsPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchTeams() {
      if (!user) return;
      const q = query(collection(db, "teams"), where("members", "array-contains", { userId: user.uid, role: "", status: "" }));
      // Firestore 不支援 array-contains map，改用前端過濾
      const snap = await getDocs(collection(db, "teams"));
      const data = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Team))
        .filter(team => team.members.some(m => m.userId === user.uid));
      setTeams(data);
      setLoading(false);
    }
    fetchTeams();
  }, [user]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-black">載入中...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-white pt-8">
      <div className="w-full max-w-xl space-y-4">
        <h1 className="text-2xl font-bold text-black mb-4">我的團隊</h1>
        {teams.length === 0 ? (
          <div className="text-gray-400">你目前尚未加入任何團隊</div>
        ) : (
          teams.map(team => (
            <button
              key={team.id}
              className="w-full text-left bg-white border border-gray-200 rounded-2xl shadow p-6 hover:bg-gray-50 transition flex flex-col gap-2"
              onClick={() => router.push(`/teams/${team.id}`)}
            >
              <div className="text-lg font-semibold text-black">{team.name}</div>
              <div className="text-gray-600 text-sm">成員數：{team.members.length}</div>
            </button>
          ))
        )}
        <div className="flex gap-4 mt-6">
          <button
            className="flex-1 bg-black text-white py-3 rounded-xl font-semibold shadow hover:bg-gray-800 transition"
            onClick={() => router.push("/teams/create")}
          >
            創建團隊
          </button>
          <button
            className="flex-1 bg-gray-200 text-black py-3 rounded-xl font-semibold shadow hover:bg-gray-300 transition"
            onClick={() => router.push("/teams/join")}
          >
            加入團隊
          </button>
        </div>
      </div>
    </div>
  );
} 