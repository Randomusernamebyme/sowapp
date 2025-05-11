"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { Mission, UserMission } from "@/types/mission";

export default function MissionCompletePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = searchParams.get("teamId");
  const [mission, setMission] = useState<Mission | null>(null);
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userDisplayNames, setUserDisplayNames] = useState<Record<string, string>>({});
  const [inputPassword, setInputPassword] = useState("");
  const [showUnlock, setShowUnlock] = useState(true);
  const [unlockError, setUnlockError] = useState("");

  useEffect(() => {
    async function fetchData() {
      if (!user || !id || !teamId) return;
      // 取得任務資料
      const missionSnap = await getDoc(doc(db, "missions", id as string));
      if (missionSnap.exists()) {
        setMission({ id: missionSnap.id, ...missionSnap.data() } as Mission);
      }
      // 取得團隊資料
      const teamSnap = await getDoc(doc(db, "teams", teamId));
      if (teamSnap.exists()) {
        const teamData: any = { id: teamSnap.id, ...teamSnap.data() };
        setTeam(teamData);
        // 取得所有成員 displayName
        const userIds: string[] = Array.from(new Set((teamData.members || []).map((m: any) => m.userId)));
        const displayNames: Record<string, string> = {};
        for (const uid of userIds) {
          const userDoc = await getDoc(doc(db, "users", uid));
          if (userDoc.exists()) {
            displayNames[uid as string] = userDoc.data().displayName || "匿名";
          } else {
            displayNames[uid as string] = "匿名";
          }
        }
        setUserDisplayNames(displayNames);
        // 新增：如果 completedMissionProgress 有該任務紀錄，直接跳過密碼輸入
        const completedList = Array.isArray(teamData.completedMissionProgress) ? teamData.completedMissionProgress.filter((c: any) => c.missionId === id) : [];
        if (completedList.length > 0) {
          setShowUnlock(false);
        }
      } else {
        setError("找不到團隊資料");
      }
      setLoading(false);
    }
    fetchData();
  }, [user, id, teamId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-black">載入中...</div>;
  }
  if (!mission || !team) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-400">找不到任務或團隊資料</div>;
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-red-500">{error}</div>;
  }

  // 取得團隊 completedMissionProgress 最後一筆紀錄
  const completedList = Array.isArray(team.completedMissionProgress) ? team.completedMissionProgress.filter((c: any) => c.missionId === mission.id) : [];
  const lastCompleted = completedList.length > 0 ? completedList[completedList.length - 1] : (team.missionProgress || null);
  const completedAt = lastCompleted?.completedAt
    ? (typeof lastCompleted.completedAt.toDate === 'function'
        ? lastCompleted.completedAt.toDate()
        : new Date(lastCompleted.completedAt))
    : null;
  const collectedDigits = lastCompleted?.collectedDigits || [];
  const completedCheckpoints = lastCompleted?.completedCheckpoints || [];
  const answers = lastCompleted?.answers || {};
  const teamName = team.name || "";

  // 取得正確密碼
  const correctPassword = mission?.password || "";

  if (showUnlock) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-xs w-full text-center">
          <div className="text-2xl font-bold text-black mb-2">請輸入你收集到的密碼</div>
          <input
            type="text"
            value={inputPassword}
            onChange={e => setInputPassword(e.target.value)}
            className="w-full border rounded-lg p-2 text-center text-2xl font-mono mb-4"
            placeholder="請輸入 4 位數字"
            maxLength={correctPassword.length}
          />
          {unlockError && <div className="text-red-500 text-sm mb-2">{unlockError}</div>}
          <button
            className="w-full bg-black text-white py-2 rounded-xl font-semibold hover:bg-gray-800 transition"
            onClick={() => {
              if (inputPassword === correctPassword) {
                setShowUnlock(false);
                setUnlockError("");
              } else {
                setUnlockError("密碼錯誤，請重新輸入");
              }
            }}
          >
            解鎖
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-white pt-8">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6 text-center">
        {mission.cover && (
          <img
            src={mission.cover}
            alt="任務封面"
            className="w-full max-h-60 object-cover rounded-2xl mb-4 shadow"
          />
        )}
        <h1 className="text-2xl font-bold text-black mb-2">任務完成！</h1>
        <div className="text-lg text-gray-700 mb-4">{mission.title}</div>
        <div className="mb-4">
          <div className="text-gray-600">完成時間：</div>
          <div className="font-semibold text-black">{completedAt ? completedAt.toLocaleString() : "未知"}</div>
        </div>
        <div className="mb-4">
          <div className="text-gray-600">完成檢查點數量：</div>
          <div className="font-semibold text-black">{completedCheckpoints.length}</div>
        </div>
        <div className="mb-4">
          <div className="text-gray-600">團隊名稱：</div>
          <div className="font-mono text-black">{teamName}</div>
        </div>
        <div className="mb-4">
          <div className="text-gray-600">團隊成員：</div>
          <div className="font-mono text-black">
            {team && team.members && team.members.length > 0
              ? team.members.map((m: any) => userDisplayNames[m.userId as string] || "匿名").join("、")
              : "無成員"}
          </div>
        </div>
        <div className="flex flex-col gap-3 mt-6">
          <button
            className="w-full bg-black text-white py-3 rounded-xl font-semibold shadow hover:bg-gray-800 transition"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `我們完成了「${mission.title}」任務！`,
                  text: `我們的團隊「${teamName}」剛完成了「${mission.title}」任務！`,
                });
              }
            }}
          >
            分享成果
          </button>
        </div>
      </div>
    </div>
  );
}
 