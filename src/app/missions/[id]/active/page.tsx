"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
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
  const searchParams = useSearchParams();
  const teamId = searchParams.get("teamId");
  const [buttonLoading, setButtonLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentCheckpointId = team?.missionProgress?.currentCheckpoint;
  const completedCheckpoints = team?.missionProgress?.completedCheckpoints || [];

  useEffect(() => {
    if (authLoading) return;
    if (!id) return;
    if (!user) {
      router.push("/auth");
      return;
    }
    if (!teamId) {
      router.push("/teams");
      return;
    }
    // 監聽團隊文件，進度即時同步
    const unsub = onSnapshot(doc(db, "teams", teamId!), async (teamDoc) => {
      try {
        if (!teamDoc.exists()) {
          router.push("/teams");
          return;
        }
        const teamData = teamDoc.data();
        setTeam({ id: teamDoc.id, ...teamData });
        
        // 取得團隊 activeMission
        let activeMission = await getActiveTeamMission(teamId!);
        if (!activeMission || activeMission.missionId !== id) {
          setLoading(false);
          return;
        }

        // 取得任務和檢查點資料
        const missionSnap = await getDoc(doc(db, "missions", id as string));
        if (!missionSnap.exists()) throw new Error("找不到任務");
        const missionData = missionSnap.data() as Mission;
        setMission(missionData);

        const q = query(collection(db, "checkpoints"), where("missionId", "==", id));
        const cpSnap = await getDocs(q);
        let checkpointsRaw = cpSnap.docs.map(doc => {
          const data = doc.data() as Omit<Checkpoint, "id">;
          return { ...data, id: doc.id };
        });

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

        // 根據 missionProgress 設置當前檢查點
        if (activeMission.missionProgress) {
          const { currentCheckpoint, completedCheckpoints } = activeMission.missionProgress;
          
          // 如果沒有當前檢查點，但有已完成的檢查點，找到最後一個完成的檢查點的下一個
          if (!currentCheckpoint && completedCheckpoints?.length > 0) {
            const lastCompleted = completedCheckpoints[completedCheckpoints.length - 1];
            const lastCheckpoint = ordered.find(cp => cp.id === lastCompleted);
            if (lastCheckpoint?.nextCheckpoint) {
              const nextIdx = ordered.findIndex(cp => cp.id === lastCheckpoint.nextCheckpoint);
              if (nextIdx !== -1) {
                setCurrentIdx(nextIdx);
              }
            }
          } else if (currentCheckpoint) {
            // 如果有當前檢查點，直接設置
            const currentIdx = ordered.findIndex(cp => cp.id === currentCheckpoint);
            if (currentIdx !== -1) {
              setCurrentIdx(currentIdx);
            }
          }
        }
        
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || "載入任務資料時發生錯誤");
        setLoading(false);
      }
    });
    return () => unsub();
  }, [id, user, authLoading, router, teamId]);

  const handleChallengeComplete = async () => {
    if (!team || !currentCheckpoint || buttonLoading) return;
    setButtonLoading(true);
    try {
      await updateTeamMissionProgress(team.id, currentCheckpoint.id, currentCheckpoint.passwordDigit?.value);
      if (currentIdx < checkpoints.length - 1) {
        setCurrentIdx(i => i + 1);
      } else {
        if (mission) {
          await completeTeamMission(team.id, mission.id);
        }
        await new Promise(r => setTimeout(r, 500));
        router.push(`/missions/${id}/complete?teamId=${team.id}`);
      }
    } catch (error) {
      console.error("Error updating mission progress:", error);
    } finally {
      setButtonLoading(false);
    }
  };

  // 新增：完成任務時自動導向完成頁
  useEffect(() => {
    if (
      !currentCheckpointId &&
      completedCheckpoints.length === checkpoints.length &&
      checkpoints.length > 0
    ) {
      router.replace(`/missions/${id}/complete?teamId=${team.id}`);
    }
  }, [currentCheckpointId, completedCheckpoints, checkpoints.length, id, team, router]);

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-black">載入中...</div>;
  }
  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-400">請先登入</div>;
  }
  if (!mission || checkpoints.length === 0) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-400">找不到任務或檢查點</div>;
  }

  if (!currentCheckpointId) {
    if (completedCheckpoints.length === checkpoints.length && checkpoints.length > 0) {
      return <div className="min-h-screen flex items-center justify-center bg-white text-black">任務已完成，正在導向...</div>;
    } else {
      return <div className="min-h-screen flex items-center justify-center bg-white text-gray-400">資料同步中，請稍候...</div>;
    }
  }
  const currentCheckpoint = checkpoints.find(cp => cp.id === currentCheckpointId);
  if (!currentCheckpoint) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-400">資料同步中，請稍候...</div>;
  }

  const renderChallenge = () => {
    switch (currentCheckpoint.challengeType) {
      case "physical":
        return (
          <div className={buttonLoading ? "pointer-events-none opacity-60" : ""}>
            <PhysicalChallenge
              description={currentCheckpoint.challengeDescription || ""}
              onComplete={handleChallengeComplete}
            />
          </div>
        );
      case "puzzle":
        return (
          <div className={buttonLoading ? "pointer-events-none opacity-60" : ""}>
            <PuzzleChallenge
              description={currentCheckpoint.challengeDescription || ""}
              clue={currentCheckpoint.clue || ""}
              onComplete={handleChallengeComplete}
            />
          </div>
        );
      case "photo":
        return (
          <div className={buttonLoading ? "pointer-events-none opacity-60" : ""}>
            <PhotoChallenge
              description={currentCheckpoint.challengeDescription || ""}
              onComplete={handleChallengeComplete}
            />
          </div>
        );
      default:
        return (
          <div className="w-full p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-600">此檢查點沒有挑戰內容</p>
            <button
              className="w-full px-4 py-2 rounded-xl bg-black text-white font-semibold mt-4"
              onClick={handleChallengeComplete}
              disabled={buttonLoading}
            >
              完成檢查點
            </button>
          </div>
        );
    }
  };

  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-red-500">{error}</div>;
  }

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