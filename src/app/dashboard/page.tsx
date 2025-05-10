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
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [completedMissions, setCompletedMissions] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

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
          completedMissions: doc.data().completedMissions || []
        }));
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-black">載入中...</div>;
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 用戶資訊卡片 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <h1 className="text-2xl font-bold mb-4 text-black tracking-tight">歡迎，{userData?.displayName || "用戶"}！</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl">
              <div className="text-gray-600 text-sm">積分</div>
              <div className="text-2xl font-bold text-black">{userData?.points || 0}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <div className="text-gray-600 text-sm">完成任務</div>
              <div className="text-2xl font-bold text-black">{completedMissions.length}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <div className="text-gray-600 text-sm">加入團隊</div>
              <div className="text-2xl font-bold text-black">{userTeams.length}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <div className="text-gray-600 text-sm">體能等級</div>
              <div className="text-2xl font-bold text-black">{userData?.fitnessLevel || "未設定"}</div>
            </div>
          </div>
        </div>

        {/* 快速操作按鈕 */}
        <div className="grid grid-cols-2 gap-4">
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

        {/* 進行中任務 */}
        {activeTeamMissions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-black mb-4">進行中任務</h2>
            <div className="space-y-4">
              {activeTeamMissions.map(m => (
                <div key={m.teamId} className="bg-gray-50 p-4 rounded-xl">
                  <div className="text-black font-semibold">{m.teamName}</div>
                  <div className="text-gray-700">任務：{m.missionTitle}</div>
                  <div className="text-gray-500 text-sm mb-2">
                    進度：{m.missionProgress.completedCheckpoints?.length || 0} / ?
                  </div>
                  <button
                    onClick={() => router.push(`/missions/${m.missionId}/active?teamId=${m.teamId}`)}
                    className="inline-block px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition"
                  >
                    繼續任務
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 我的團隊 */}
        {userTeams.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-black mb-4">我的團隊</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {userTeams.map(team => (
                <div key={team.id} className="bg-gray-50 p-4 rounded-xl">
                  <div className="text-black font-semibold">{team.name}</div>
                  <div className="text-gray-600 text-sm mb-2">
                    成員數：{team.members?.length || 0}
                  </div>
                  <button
                    onClick={() => router.push(`/teams/${team.id}`)}
                    className="inline-block px-4 py-2 bg-gray-200 text-black rounded-xl hover:bg-gray-300 transition"
                  >
                    查看詳情
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 最近活動 */}
        {recentActivities.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-black mb-4">最近活動</h2>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-xl">
                  <div className="text-black font-semibold">{activity.missionTitle}</div>
                  <div className="text-gray-600 text-sm">
                    團隊：{activity.teamName}
                  </div>
                  <div className="text-gray-500 text-sm">
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