"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, arrayRemove, arrayUnion } from "firebase/firestore";
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

const ROLES = ["A", "B", "C", "D"];

export default function TeamDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");
  const [updatingRole, setUpdatingRole] = useState(false);

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

  async function handleUpdateRole(memberId: string, newRole: string) {
    if (!user || !team) return;
    
    setUpdatingRole(true);
    setError("");

    try {
      const member = team.members.find(m => m.userId === memberId);
      if (!member) {
        setError("找不到成員");
        return;
      }

      // 從團隊成員列表中移除舊角色
      await updateDoc(doc(db, "teams", team.id), {
        members: arrayRemove({
          userId: memberId,
          role: member.role,
          status: member.status
        })
      });

      // 加入新角色
      await updateDoc(doc(db, "teams", team.id), {
        members: arrayUnion({
          userId: memberId,
          role: newRole,
          status: member.status
        })
      });

      // 更新本地狀態
      setTeam(prev => {
        if (!prev) return null;
        return {
          ...prev,
          members: prev.members.map(m => 
            m.userId === memberId ? { ...m, role: newRole } : m
          )
        };
      });
    } catch (err) {
      console.error("更新角色失敗:", err);
      setError("更新角色失敗，請稍後再試");
    } finally {
      setUpdatingRole(false);
    }
  }

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
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <span className="text-gray-600">團隊 ID</span>
              <span className="text-black font-mono">{team.id}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <span className="text-gray-600">邀請碼</span>
              <span className="text-black font-mono">{team.inviteCode}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <span className="text-gray-600">成員數</span>
              <span className="text-black">{team.members?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <span className="text-gray-600">進行中任務</span>
              <span className="text-black">{team.activeMission ? "是" : "否"}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-black mb-4">成員列表</h2>
          <div className="space-y-3">
            {team.members?.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-black font-medium">
                      {member.userId === user?.uid ? "你" : "成"}
                    </span>
                  </div>
                  <div>
                    <p className="text-black font-medium">
                      {member.userId === user?.uid ? "你" : "成員"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member.userId, e.target.value)}
                        disabled={updatingRole || member.userId !== user?.uid}
                        className="text-sm bg-white border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-black"
                      >
                        {ROLES.map(role => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 text-sm">狀態</span>
                  <span className="text-black text-sm">{member.status}</span>
                </div>
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
          className="w-full bg-black text-white py-3 rounded-xl font-semibold shadow hover:bg-gray-800 transition disabled:opacity-50"
        >
          {leaving ? "離開中..." : "離開團隊"}
        </button>
      </div>
    </div>
  );
} 