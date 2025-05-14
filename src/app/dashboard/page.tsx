"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, getDocs, collection, onSnapshot, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

interface Team {
  id: string;
  name: string;
  activeMission?: string;
  missionProgress?: any;
  members: any[];
  completedMissions: string[];
  completedMissionProgress?: Array<{
    missionId: string;
    completedAt: any;
  }>;
}

export default function DashboardPage() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();
  const [activeTeamMissions, setActiveTeamMissions] = useState<any[]>([]);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [completedMissions, setCompletedMissions] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [missionCheckpoints, setMissionCheckpoints] = useState<Record<string, number>>({});

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
    async function fetchUserData() {
      if (!user) return;
      
      // 取得用戶的團隊
      const teamSnap = await getDocs(collection(db, "teams"));
      const teams = teamSnap.docs
        .filter(doc => doc.data().members.some((m: any) => m.userId === user.uid))
        .map(doc => ({
          id: doc.id,
          name: doc.data().name,
          activeMission: doc.data().activeMission,
          missionProgress: doc.data().missionProgress,
          members: doc.data().members,
          completedMissions: doc.data().completedMissions || [],
          completedMissionProgress: doc.data().completedMissionProgress || []
        } as Team));
      setUserTeams(teams);

      // 取得進行中的任務
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

      // 取得已完成的任務
      const completed: any[] = [];
      for (const team of teams) {
        if (team.completedMissions?.length > 0) {
          for (const missionId of team.completedMissions) {
            const missionDoc = await getDoc(doc(db, "missions", missionId));
            if (missionDoc.exists()) {
              completed.push({
                teamId: team.id,
                teamName: team.name,
                missionId,
                missionTitle: missionDoc.data().title,
                completedAt: team.completedMissionProgress?.find((p: any) => p.missionId === missionId)?.completedAt
              });
            }
          }
        }
      }
      setCompletedMissions(completed);

      // 取得最近活動
      const activities = [...completed].sort((a, b) => 
        (b.completedAt?.toDate?.() || b.completedAt) - (a.completedAt?.toDate?.() || a.completedAt)
      ).slice(0, 5);
      setRecentActivities(activities);
    }
    fetchUserData();
  }, [user]);

  useEffect(() => {
    async function fetchCheckpoints() {
      const result: Record<string, number> = {};
      for (const m of activeTeamMissions) {
        if (m.missionId) {
          const q = query(collection(db, "checkpoints"), where("missionId", "==", m.missionId));
          const cpSnap = await getDocs(q);
          result[m.missionId] = cpSnap.size;
        }
      }
      setMissionCheckpoints(result);
    }
    if (activeTeamMissions.length > 0) fetchCheckpoints();
  }, [activeTeamMissions]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)]">載入中...</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 用戶資訊卡片 */}
        <div className="bg-[var(--color-card)] rounded-2xl shadow-lg p-6 border border-gray-200">
          <h1 className="text-2xl font-bold mb-4 text-[var(--color-text)] tracking-tight">歡迎，{userData?.displayName || "用戶"}！</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[var(--color-secondary)] p-4 rounded-xl">
              <div className="text-[var(--color-text)] text-sm">積分</div>
              <div className="text-2xl font-bold text-[var(--color-text)]">{userData?.points || 0}</div>
            </div>
            <div className="bg-[var(--color-secondary)] p-4 rounded-xl">
              <div className="text-[var(--color-text)] text-sm">完成任務</div>
              <div className="text-2xl font-bold text-[var(--color-text)]">{completedMissions.length}</div>
            </div>
            <div className="bg-[var(--color-secondary)] p-4 rounded-xl">
              <div className="text-[var(--color-text)] text-sm">加入團隊</div>
              <div className="text-2xl font-bold text-[var(--color-text)]">{userTeams.length}</div>
            </div>
            <div className="bg-[var(--color-secondary)] p-4 rounded-xl">
              <div className="text-[var(--color-text)] text-sm">體能等級</div>
              <div className="text-2xl font-bold text-[var(--color-text)]">{userData?.fitnessLevel || "未設定"}</div>
            </div>
          </div>
        </div>

        {/* 快速操作按鈕 */}
        <div className="space-y-4">
          <button
            className="w-full bg-[var(--color-primary)] text-[var(--color-bg)] py-3 rounded-xl font-semibold shadow hover:bg-[var(--color-accent)] transition"
            onClick={() => router.push("/missions")}
          >
            開始新任務
          </button>
          <button
            className="w-full bg-[var(--color-secondary)] text-[var(--color-text)] py-3 rounded-xl font-semibold shadow hover:bg-gray-300 transition"
            onClick={() => router.push("/teams")}
          >
            加入/創建團隊
          </button>
        </div>

        {/* 進行中任務 */}
        {activeTeamMissions.length > 0 && (
          <div className="bg-[var(--color-card)] rounded-2xl shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-[var(--color-text)] mb-4">進行中任務</h2>
            <div className="space-y-4">
              {activeTeamMissions.map(m => {
                const total = missionCheckpoints[m.missionId] || 0;
                const done = m.missionProgress.completedCheckpoints?.length || 0;
                const percent = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={m.teamId} className="bg-[var(--color-secondary)] p-4 rounded-xl">
                    <div className="text-[var(--color-text)] font-semibold">{m.teamName}</div>
                    <div className="text-[var(--color-text)]">任務：{m.missionTitle}</div>
                    <div className="text-[var(--color-text)] text-sm mb-2 flex items-center gap-2">
                      進度：{done} / {total} 檢查點
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden mx-2" style={{ minWidth: 60 }}>
                        <div className="h-2 bg-[var(--color-primary)] rounded-full transition-all duration-300" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="text-xs text-[var(--color-text)]">{percent}%</span>
                    </div>
                    <button
                      onClick={() => router.push(`/missions/${m.missionId}/active?teamId=${m.teamId}`)}
                      className="inline-block px-4 py-2 bg-[var(--color-primary)] text-[var(--color-bg)] rounded-xl hover:bg-[var(--color-accent)] transition"
                    >
                      繼續任務
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 我的團隊 */}
        {userTeams.length > 0 && (
          <div className="bg-[var(--color-card)] rounded-2xl shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-[var(--color-text)] mb-4">我的團隊</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {userTeams.map(team => (
                <div 
                  key={team.id} 
                  className="bg-[var(--color-secondary)] p-4 rounded-xl cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => router.push(`/teams/${team.id}`)}
                >
                  <div className="text-[var(--color-text)] font-semibold">{team.name}</div>
                  <div className="text-[var(--color-text)] text-sm">
                    成員數：{team.members?.length || 0}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 最近活動 */}
        {recentActivities.length > 0 && (
          <div className="bg-[var(--color-card)] rounded-2xl shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-[var(--color-text)] mb-4">最近活動</h2>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div 
                  key={index} 
                  className="bg-[var(--color-secondary)] p-4 rounded-xl cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => router.push(`/missions/${activity.missionId}/complete?teamId=${activity.teamId}`)}
                >
                  <div className="text-[var(--color-text)] font-semibold">{activity.missionTitle}</div>
                  <div className="text-[var(--color-text)] text-sm">
                    團隊：{activity.teamName}
                  </div>
                  <div className="text-[var(--color-text)] text-sm">
                    完成時間：{activity.completedAt?.toDate?.().toLocaleString() || "未知"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 