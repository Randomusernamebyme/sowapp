"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, getDoc, doc, query, where } from "firebase/firestore";
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
  missionProgress?: any;
  completedMissionProgress?: Array<{
    missionId: string;
    completedAt: any;
    collectedDigits: number[];
    completedCheckpoints: string[];
  }>;
}

interface Mission {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  estimatedDuration: string;
  imageUrl?: string;
}

export default function TeamsPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [userDisplayNames, setUserDisplayNames] = useState<Record<string, string>>({});
  const [teamStats, setTeamStats] = useState<Record<string, any>>({});
  const [recentMissions, setRecentMissions] = useState<Array<{
    teamId: string;
    teamName: string;
    missionId: string;
    missionTitle: string;
    completedAt: any;
  }>>([]);
  const [missionCheckpoints, setMissionCheckpoints] = useState<Record<string, number>>({});

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

        // 計算團隊統計資料
        const stats: Record<string, any> = {};
        for (const team of teamsData) {
          const completedMissions = team.completedMissionProgress || [];
          const activeMission = team.activeMission;
          const missionProgress = team.missionProgress || {};
          
          stats[team.id] = {
            totalMissions: completedMissions.length + (activeMission ? 1 : 0),
            completedMissions: completedMissions.length,
            activeMission: activeMission ? {
              id: activeMission,
              progress: missionProgress.completedCheckpoints?.length || 0,
              totalCheckpoints: missionProgress.checkpoints?.length || 0
            } : null,
            lastCompletedMission: completedMissions.length > 0 ? completedMissions[completedMissions.length - 1] : null
          };
        }
        setTeamStats(stats);

        // 獲取最近完成的任務
        const recentMissionsData: Array<{
          teamId: string;
          teamName: string;
          missionId: string;
          missionTitle: string;
          completedAt: any;
        }> = [];

        for (const team of teamsData) {
          if (team.completedMissionProgress) {
            for (const progress of team.completedMissionProgress) {
              const missionDoc = await getDoc(doc(db, "missions", progress.missionId));
              if (missionDoc.exists()) {
                recentMissionsData.push({
                  teamId: team.id,
                  teamName: team.name,
                  missionId: progress.missionId,
                  missionTitle: missionDoc.data().title,
                  completedAt: progress.completedAt
                });
              }
            }
          }
        }

        // 按完成時間排序
        recentMissionsData.sort((a, b) => {
          const aDate = typeof a.completedAt?.toDate === 'function' ? a.completedAt.toDate() : new Date(a.completedAt);
          const bDate = typeof b.completedAt?.toDate === 'function' ? b.completedAt.toDate() : new Date(b.completedAt);
          return bDate.getTime() - aDate.getTime();
        });
        // 只取最近5個任務
        setRecentMissions(recentMissionsData.slice(0, 5));
      } catch (err) {
        console.error("載入團隊失敗:", err);
      } finally {
        setLoading(false);
      }
    }

    loadTeams();
  }, [user]);

  useEffect(() => {
    async function fetchCheckpoints() {
      const result: Record<string, number> = {};
      for (const team of teams) {
        if (team.activeMission) {
          const q = query(collection(db, "checkpoints"), where("missionId", "==", team.activeMission));
          const cpSnap = await getDocs(q);
          result[team.activeMission] = cpSnap.size;
        }
      }
      setMissionCheckpoints(result);
    }
    if (teams.length > 0) fetchCheckpoints();
  }, [teams]);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] p-4">
        <p className="text-[var(--color-text)]">請先登入以查看團隊</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)]">
        載入中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">我的團隊</h1>
          <Link
            href="/teams/create"
            className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-bg)] rounded-xl hover:bg-[var(--color-accent)] transition"
          >
            創建新團隊
          </Link>
        </div>

        {teams.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--color-text)] mb-4">你還沒有加入任何團隊</p>
            <Link
              href="/teams/create"
              className="inline-block px-4 py-2 bg-[var(--color-primary)] text-[var(--color-bg)] rounded-xl hover:bg-[var(--color-accent)] transition"
            >
              創建第一個團隊
            </Link>
          </div>
        ) : (
          <>
            {/* 最近完成任務 */}
            {recentMissions.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4">最近完成任務</h2>
                <div className="space-y-4">
                  {recentMissions.map((mission, index) => (
                    <div
                      key={index}
                      className="bg-[var(--color-card)] p-4 rounded-xl shadow-lg border border-gray-200"
                    >
                      <div className="text-[var(--color-text)] font-semibold">{mission.missionTitle}</div>
                      <div className="text-[var(--color-text)] text-sm">
                        團隊：{mission.teamName}
                      </div>
                      <div className="text-[var(--color-text)] text-sm">
                        完成時間：{typeof mission.completedAt?.toDate === 'function' ? mission.completedAt.toDate().toLocaleString() : (mission.completedAt ? new Date(mission.completedAt).toLocaleString() : "未知")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 團隊列表 */}
            <div className="grid gap-6 md:grid-cols-2">
              {teams.map(team => (
                <div key={team.id} className="block p-6 bg-[var(--color-card)] rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--color-text)]">{team.name}</h3>
                      <p className="text-[var(--color-text)] text-sm">
                        成員數：{team.members?.length || 0}
                      </p>
                    </div>
                    <div className="text-[var(--color-text)] text-sm">
                      創建於：{team.createdAt?.toDate?.().toLocaleDateString() || "未知"}
                    </div>
                  </div>

                  {/* 當前任務進度 */}
                  {teamStats[team.id]?.activeMission && team.activeMission && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-[var(--color-text)] mb-2">當前任務進度</h3>
                      <div className="w-full bg-[var(--color-secondary)] rounded-full h-2">
                        <div
                          className="bg-[var(--color-primary)] h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${missionCheckpoints[team.activeMission] ? (teamStats[team.id].activeMission.progress / missionCheckpoints[team.activeMission]) * 100 : 0}%`
                          }}
                        />
                      </div>
                      <div className="text-sm text-[var(--color-text)] mt-1">
                        {teamStats[team.id].activeMission.progress} / {missionCheckpoints[team.activeMission] || 0} 檢查點
                      </div>
                    </div>
                  )}

                  {/* 操作按鈕 */}
                  <div className="mt-4 space-x-2">
                    {team.activeMission && (
                      <Link
                        href={`/missions/${team.activeMission}/active?teamId=${team.id}`}
                        className="inline-block px-4 py-2 bg-[var(--color-primary)] text-[var(--color-bg)] rounded-xl hover:bg-[var(--color-accent)] transition"
                      >
                        繼續任務
                      </Link>
                    )}
                    <Link
                      href={`/teams/${team.id}`}
                      className="inline-block px-4 py-2 bg-[var(--color-secondary)] text-[var(--color-text)] rounded-xl hover:bg-gray-200 transition"
                    >
                      查看詳情
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
} 