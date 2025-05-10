"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import MapView from "@/components/MapView";
import { useAuth } from "@/contexts/AuthContext";
import { getActiveTeamMission, startTeamMission } from "@/lib/missionService";

interface CheckpointType {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  description?: string;
  challengeDescription?: string;
  nextCheckpoint?: string;
}

interface Team {
  id: string;
  name: string;
  members: { userId: string; role: string }[];
}

export default function MissionDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [mission, setMission] = useState<any>(null);
  const [checkpoints, setCheckpoints] = useState<CheckpointType[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [team, setTeam] = useState<any>(null);
  const [activeTeamMission, setActiveTeamMission] = useState<any>(null);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLeader, setIsLeader] = useState(false);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  useEffect(() => {
    async function fetchData() {
      if (!id) {
        setError("無效的任務 ID");
        setLoading(false);
        return;
      }
      try {
        // 取得任務資料
        const missionSnap = await getDoc(doc(db, "missions", id as string));
        if (!missionSnap.exists()) {
          setError("找不到任務");
          setLoading(false);
          return;
        }
        const missionData = missionSnap.data();
        setMission(missionData);
        // 取得該任務所有 checkpoints
        const q = query(collection(db, "checkpoints"), where("missionId", "==", id));
        const cpSnap = await getDocs(q);
        let checkpointsRaw = cpSnap.docs.map(doc => {
          const data = doc.data() as Omit<CheckpointType, "id">;
          return { ...data, id: doc.id };
        });
        if (checkpointsRaw.length === 0) {
          setError("找不到任何檢查點，請聯絡管理員");
          setLoading(false);
          return;
        }
        let ordered: CheckpointType[] = [];
        if (checkpointsRaw.length > 0) {
          const cpMap = Object.fromEntries(checkpointsRaw.map(cp => [cp.id, cp]));
          let start = checkpointsRaw.find(cp => !checkpointsRaw.some(c => c.nextCheckpoint === cp.id));
          let current = start;
          while (current) {
            ordered.push(current);
            current = current.nextCheckpoint ? cpMap[current.nextCheckpoint] : undefined;
          }
          if (ordered.length < checkpointsRaw.length) {
            const missing = checkpointsRaw.filter(cp => !ordered.includes(cp));
            ordered = [...ordered, ...missing];
          }
        }
        setCheckpoints(ordered);
        setLoading(false);
      } catch (err: any) {
        console.error("[missions/[id]] fetchData error", err);
        setError("載入任務資料時發生錯誤，請稍後再試或聯絡管理員");
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  useEffect(() => {
    async function fetchTeams() {
      if (!user) return;
      // 取得所有用戶所屬團隊
      const teamSnap = await getDocs(query(collection(db, "teams")));
      const teams = teamSnap.docs
        .filter(doc => doc.data().members.some((m: any) => m.userId === user.uid))
        .map(doc => ({
          id: doc.id,
          name: doc.data().name,
          members: doc.data().members
        } as Team));
      setUserTeams(teams);
      // 預設選第一個隊長團隊
      const leaderTeam = teams.find(team => team.members.find((m: any) => m.userId === user.uid && m.role === "A"));
      setSelectedTeamId(leaderTeam?.id || "");
      setIsLeader(!!leaderTeam);
      if (leaderTeam) {
        const activeMission = await getActiveTeamMission(leaderTeam.id);
        setActiveTeamMission(activeMission);
      }
    }
    fetchTeams();
  }, [user]);

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-400">請先登入</div>;
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-black">載入中...</div>;
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-red-500">{error}</div>;
  }
  if (!mission) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-400">找不到任務</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-white pt-8">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
        {mission.imageUrl && (
          <img src={mission.imageUrl} alt="任務封面" className="w-full h-48 object-cover rounded-xl mb-4" />
        )}
        <div className="text-2xl font-bold text-black mb-2">{mission.title}</div>
        <div className="text-gray-600 mb-4">{mission.description}</div>
        <MapView
          checkpoints={checkpoints}
          startLocation={mission.startLocation}
          endLocation={mission.endLocation}
        />
        <div className="text-xs text-gray-500 mt-2">難度：{mission.difficulty || "-"}　預估時間：{mission.estimatedDuration || "-"}</div>
      </div>
      <div className="w-full max-w-xl space-y-4">
        {checkpoints.map((cp, idx) => (
          <div key={cp.id} className="bg-white border border-gray-200 rounded-xl shadow p-4">
            <div className="font-semibold text-black">{idx + 1}. {cp.name}</div>
            <div className="text-gray-600 text-sm">{cp.description}</div>
            <div className="text-xs text-gray-400 mt-1">{cp.challengeDescription}</div>
          </div>
        ))}
      </div>
      {isLeader && (
        <div className="w-full max-w-xl mb-4">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-4a4 4 0 10-8 0 4 4 0 008 0zm6 4v2a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2a2 2 0 012-2h4a2 2 0 012 2z" /></svg>
              <span className="text-lg font-semibold text-black">選擇要啟動任務的團隊</span>
            </div>
            {userTeams.filter(team => team.members.find((m: any) => m.userId === user.uid && m.role === "A")).length === 0 ? (
              <div className="text-gray-500 text-sm mb-2">你目前沒有可啟動任務的團隊。
                <a href="/teams" className="ml-2 text-blue-600 underline">前往建立團隊</a>
              </div>
            ) : (
              <div className="relative">
                <select
                  className="border border-gray-300 rounded-xl px-4 py-3 pr-10 shadow focus:ring-2 focus:ring-black focus:border-black transition bg-white text-black appearance-none w-full hover:border-gray-400 focus:outline-none"
                  value={selectedTeamId}
                  onChange={e => setSelectedTeamId(e.target.value)}
                >
                  <option value="">請選擇團隊</option>
                  {userTeams.filter(team => team.members.find((m: any) => m.userId === user.uid && m.role === "A")).map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </div>
                {/* 團隊成員頭像顯示 */}
                {selectedTeamId && (() => {
                  const selectedTeam = userTeams.find(t => t.id === selectedTeamId);
                  if (!selectedTeam) return null;
                  return (
                    <div className="flex gap-1 mt-2">
                      {selectedTeam.members.slice(0, 4).map((m, idx) => (
                        <img key={m.userId} src={`/avatars/avatar${idx + 1}.png`} alt="成員頭像" className="w-8 h-8 rounded-lg border border-gray-200 bg-gray-100" />
                      ))}
                      {selectedTeam.members.length > 4 && (
                        <span className="ml-1 text-xs text-gray-400">+{selectedTeam.members.length - 4}</span>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="w-full max-w-xl flex flex-col items-center justify-center mt-4">
        <button
          type="button"
          className={`px-6 py-3 rounded-xl font-bold text-lg transition-all duration-150 shadow-md ${!selectedTeamId || (!!activeTeamMission && activeTeamMission.missionId) ? 'bg-gray-300 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800'}`}
          disabled={!selectedTeamId || (!!activeTeamMission && activeTeamMission.missionId) || buttonLoading}
          onClick={async (e) => {
            if (!selectedTeamId) {
              console.log('Button disabled: selectedTeamId is empty');
            } else if (activeTeamMission && activeTeamMission.missionId) {
              console.log('Button disabled: activeTeamMission exists', activeTeamMission);
            } else if (buttonLoading) {
              console.log('Button disabled: buttonLoading is true');
            }
            e.preventDefault();
            setButtonLoading(true);
            setError("");
            try {
              if (!selectedTeamId) {
                setError("請先選擇團隊");
                setButtonLoading(false);
                return;
              }
              if (activeTeamMission && activeTeamMission.missionId) {
                setError("該團隊已有進行中任務，請先完成");
                setButtonLoading(false);
                return;
              }
              await startTeamMission(selectedTeamId, id as string);
              const newActive = await getActiveTeamMission(selectedTeamId);
              setActiveTeamMission(newActive);
              router.push(`/missions/${id}/active?teamId=${selectedTeamId}`);
            } catch (err: any) {
              setError(err?.message || "啟動任務失敗");
              console.error('startTeamMission error', err);
            } finally {
              setButtonLoading(false);
            }
          }}
        >
          {buttonLoading ? "啟動中..." : "開始任務"}
        </button>
      </div>
      {!selectedTeamId && isLeader && <div className="text-red-500 text-sm mt-2">請先選擇團隊才能開始任務</div>}
      {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
    </div>
  );
} 