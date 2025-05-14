"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, arrayRemove, arrayUnion, collection, getDocs, query, where } from "firebase/firestore";
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

export default function TeamDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");
  const [updatingRole, setUpdatingRole] = useState(false);
  const [userDisplayNames, setUserDisplayNames] = useState<Record<string, string>>({});
  const [activeMission, setActiveMission] = useState<any>(null);
  const [completedMissions, setCompletedMissions] = useState<Mission[]>([]);
  const [teamStats, setTeamStats] = useState<any>(null);
  const [recentMissions, setRecentMissions] = useState<any[]>([]);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);

  useEffect(() => {
    async function loadTeam() {
      if (!user) return;
      
      try {
        const teamDoc = await getDoc(doc(db, "teams", id as string));
        if (!teamDoc.exists()) {
          router.push("/teams");
          return;
        }
        const teamData = { id: teamDoc.id, ...teamDoc.data() } as Team;
        setTeam(teamData);

        // 取得所有成員的 displayName
        const userIds = Array.from(new Set(teamData.members.map(m => m.userId)));
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

        // 取得當前任務資訊
        if (teamData.activeMission) {
          const missionDoc = await getDoc(doc(db, "missions", teamData.activeMission));
          if (missionDoc.exists()) {
            setActiveMission({ id: missionDoc.id, ...missionDoc.data() } as Mission);
          }
        }

        // 取得已完成任務資訊
        const completedMissionsData: Mission[] = [];
        if (teamData.completedMissionProgress) {
          for (const progress of teamData.completedMissionProgress) {
            const missionDoc = await getDoc(doc(db, "missions", progress.missionId));
            if (missionDoc.exists()) {
              completedMissionsData.push({ id: missionDoc.id, ...missionDoc.data() } as Mission);
            }
          }
        }
        setCompletedMissions(completedMissionsData);

        // 計算團隊統計資料
        const stats = {
          totalMissions: completedMissionsData.length + (teamData.activeMission ? 1 : 0),
          completedMissions: completedMissionsData.length,
          activeMission: teamData.activeMission ? {
            progress: teamData.missionProgress?.completedCheckpoints?.length || 0,
            totalCheckpoints: teamData.missionProgress?.checkpoints?.length || 0
          } : null,
          lastCompletedMission: teamData.completedMissionProgress && teamData.completedMissionProgress.length > 0 
            ? teamData.completedMissionProgress[teamData.completedMissionProgress.length - 1] 
            : null
        };
        setTeamStats(stats);

        // 取得最近完成任務（同 teams page）
        const recentMissionsData: Array<{
          teamId: string;
          teamName: string;
          missionId: string;
          missionTitle: string;
          completedAt: any;
        }> = [];
        if (teamData.completedMissionProgress) {
          for (const progress of teamData.completedMissionProgress) {
            const missionDoc = await getDoc(doc(db, "missions", progress.missionId));
            if (missionDoc.exists()) {
              recentMissionsData.push({
                teamId: teamData.id,
                teamName: teamData.name,
                missionId: progress.missionId,
                missionTitle: missionDoc.data().title,
                completedAt: progress.completedAt
              });
            }
          }
        }
        recentMissionsData.sort((a, b) => {
          const aDate = typeof a.completedAt?.toDate === 'function' ? a.completedAt.toDate() : new Date(a.completedAt);
          const bDate = typeof b.completedAt?.toDate === 'function' ? b.completedAt.toDate() : new Date(b.completedAt);
          return bDate.getTime() - aDate.getTime();
        });
        setRecentMissions(recentMissionsData.slice(0, 5));

        // 取得檢查點資料
        if (teamData.activeMission) {
          const q = query(collection(db, "checkpoints"), where("missionId", "==", teamData.activeMission));
          const cpSnap = await getDocs(q);
          setCheckpoints(cpSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
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
    <div className="min-h-screen bg-[var(--color-bg)] p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">{team.name}</h1>
          <Link
            href="/teams"
            className="text-[var(--color-text)]/70 hover:text-[var(--color-primary)] transition"
          >
            返回團隊列表
          </Link>
        </div>

        {/* 團隊統計 */}
        <div className="bg-[var(--color-card)] rounded-2xl shadow-lg border border-[var(--color-secondary)] p-6 mb-6">
          <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4">團隊統計</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[var(--color-secondary)] p-4 rounded-xl">
              <div className="text-[var(--color-text)]/70 text-sm">總任務數</div>
              <div className="text-2xl font-bold text-[var(--color-text)]">{teamStats?.totalMissions || 0}</div>
            </div>
            <div className="bg-[var(--color-secondary)] p-4 rounded-xl">
              <div className="text-[var(--color-text)]/70 text-sm">已完成任務</div>
              <div className="text-2xl font-bold text-[var(--color-text)]">{teamStats?.completedMissions || 0}</div>
            </div>
            <div className="bg-[var(--color-secondary)] p-4 rounded-xl">
              <div className="text-[var(--color-text)]/70 text-sm">當前任務</div>
              <div className="text-2xl font-bold text-[var(--color-text)]">{team.activeMission ? "進行中" : "無"}</div>
            </div>
            <div className="bg-[var(--color-secondary)] p-4 rounded-xl">
              <div className="text-[var(--color-text)]/70 text-sm">團隊成員</div>
              <div className="text-2xl font-bold text-[var(--color-text)]">{team.members?.length || 0}</div>
            </div>
          </div>
        </div>

        {/* 當前任務 */}
        {activeMission && team?.missionProgress?.currentCheckpoint && (
          <div className="bg-[var(--color-card)] rounded-2xl shadow-lg border border-[var(--color-secondary)] p-6 mb-6">
            <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4">當前任務</h2>
            <div className="flex items-center gap-4">
              {activeMission.imageUrl && (
                <img 
                  src={activeMission.imageUrl} 
                  alt={activeMission.title} 
                  className="w-24 h-24 object-cover rounded-xl"
                />
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[var(--color-text)]">{activeMission.title}</h3>
                <p className="text-[var(--color-text)]/70 text-sm mb-2">{activeMission.description}</p>
                <div className="flex items-center gap-4 text-sm text-[var(--color-text)]/60">
                  <span>難度：{activeMission.difficulty}</span>
                  <span>預估時間：{activeMission.estimatedDuration}</span>
                </div>
                {teamStats?.activeMission && (
                  <div className="mt-2">
                    <div className="w-full bg-[var(--color-secondary)] rounded-full h-2">
                      <div 
                        className="bg-[var(--color-primary)] h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${(team?.missionProgress?.completedCheckpoints?.length || 0) / (checkpoints?.length || 1) * 100}%` 
                        }}
                      />
                    </div>
                    <div className="text-sm text-[var(--color-text)]/60 mt-1">
                      {team?.missionProgress?.completedCheckpoints?.length || 0} / {checkpoints?.length || 0} 檢查點
                    </div>
                  </div>
                )}
              </div>
              <Link
                href={`/missions/${activeMission.id}/active?teamId=${team.id}`}
                className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-bg)] rounded-xl hover:bg-[var(--color-accent)] transition"
              >
                繼續任務
              </Link>
            </div>
          </div>
        )}

        {/* 團隊資訊 */}
        <div className="bg-[var(--color-card)] rounded-2xl shadow-lg border border-[var(--color-secondary)] p-6 mb-6">
          <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4">團隊資訊</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-[var(--color-secondary)] rounded-xl">
              <span className="text-[var(--color-text)]/70">團隊 ID</span>
              <span className="text-[var(--color-text)] font-mono">{team.id}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-[var(--color-secondary)] rounded-xl">
              <span className="text-[var(--color-text)]/70">邀請碼</span>
              <span className="text-[var(--color-text)] font-mono">{team.inviteCode}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-[var(--color-secondary)] rounded-xl">
              <span className="text-[var(--color-text)]/70">創建時間</span>
              <span className="text-[var(--color-text)]">
                {team.createdAt?.toDate?.().toLocaleString() || "未知"}
              </span>
            </div>
          </div>
        </div>

        {/* 成員列表 */}
        <div className="bg-[var(--color-card)] rounded-2xl shadow-lg border border-[var(--color-secondary)] p-6 mb-6">
          <h2 className="text-xl font-semibold text-[var(--color-text)] mb-4">成員列表</h2>
          <div className="space-y-3">
            {team.members?.slice(0, 4).map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between p-4 bg-[var(--color-secondary)] rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-[var(--color-secondary)] rounded-lg flex items-center justify-center">
                    <span className="text-[var(--color-text)] font-medium">
                      {(userDisplayNames[member.userId] || "匿名").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-[var(--color-text)] font-medium">
                      {userDisplayNames[member.userId] || "匿名"}
                      {member.role === "A" && " (隊長)"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member.userId, e.target.value)}
                        disabled={updatingRole || member.userId !== user?.uid}
                        className="text-sm bg-[var(--color-card)] border border-[var(--color-secondary)] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      >
                        <option value="A">隊長</option>
                        <option value="B">成員</option>
                        <option value="C">成員</option>
                        <option value="D">成員</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--color-text)]/70 text-sm">狀態</span>
                  <span className="text-[var(--color-text)] text-sm">{member.status}</span>
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
          className="w-full bg-[var(--color-primary)] text-[var(--color-bg)] py-3 rounded-xl font-semibold shadow hover:bg-[var(--color-accent)] transition disabled:opacity-50"
        >
          {leaving ? "離開中..." : "離開團隊"}
        </button>
      </div>
    </div>
  );
} 