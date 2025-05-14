"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [memberLocations, setMemberLocations] = useState<Record<string, { lat: number, lng: number, displayName: string, avatarUrl?: string, updatedAt?: any }>>({});
  const [notifications, setNotifications] = useState<any[]>([]);
  const [latestNotification, setLatestNotification] = useState<string>("");
  const [showNotificationModal, setShowNotificationModal] = useState(false);

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
    
    // 確保 startedAt 是有效的日期
    const startedAt = team.missionProgress?.startedAt 
      ? new Date(team.missionProgress.startedAt.seconds * 1000) 
      : new Date();
    
    // 確保 estimatedDuration 是有效的數字
    const durationMinutes = parseInt(mission.estimatedDuration) || 60;
    const durationMs = durationMinutes * 60 * 1000;
    const endAt = new Date(startedAt.getTime() + durationMs);
    
    // 追蹤上次提醒時間
    let lastReminderTime = 0;
    
    const timer = setInterval(() => {
      const now = new Date();
      const left = Math.max(0, Math.floor((endAt.getTime() - now.getTime()) / 1000));
      setTimeLeft(left);
      
      // 每 15 分鐘彈窗提醒
      const minutesLeft = Math.floor(left / 60);
      if (minutesLeft > 0 && minutesLeft % 15 === 0 && minutesLeft !== lastReminderTime) {
        lastReminderTime = minutesLeft;
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
    if (!team || !currentCheckpoint || buttonLoading || isProcessing || showPasswordModal) return;
    setButtonLoading(true);
    setIsProcessing(true);
    try {
      console.log('handleChallengeComplete', { currentCheckpoint });
      await updateTeamMissionProgress(
        team.id,
        currentCheckpoint.id,
        currentCheckpoint.passwordDigit?.value ? Number(currentCheckpoint.passwordDigit.value) : undefined,
        answer
      );
      if (currentCheckpoint.passwordDigit && currentCheckpoint.passwordDigit.value) {
        setLastPasswordDigit(currentCheckpoint.passwordDigit.value);
        setShowPasswordModal(true);
      } else {
        setLastPasswordDigit(null);
        setShowPasswordModal(true);
      }
    } catch (error: any) {
      console.error("Error updating mission progress:", error);
      setError("更新任務進度時發生錯誤: " + (error?.message || JSON.stringify(error)));
    } finally {
      setButtonLoading(false);
      setIsProcessing(false);
    }
  };

  // 密碼彈窗
  const PasswordModal = () => (
    showPasswordModal ? (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-[var(--color-card)] rounded-2xl shadow-xl p-8 max-w-xs w-full text-center">
          <div className="text-2xl font-bold text-[var(--color-text)] mb-2">{lastPasswordDigit ? '密碼數字' : '完成檢查點'}</div>
          {lastPasswordDigit ? (
            <div className="text-5xl font-mono text-[var(--color-text)] mb-4 tracking-widest">{lastPasswordDigit}</div>
          ) : (
            <div className="text-lg text-[var(--color-text)] mb-4">已完成此檢查點！</div>
          )}
          <button
            className="w-full bg-[var(--color-primary)] text-[var(--color-bg)] py-2 rounded-xl font-semibold hover:bg-[var(--color-accent)] transition"
            onClick={async () => {
              setShowPasswordModal(false);
              const allCompleted = checkpoints.length > 0 && completedCheckpoints.length === checkpoints.length && checkpoints.every(cp => completedCheckpoints.includes(cp.id));
              if (allCompleted && currentIdx === checkpoints.length - 1 && mission) {
                setIsFinalizing(true);
              } else if (currentIdx < checkpoints.length - 1) {
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
      <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-[var(--color-card)] rounded-2xl shadow-xl p-8 max-w-xs w-full text-center">
          <div className="text-2xl font-bold text-[var(--color-text)] mb-2">剩餘時間提醒</div>
          <Image src={reminderImage} width={180} height={120} alt="提醒圖片" className="mx-auto mb-4" />
          <div className="text-lg text-[var(--color-text)] mb-4">
            剩餘 {timeLeft ? Math.floor(timeLeft/60) : 0} 分鐘
            {timeLeft && timeLeft % 60 > 0 ? ` ${timeLeft % 60} 秒` : ''}
          </div>
          <button 
            className="w-full bg-[var(--color-primary)] text-[var(--color-bg)] py-2 rounded-xl font-semibold hover:bg-[var(--color-accent)] transition" 
            onClick={() => setShowTimeReminder(false)}
          >
            確認
          </button>
        </div>
      </div>
    ) : null
  );

  useEffect(() => {
    if (isFinalizing && team && mission) {
      // 導向完成頁，並可加長緩衝時間
      setTimeout(() => {
        router.replace(`/missions/${id}/complete?teamId=${team.id}`);
      }, 800); // 800ms 緩衝
    }
  }, [isFinalizing, team, mission, id, router]);

  // 定時上傳自己位置到 Firestore
  useEffect(() => {
    if (!user || !teamId || !userLocation) return;
    const locationRef = doc(db, `teams/${teamId}/members/${user.uid}`);
    setDoc(locationRef, {
      lat: userLocation.lat,
      lng: userLocation.lng,
      displayName: user.displayName || "",
      avatarUrl: user.photoURL || "",
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }, [user, teamId, userLocation]);

  // 監聽所有團隊成員位置
  useEffect(() => {
    if (!teamId) return;
    const unsub = onSnapshot(collection(db, `teams/${teamId}/members`), (snap) => {
      const locs: Record<string, any> = {};
      snap.forEach(doc => {
        locs[doc.id] = doc.data();
      });
      setMemberLocations(locs);
    });
    return () => unsub();
  }, [teamId]);

  // 監聽通知
  useEffect(() => {
    if (!teamId) return;
    const unsub = onSnapshot(collection(db, `teams/${teamId}/notifications`), (snap) => {
      const notis: any[] = [];
      snap.forEach(doc => notis.push({ id: doc.id, ...doc.data() }));
      notis.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setNotifications(notis);
      setLatestNotification(notis[0]?.message || "");
    });
    return () => unsub();
  }, [teamId]);

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)]">載入中...</div>;
  }
  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)]/60">請先登入</div>;
  }
  if (!mission || checkpoints.length === 0) {
    return <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)]/60">找不到任務或檢查點</div>;
  }

  if (!currentCheckpointId) {
    if (completedCheckpoints.length === checkpoints.length && checkpoints.length > 0) {
      // 僅顯示等待用戶確認最後一個 passkey 彈窗
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)]">
          <div className="text-[var(--color-text)] mb-4">請確認最後一個密碼數字後，系統將自動導向...</div>
          <PasswordModal />
        </div>
      );
    } else {
      return <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)]/60">資料同步中，請稍候...</div>;
    }
  }
  const currentCheckpoint = checkpoints.find(cp => cp.id === currentCheckpointId);
  if (!currentCheckpoint) {
    return <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)]/60">資料同步中，請稍候...</div>;
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
          <div className="w-full p-4 bg-[var(--color-card)] rounded-xl border border-[var(--color-secondary)]">
            <p className="text-[var(--color-text)]/70">此檢查點沒有挑戰內容</p>
            <button
              className="w-full px-4 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-bg)] font-semibold mt-4 hover:bg-[var(--color-accent)] transition"
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
    return <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] text-red-500">{error}</div>;
  }

  return (
    <>
      <PasswordModal />
      <TimeReminderModal />
      <div className="min-h-screen flex flex-col items-center bg-[var(--color-bg)] pt-8 z-0">
        {/* 倒數計時器 */}
        {timeLeft !== null && mission && (
          <div className="w-full max-w-xl bg-[var(--color-card)] rounded-2xl shadow-lg border border-[var(--color-secondary)] p-4 mb-4">
            <div className="flex justify-between items-center">
              <div className="text-[var(--color-text)]/70">剩餘時間</div>
              <div className="text-2xl font-bold text-[var(--color-text)]">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
            </div>
            <div className="w-full bg-[var(--color-secondary)] rounded-full h-2 mt-2">
              <div 
                className="bg-[var(--color-primary)] h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.max(0, Math.min(100, (timeLeft / (parseInt(mission.estimatedDuration) * 60)) * 100))}%` 
                }}
              />
            </div>
          </div>
        )}
        <div className={`w-full max-w-xl bg-[var(--color-card)] rounded-2xl shadow-lg border border-[var(--color-secondary)] p-6 mb-6 ${showPasswordModal ? 'z-0 pointer-events-none' : ''}`}>
          <MapView
            checkpoints={checkpoints}
            startLocation={mission.startLocation}
            endLocation={mission.endLocation}
            userLocation={userLocation}
            members={memberLocations}
          />
          <div className="mt-4">
            <div className="text-lg font-bold text-[var(--color-text)] mb-1">目前檢查點：{currentCheckpoint.name}</div>
            <div className="text-[var(--color-text)]/70 mb-2">{currentCheckpoint.description}</div>
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
      {/* 通知 bar */}
      {latestNotification && (
        <div
          className="fixed top-0 left-0 w-full h-10 bg-[var(--color-primary)] text-[var(--color-bg)] flex items-center justify-center z-[1100] cursor-pointer shadow"
          onClick={() => setShowNotificationModal(true)}
          style={{ fontSize: '16px', fontWeight: 500 }}
        >
          {latestNotification}
        </div>
      )}
      {/* 歷史通知 modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-[var(--color-card)] rounded-2xl shadow-xl p-6 max-w-md w-full text-center relative">
            <button
              className="absolute top-2 right-2 text-[var(--color-text)] hover:text-[var(--color-primary)] text-2xl"
              onClick={() => setShowNotificationModal(false)}
            >×</button>
            <h2 className="text-xl font-bold mb-4 text-[var(--color-text)]">任務通知紀錄</h2>
            <div className="max-h-80 overflow-y-auto text-left space-y-2">
              {notifications.length === 0 ? (
                <div className="text-[var(--color-text)]/60 text-center">暫無通知</div>
              ) : notifications.map((n) => (
                <div key={n.id} className="p-2 rounded bg-[var(--color-secondary)] border border-[var(--color-secondary)]">
                  <div className="text-[var(--color-text)]">{n.message}</div>
                  <div className="text-xs text-[var(--color-text)]/50 mt-1">{n.createdAt?.toDate?.().toLocaleString?.() || ''}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
} 