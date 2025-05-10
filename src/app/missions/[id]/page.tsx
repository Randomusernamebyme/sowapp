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
      if (!id) return;
      try {
        // 取得任務資料
        const missionSnap = await getDoc(doc(db, "missions", id as string));
        if (!missionSnap.exists()) throw new Error("找不到任務");
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
          throw new Error("找不到任何檢查點，請聯絡管理員");
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
        setError(err?.message || "載入任務資料時發生錯誤");
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
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">選擇要啟動任務的團隊：</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={selectedTeamId}
            onChange={e => setSelectedTeamId(e.target.value)}
          >
            <option value="">請選擇團隊</option>
            {userTeams.filter(team => team.members.find((m: any) => m.userId === user.uid && m.role === "A")).map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </div>
      )}
      <div className="w-full max-w-xl flex flex-col items-center justify-center mt-4">
        {/* Debug 狀態顯示 */}
        <div className="text-xs text-gray-500 mb-2">
          <div>selectedTeamId: {selectedTeamId}</div>
          <div>activeTeamMission: {JSON.stringify(activeTeamMission)}</div>
          <div>buttonLoading: {buttonLoading ? "true" : "false"}</div>
        </div>
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