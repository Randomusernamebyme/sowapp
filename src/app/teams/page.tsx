"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, getDoc, doc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

interface Team {
  id: string;
  name: string;
  members: { userId: string; role: string; status: string }[];
  activeMission?: string;
  completedMissions?: string[];
  inviteCode: string;
  createdAt?: any;
}

export default function TeamsPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [userDisplayNames, setUserDisplayNames] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadTeams() {
      if (!user) return;
      
      try {
        // 獲取所有團隊
        const snap = await getDocs(collection(db, "teams"));
        // 在前端過濾出用戶所屬的團隊
        const teamsData = snap.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Team))
          .filter(team => team.members?.some(member => member.userId === user.uid));
        
        setTeams(teamsData);
        // 取得所有成員的 displayName
        const userIds = Array.from(new Set(teamsData.flatMap(team => team.members.map(m => m.userId))));
        const displayNames: Record<string, string> = {};
        for (const uid of userIds) {
          const userDoc = await getDoc(doc(db, "users", uid));
          if (userDoc.exists()) {
            displayNames[uid] = userDoc.data().displayName || "匿名";
          } else {
            displayNames[uid] = "匿名";
          }
        }
        setUserDisplayNames(displayNames);
      } catch (err) {
        console.error("載入團隊失敗:", err);
      } finally {
        setLoading(false);
      }
    }

    loadTeams();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <p className="text-gray-600">請先登入以查看團隊</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-black">我的團隊</h1>
          <div className="space-x-4">
            <Link
              href="/teams/join"
              className="inline-block px-4 py-2 bg-gray-100 text-black rounded-xl hover:bg-gray-200 transition"
            >
              加入團隊
            </Link>
            <Link
              href="/teams/create"
              className="inline-block px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition"
            >
              創建團隊
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">載入中...</p>
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">你還沒有加入任何團隊</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {teams.map(team => (
              <div key={team.id} className="block p-6 bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition">
                <h2 className="text-xl font-semibold text-black mb-2">{team.name}</h2>
                <p className="text-gray-600">成員數：{team.members?.length || 0}</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {team.members?.map(member => (
                    <span key={member.userId} className="inline-block px-3 py-1 bg-gray-100 rounded-full text-sm text-black">
                      {userDisplayNames[member.userId] || "匿名"}（{member.role === "A" ? "Leader" : "Member"}）
                    </span>
                  ))}
                </div>
                <p className="text-gray-600">進行中任務：{team.activeMission ? "是" : "否"}</p>
                <div className="mt-3 space-x-2">
                  {team.activeMission && (
                    <Link
                      href={`/missions/${team.activeMission}/active?teamId=${team.id}`}
                      className="inline-block px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition"
                    >
                      繼續任務
                    </Link>
                  )}
                  <Link
                    href={`/teams/${team.id}`}
                    className="inline-block px-4 py-2 bg-gray-100 text-black rounded-xl hover:bg-gray-200 transition"
                  >
                    查看詳情
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 