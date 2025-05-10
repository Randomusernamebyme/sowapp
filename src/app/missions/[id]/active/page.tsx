"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import MapView from "@/components/MapView";
import PhysicalChallenge from "@/components/challenges/PhysicalChallenge";
import PuzzleChallenge from "@/components/challenges/PuzzleChallenge";
import PhotoChallenge from "@/components/challenges/PhotoChallenge";
import { startMission, completeCheckpoint, completeMission, getActiveMission, MissionProgress } from "@/lib/missionProgress";

interface CheckpointType {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  description?: string;
  challengeDescription?: string;
  challengeType?: "physical" | "puzzle" | "photo";
  clue?: string;
  nextCheckpoint?: string;
}

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
  const { user } = useAuth();
  const [mission, setMission] = useState<any>(null);
  const [checkpoints, setCheckpoints] = useState<CheckpointType[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<MissionProgress | null>(null);
  const userLocation = useUserLocation();

  useEffect(() => {
    async function fetchData() {
      if (!id || !user) return;
      // 取得任務資料
      const missionSnap = await getDoc(doc(db, "missions", id as string));
      if (!missionSnap.exists()) return;
      const missionData = missionSnap.data();
      setMission(missionData);
      // 取得該任務所有 checkpoints
      const q = query(collection(db, "checkpoints"), where("missionId", "==", id));
      const cpSnap = await getDocs(q);
      let checkpointsRaw = cpSnap.docs.map(doc => {
        const data = doc.data() as Omit<CheckpointType, "id">;
        return { ...data, id: doc.id };
      });
      // 用 nextCheckpoint 串連所有 checkpoint
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

      // 取得或建立任務進度
      const existingProgress = await getActiveMission(user.uid);
      if (existingProgress) {
        setProgress(existingProgress);
        setCurrentIdx(checkpoints.findIndex(cp => cp.id === existingProgress.currentCheckpoint));
      } else {
        const newProgressId = await startMission(user.uid, id as string);
        // 重新查詢進度
        const newProgress = await getActiveMission(user.uid);
        setProgress(newProgress);
      }
      setLoading(false);
    }
    fetchData();
  }, [id, user]);

  const handleChallengeComplete = async (challengeData?: any) => {
    if (!user || !id || !progress) return;
    const currentCheckpoint = checkpoints[currentIdx];
    
    try {
      await completeCheckpoint(progress.id, currentCheckpoint.id);

      if (currentIdx < checkpoints.length - 1) {
        setCurrentIdx(i => i + 1);
      } else {
        await completeMission(user.uid, id as string);
        router.push(`/missions/${id}/complete`);
      }
    } catch (error) {
      console.error("更新進度失敗：", error);
      // TODO: 顯示錯誤訊息
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-black">載入中...</div>;
  }
  if (!mission || checkpoints.length === 0) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-400">找不到任務或檢查點</div>;
  }

  const currentCheckpoint = checkpoints[currentIdx];

  const renderChallenge = () => {
    switch (currentCheckpoint.challengeType) {
      case "physical":
        return (
          <PhysicalChallenge
            description={currentCheckpoint.challengeDescription || ""}
            onComplete={() => handleChallengeComplete({ type: "physical" })}
          />
        );
      case "puzzle":
        return (
          <PuzzleChallenge
            description={currentCheckpoint.challengeDescription || ""}
            clue={currentCheckpoint.clue || ""}
            onComplete={() => handleChallengeComplete({ type: "puzzle" })}
          />
        );
      case "photo":
        return (
          <PhotoChallenge
            description={currentCheckpoint.challengeDescription || ""}
            onComplete={() => handleChallengeComplete({ type: "photo" })}
          />
        );
      default:
        return (
          <div className="w-full p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-600">此檢查點沒有挑戰內容</p>
            <button
              className="w-full px-4 py-2 rounded-xl bg-black text-white font-semibold mt-4"
              onClick={() => handleChallengeComplete()}
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