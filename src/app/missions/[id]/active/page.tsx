"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import MapView from "@/components/MapView";
import PhysicalChallenge from "@/components/challenges/PhysicalChallenge";
import PuzzleChallenge from "@/components/challenges/PuzzleChallenge";
import PhotoChallenge from "@/components/challenges/PhotoChallenge";
import { Mission, Checkpoint, UserMission } from "@/types/mission";
import { startTeamMission, updateTeamMissionProgress, completeTeamMission, getActiveTeamMission } from "@/lib/missionService";

function useUserLocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);
  return location;
}

export default function ActiveMissionPage() {
  const router = useRouter();
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [team, setTeam] = useState<any>(null);
  const [mission, setMission] = useState<Mission | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const userLocation = useUserLocation();

  useEffect(() => {
    if (authLoading) return;
    if (!id) return;
    if (!user) {
      router.push("/auth");
      return;
    }
    async function fetchData() {
      if (!user) return;
      // 取得所有團隊
      const teamSnap = await getDocs(collection(db, "teams"));
      const userTeam = teamSnap.docs.find(doc => doc.data().members.some((m: any) => m.userId === user.uid));
      if (!userTeam) {
        router.push("/teams");
        return;
      }
      setTeam({ id: userTeam.id, ...userTeam.data() });
      // 取得團隊 activeMission
      let activeMission = await getActiveTeamMission(userTeam.id);
      if (!activeMission || activeMission.missionId !== id) {
        // 啟動團隊任務
        await startTeamMission(userTeam.id, id as string);
        activeMission = await getActiveTeamMission(userTeam.id);
      }
      if (!activeMission) {
        throw new Error("無法建立任務進度");
      }
      // 取得任務和檢查點資料
      const missionSnap = await getDoc(doc(db, "missions", id as string));
      if (!missionSnap.exists()) return;
      const missionData = missionSnap.data() as Mission;
      setMission(missionData);
      const q = query(collection(db, "checkpoints"), where("missionId", "==", id));
      const cpSnap = await getDocs(q);
      let checkpointsRaw = cpSnap.docs.map(doc => {
        const data = doc.data() as Omit<Checkpoint, "id">;
        return { ...data, id: doc.id };
      });
      // 用 nextCheckpoint 串連所有 checkpoint
      let ordered: Checkpoint[] = [];
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
      // 如果有進行中的任務，設定當前檢查點
      if (activeMission.missionProgress && activeMission.missionProgress.currentCheckpoint) {
        const currentIdx = ordered.findIndex(cp => cp.id === activeMission.missionProgress.currentCheckpoint);
        if (currentIdx !== -1) {
          setCurrentIdx(currentIdx);
        }
      }
      setLoading(false);
    }
    fetchData();
  }, [id, user, authLoading, router]);

  const handleChallengeComplete = async () => {
    if (!team) return;
    const currentCheckpoint = checkpoints[currentIdx];
    try {
      await updateTeamMissionProgress(team.id, currentCheckpoint.id, currentCheckpoint.passwordDigit?.value);
      if (currentIdx < checkpoints.length - 1) {
        setCurrentIdx(i => i + 1);
      } else {
        await completeTeamMission(team.id);
        await new Promise(r => setTimeout(r, 500));
        router.push(`/missions/${id}/complete`);
      }
    } catch (error) {
      console.error("Error updating mission progress:", error);
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-black">載入中...</div>;
  }
  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-400">請先登入</div>;
  }
  if (!mission || checkpoints.length === 0) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-400">找不到任務或檢查點</div>;
  }

  const currentCheckpoint = checkpoints[currentIdx];

  if (!currentCheckpoint) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-400">找不到檢查點</div>;
  }

  const renderChallenge = () => {
    switch (currentCheckpoint.challengeType) {
      case "physical":
        return (
          <PhysicalChallenge
            description={currentCheckpoint.challengeDescription || ""}
            onComplete={handleChallengeComplete}
          />
        );
      case "puzzle":
        return (
          <PuzzleChallenge
            description={currentCheckpoint.challengeDescription || ""}
            clue={currentCheckpoint.clue || ""}
            onComplete={handleChallengeComplete}
          />
        );
      case "photo":
        return (
          <PhotoChallenge
            description={currentCheckpoint.challengeDescription || ""}
            onComplete={handleChallengeComplete}
          />
        );
      default:
        return (
          <div className="w-full p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-600">此檢查點沒有挑戰內容</p>
            <button
              className="w-full px-4 py-2 rounded-xl bg-black text-white font-semibold mt-4"
              onClick={handleChallengeComplete}
            >
              完成檢查點
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-white pt-8">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
        <MapView
          checkpoints={checkpoints}
          startLocation={mission.startLocation}
          endLocation={mission.endLocation}
          userLocation={userLocation}
        />
        <div className="mt-4">
          <div className="text-lg font-bold text-black mb-1">目前檢查點：{currentCheckpoint.name}</div>
          <div className="text-gray-600 mb-2">{currentCheckpoint.description}</div>
          {renderChallenge()}
        </div>
      </div>
    </div>
  );
} 