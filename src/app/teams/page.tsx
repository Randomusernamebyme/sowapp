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
        recentMissionsData.sort((a, b) => b.completedAt.toDate() - a.completedAt.toDate());
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
          <>
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              {teams.map(team => (
                <div key={team.id} className="block p-6 bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-semibold text-black">{team.name}</h2>
                    <span className="text-sm text-gray-500">
                      完成任務：{teamStats[team.id]?.completedMissions || 0}
                    </span>
                  </div>

                  {/* 團隊成員 */}
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">團隊成員</h3>
                    <div className="flex flex-wrap gap-2">
                      {team.members?.map(member => (
                        <span 
                          key={member.userId} 
                          className={`inline-block px-3 py-1 rounded-full text-sm ${
                            member.role === "A" 
                              ? "bg-black text-white" 
                              : "bg-gray-100 text-black"
                          }`}
                        >
                          {userDisplayNames[member.userId] || "匿名"}
                          {member.role === "A" && " (隊長)"}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 當前任務進度 */}
                  {teamStats[team.id]?.activeMission && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-600 mb-2">當前任務進度</h3>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div 
                          className="bg-black h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${(teamStats[team.id].activeMission.progress / teamStats[team.id].activeMission.totalCheckpoints) * 100}%` 
                          }}
                        />
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {teamStats[team.id].activeMission.progress} / {teamStats[team.id].activeMission.totalCheckpoints} 檢查點
                      </div>
                    </div>
                  )}

                  {/* 操作按鈕 */}
                  <div className="mt-4 space-x-2">
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

            {/* 最近完成任務 */}
            {recentMissions.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-black mb-4">最近完成任務</h2>
                <div className="space-y-4">
                  {recentMissions.map((mission, index) => (
                    <div 
                      key={index} 
                      className="bg-gray-50 p-4 rounded-xl cursor-pointer hover:bg-gray-100 transition"
                      onClick={() => window.location.href = `/missions/${mission.missionId}/complete?teamId=${mission.teamId}`}
                    >
                      <div className="text-black font-semibold">{mission.missionTitle}</div>
                      <div className="text-gray-600 text-sm">
                        團隊：{mission.teamName}
                      </div>
                      <div className="text-gray-500 text-sm">
                        完成時間：{mission.completedAt?.toDate?.().toLocaleString() || "未知"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 