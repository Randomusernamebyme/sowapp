"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, arrayRemove } from "firebase/firestore";
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

export default function TeamDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTeam() {
      if (!user) return;
      
      try {
        const teamDoc = await getDoc(doc(db, "teams", id as string));
        if (!teamDoc.exists()) {
          router.push("/teams");
          return;
        }
        setTeam({ id: teamDoc.id, ...teamDoc.data() } as Team);
      } catch (err) {
        console.error("載入團隊失敗:", err);
      } finally {
        setLoading(false);
      }
    }

    loadTeam();
  }, [user, id, router]);

  async function handleLeaveTeam() {
    if (!user || !team) return;
    
    setLeaving(true);
    setError("");

    try {
      // 檢查是否是最後一個成員
      if (team.members.length <= 1) {
        setError("你是團隊最後一個成員，請先轉移團隊管理權或解散團隊");
        setLeaving(false);
        return;
      }

      // 從團隊成員列表中移除
      await updateDoc(doc(db, "teams", team.id), {
        members: arrayRemove({
          userId: user.uid,
          role: team.members.find((m: any) => m.userId === user.uid)?.role || "D",
          status: "active"
        })
      });

      // 從用戶的團隊列表中移除
      await updateDoc(doc(db, "users", user.uid), {
        teams: arrayRemove(team.id)
      });

      router.push("/teams");
    } catch (err) {
      console.error("離開團隊失敗:", err);
      setError("離開團隊失敗，請稍後再試");
    } finally {
      setLeaving(false);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <p className="text-gray-600">請先登入以查看團隊</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <p className="text-gray-600">載入中...</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <p className="text-gray-600">找不到團隊</p>
        <Link href="/teams" className="mt-4 text-black hover:underline">
          返回團隊列表
        </Link>
      </div>
    );
  }

  const isMember = team.members.some((m: any) => m.userId === user.uid);
  if (!isMember) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <p className="text-gray-600">你不是這個團隊的成員</p>
        <Link href="/teams" className="mt-4 text-black hover:underline">
          返回團隊列表
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-black">{team.name}</h1>
          <Link
            href="/teams"
            className="text-gray-600 hover:text-black transition"
          >
            返回團隊列表
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-black mb-4">團隊資訊</h2>
          <div className="space-y-2">
            <p className="text-gray-600">
              團隊 ID：{team.id}
            </p>
            <p className="text-gray-600">
              邀請碼：{team.inviteCode}
            </p>
            <p className="text-gray-600">
              成員數：{team.members?.length || 0}
            </p>
            <p className="text-gray-600">
              進行中任務：{team.activeMission ? "是" : "否"}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-black mb-4">成員列表</h2>
          <div className="space-y-4">
            {team.members?.map((member: any) => (
              <div
                key={member.userId}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
              >
                <div>
                  <p className="text-black font-medium">
                    {member.userId === user.uid ? "你" : "成員"}
                  </p>
                  <p className="text-gray-600 text-sm">
                    角色：{member.role}
                  </p>
                </div>
                <p className="text-gray-600 text-sm">
                  狀態：{member.status}
                </p>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-sm text-center mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleLeaveTeam}
          disabled={leaving}
          className="w-full bg-red-500 text-white py-3 rounded-xl font-semibold shadow hover:bg-red-600 transition disabled:opacity-50"
        >
          {leaving ? "離開中..." : "離開團隊"}
        </button>
      </div>
    </div>
  );
} 