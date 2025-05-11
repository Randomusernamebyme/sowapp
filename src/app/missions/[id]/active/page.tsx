"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, updateDoc } from "firebase/firestore";
import MapView from "@/components/MapView";
import PhysicalChallenge from "@/components/challenges/PhysicalChallenge";
import PuzzleChallenge from "@/components/challenges/PuzzleChallenge";
import PhotoChallenge from "@/components/challenges/PhotoChallenge";
import QuizChallenge from "@/components/challenges/QuizChallenge";
import { Mission, CheckpointType, UserMission } from "@/types/mission";
import { startTeamMission, updateTeamMissionProgress, completeTeamMission, getActiveTeamMission } from "@/lib/missionService";
import Image from "next/image";

// 計算兩點之間的距離（米）
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // 地球半徑（米）
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
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
  const { user, loading: authLoading } = useAuth();
  const [team, setTeam] = useState<any>(null);
  const [mission, setMission] = useState<Mission | null>(null);
  const [checkpoints, setCheckpoints] = useState<CheckpointType[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const userLocation = useUserLocation();
  const searchParams = useSearchParams();
  const teamId = searchParams.get("teamId");
  const [buttonLoading, setButtonLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [lastPasswordDigit, setLastPasswordDigit] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showTimeReminder, setShowTimeReminder] = useState(false);
  const [reminderImage] = useState("/reminder/reminder.png");

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
          const data = doc.data() as Omit<CheckpointType, "id">;
          return { ...data, id: doc.id };
        });

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

  // 倒數計時
  useEffect(() => {
    if (!mission || !team) return;
    const startedAt = team.missionProgress?.startedAt ? new Date(team.missionProgress.startedAt) : new Date();
    const durationMs = (parseInt(mission.estimatedDuration) || 60) * 60 * 1000;
    const endAt = new Date(startedAt.getTime() + durationMs);
    const timer = setInterval(() => {
      const now = new Date();
      const left = Math.max(0, Math.floor((endAt.getTime() - now.getTime()) / 1000));
      setTimeLeft(left);
      // 每 15 分鐘彈窗提醒
      if (left > 0 && left % (15 * 60) === 0) {
        setShowTimeReminder(true);
      }
      if (left === 0) {
        clearInterval(timer);
        router.replace(`/missions/${id}/fail?teamId=${team.id}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [mission, team, id, router]);

  const handleChallengeComplete = async (answer?: string) => {
    if (!team || !currentCheckpoint || buttonLoading) return;
    setButtonLoading(true);
    try {
      console.log('handleChallengeComplete', { currentCheckpoint });
      await updateTeamMissionProgress(
        team.id,
        currentCheckpoint.id,
        currentCheckpoint.passwordDigit?.value ? Number(currentCheckpoint.passwordDigit.value) : undefined,
        answer
      );
      // 彈窗顯示密碼數字
      if (currentCheckpoint.passwordDigit && currentCheckpoint.passwordDigit.value) {
        setLastPasswordDigit(currentCheckpoint.passwordDigit.value);
        setShowPasswordModal(true);
      } else {
        // 若無密碼數字也彈窗提示
        setLastPasswordDigit(null);
        setShowPasswordModal(true);
      }
      // 不自動跳轉，等用戶點擊確認
    } catch (error) {
      console.error("Error updating mission progress:", error);
      setError("更新任務進度時發生錯誤");
    } finally {
      setButtonLoading(false);
    }
  };

  // 新增：完成任務時自動導向完成頁（只在最後一個 checkpoint 完成且彈窗關閉時觸發）
  useEffect(() => {
    const handleMissionComplete = async () => {
      if (!showPasswordModal && currentCheckpointId && completedCheckpoints && checkpoints.length > 0) {
        const lastCpId = checkpoints[checkpoints.length - 1]?.id;
        console.log('Checking mission completion:', {
          lastCpId,
          completedCheckpoints,
          currentCheckpointId,
          showPasswordModal
        });
        
        if (lastCpId && completedCheckpoints.includes(lastCpId)) {
          if (mission) {
            try {
              console.log('Attempting to complete mission:', { teamId: team.id, missionId: mission.id });
              await completeTeamMission(team.id, mission.id);
              console.log('Mission completed successfully, redirecting...');
              router.replace(`/missions/${id}/complete?teamId=${team.id}`);
            } catch (err) {
              console.error("Error completing mission:", err);
              setError("完成任務時發生錯誤，請重新整理頁面重試");
            }
          }
        }
      }
    };

    handleMissionComplete();
  }, [showPasswordModal, currentCheckpointId, completedCheckpoints, checkpoints.length, id, team, router, mission, checkpoints]);

  // 密碼彈窗
  const PasswordModal = () => (
    showPasswordModal ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-xs w-full text-center">
          <div className="text-2xl font-bold text-black mb-2">{lastPasswordDigit ? '密碼數字' : '完成檢查點'}</div>
          {lastPasswordDigit ? (
            <div className="text-5xl font-mono text-black mb-4 tracking-widest">{lastPasswordDigit}</div>
          ) : (
            <div className="text-lg text-black mb-4">已完成此檢查點！</div>
          )}
          <button
            className="w-full bg-black text-white py-2 rounded-xl font-semibold hover:bg-gray-800 transition"
            onClick={async () => {
              setShowPasswordModal(false);
              // 完成後自動跳到下一個 checkpoint
              if (currentIdx < checkpoints.length - 1) {
                setCurrentIdx(i => i + 1);
              }
            }}
          >
            確認</button>
        </div>
      </div>
    ) : null
  );

  // 時間提醒彈窗
  const TimeReminderModal = () => (
    showTimeReminder ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-xs w-full text-center">
          <div className="text-2xl font-bold text-black mb-2">剩餘時間提醒</div>
          <Image src={reminderImage} width={180} height={120} alt="提醒圖片" className="mx-auto mb-4" />
          <div className="text-lg text-black mb-4">剩餘 {timeLeft ? Math.floor(timeLeft/60) : 0} 分鐘</div>
          <button className="w-full bg-black text-white py-2 rounded-xl font-semibold hover:bg-gray-800 transition" onClick={() => setShowTimeReminder(false)}>確認</button>
        </div>
      </div>
    ) : null
  );

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
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white">
          <div className="text-black mb-4">任務已完成，正在導向...</div>
          <button
            onClick={() => router.replace(`/missions/${id}/complete?teamId=${team.id}`)}
            className="px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition"
          >
            手動前往完成頁面
          </button>
        </div>
      );
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
              timeLimit={currentCheckpoint.challengeConfig?.physical?.timeLimit}
              requiredReps={currentCheckpoint.challengeConfig?.physical?.requiredReps}
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
              correctAnswer={currentCheckpoint.challengeConfig?.puzzle?.correctAnswer || ""}
              maxAttempts={currentCheckpoint.challengeConfig?.puzzle?.maxAttempts}
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
      case "quiz":
        return (
          <div className={buttonLoading ? "pointer-events-none opacity-60" : ""}>
            <QuizChallenge
              description={currentCheckpoint.challengeDescription || ""}
              clue={currentCheckpoint.clue || ""}
              onComplete={handleChallengeComplete}
              options={currentCheckpoint.challengeConfig?.quiz?.options || []}
              correctAnswer={currentCheckpoint.challengeConfig?.quiz?.correctAnswer || ""}
              maxAttempts={currentCheckpoint.challengeConfig?.quiz?.maxAttempts}
            />
          </div>
        );
      default:
        return (
          <div className="w-full p-4 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-600">此檢查點沒有挑戰內容</p>
            <button
              className="w-full px-4 py-2 rounded-xl bg-black text-white font-semibold mt-4"
              onClick={() => handleChallengeComplete()}
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
    <>
      <PasswordModal />
      <TimeReminderModal />
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
        
        {/* 放棄任務按鈕 */}
        <button
          onClick={async () => {
            if (window.confirm("確定要放棄任務嗎？")) {
              try {
                await updateDoc(doc(db, "teams", team.id), {
                  activeMission: "",
                  missionProgress: {}
                });
                router.push("/missions");
              } catch (error) {
                console.error("Error abandoning mission:", error);
                setError("放棄任務時發生錯誤");
              }
            }
          }}
          className="px-4 py-2 text-red-500 border border-red-500 rounded-xl hover:bg-red-50 transition"
        >
          放棄任務
        </button>
      </div>
    </>
  );
} 