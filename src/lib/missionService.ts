import { db } from "./firebase";
import { collection, doc, setDoc, updateDoc, getDoc, query, where, getDocs } from "firebase/firestore";
import { UserMission, Mission, Checkpoint } from "@/types/mission";

// 啟動團隊任務
export async function startTeamMission(teamId: string, missionId: string) {
  // 先取得任務的第一個檢查點
  const q = query(collection(db, "checkpoints"), where("missionId", "==", missionId));
  const cpSnap = await getDocs(q);
  let checkpointsRaw = cpSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as { id: string; nextCheckpoint?: string }));
  
  // 找到起點（沒有被其他 checkpoint 指向的）
  let startCheckpoint = checkpointsRaw.find(cp => !checkpointsRaw.some(c => c.nextCheckpoint === cp.id));
  
  if (!startCheckpoint) {
    throw new Error("找不到任務起點");
  }

  const teamRef = doc(db, "teams", teamId);
  await updateDoc(teamRef, {
    activeMission: missionId,
    missionProgress: {
      currentCheckpoint: startCheckpoint.id,
      completedCheckpoints: [],
      collectedDigits: [],
      startedAt: new Date(),
      timeRemaining: null,
    },
  });
}

// 取得團隊進行中任務
export async function getActiveTeamMission(teamId: string) {
  const teamRef = doc(db, "teams", teamId);
  const teamSnap = await getDoc(teamRef);
  if (!teamSnap.exists()) return null;
  const data = teamSnap.data();
  if (!data.activeMission) return null;
  return {
    missionId: data.activeMission,
    missionProgress: data.missionProgress,
  };
}

// 更新團隊任務進度
export async function updateTeamMissionProgress(teamId: string, checkpointId: string, passwordDigit?: number) {
  const teamRef = doc(db, "teams", teamId);
  const teamSnap = await getDoc(teamRef);
  if (!teamSnap.exists()) throw new Error("找不到團隊");
  const progress = teamSnap.data().missionProgress || {};
  
  // 檢查檢查點是否已經完成
  if (progress.completedCheckpoints?.includes(checkpointId)) {
    throw new Error("此檢查點已完成");
  }

  // 查詢目前 checkpoint 的 nextCheckpoint
  const checkpointSnap = await getDoc(doc(db, "checkpoints", checkpointId));
  let nextCheckpoint = "";
  if (checkpointSnap.exists()) {
    nextCheckpoint = checkpointSnap.data().nextCheckpoint || "";
  }

  // 確保 collectedDigits 是數字陣列
  const currentDigits = progress.collectedDigits || [];
  const newDigits = passwordDigit !== undefined ? [...currentDigits, Number(passwordDigit)] : currentDigits;

  await updateDoc(teamRef, {
    "missionProgress.currentCheckpoint": nextCheckpoint,
    "missionProgress.completedCheckpoints": [...(progress.completedCheckpoints || []), checkpointId],
    "missionProgress.collectedDigits": newDigits,
  });
}

// 完成團隊任務並給所有成員加分
export async function completeTeamMission(teamId: string, missionId: string) {
  const teamRef = doc(db, "teams", teamId);
  const teamSnap = await getDoc(teamRef);
  if (!teamSnap.exists()) throw new Error("找不到團隊");
  const data = teamSnap.data();

  // 查詢任務難度
  const missionSnap = await getDoc(doc(db, "missions", missionId));
  let points = 0;
  if (missionSnap.exists()) {
    const difficulty = missionSnap.data().difficulty;
    if (difficulty === "easy") points = 5;
    else if (difficulty === "medium") points = 10;
    else if (difficulty === "hard") points = 20;
  }

  // 給所有成員加分並自動升級體能等級
  for (const member of data.members) {
    const userRef = doc(db, "users", member.userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const newPoints = (userData.points ?? 0) + points;
      let fitnessLevel = "beginner";
      if (newPoints >= 50) fitnessLevel = "advanced";
      else if (newPoints >= 25) fitnessLevel = "intermediate";
      // 更新 completedMissions
      const completedMissions = Array.isArray(userData.completedMissions) ? userData.completedMissions : [];
      const newCompletedMissions = completedMissions
        .filter((id: any) => typeof id === 'string' && id.trim() !== '')
        .includes(missionId)
        ? completedMissions
        : [...completedMissions, missionId].filter((id: any) => typeof id === 'string' && id.trim() !== '');
      await updateDoc(userRef, {
        points: newPoints,
        fitnessLevel,
        completedMissions: newCompletedMissions
      });
    }
  }

  // 團隊 completedMissions
  const teamCompletedMissions = Array.isArray(data.completedMissions) ? data.completedMissions : [];
  const newTeamCompletedMissions = teamCompletedMissions
    .filter((id: any) => typeof id === 'string' && id.trim() !== '')
    .includes(missionId)
    ? teamCompletedMissions
    : [...teamCompletedMissions, missionId].filter((id: any) => typeof id === 'string' && id.trim() !== '');

  // 記錄完成時間
  const completedAt = new Date();

  // 取得當前 missionProgress 並記錄到 completedMissionProgress 陣列
  const currentProgress = data.missionProgress || {};
  const completedMissionProgress = Array.isArray(data.completedMissionProgress) ? data.completedMissionProgress : [];
  const playCount = completedMissionProgress.filter((p: any) => p.missionId === missionId).length + 1;
  const newCompletedMissionProgress = [
    ...completedMissionProgress,
    {
      missionId,
      playCount,
      completedAt,
      ...currentProgress
    }
  ];

  // log for debug
  console.log('completeTeamMission:即將寫入', {
    teamId,
    missionId,
    newTeamCompletedMissions,
    activeMission: "",
    missionProgress: { completedAt },
    completedMissionProgress: newCompletedMissionProgress
  });

  // 先確保 missionProgress 清空、activeMission 清空、completedMissions 正確，並記錄 completedMissionProgress
  await updateDoc(teamRef, {
    activeMission: "",
    missionProgress: { completedAt },
    completedMissions: newTeamCompletedMissions,
    completedMissionProgress: newCompletedMissionProgress
  });
}

export async function getMissionWithCheckpoints(missionId: string): Promise<{
  mission: Mission;
  checkpoints: Checkpoint[];
}> {
  const missionSnap = await getDoc(doc(db, "missions", missionId));
  if (!missionSnap.exists()) {
    throw new Error("找不到任務");
  }
  const mission = { id: missionSnap.id, ...missionSnap.data() } as Mission;

  const q = query(collection(db, "checkpoints"), where("missionId", "==", missionId));
  const cpSnap = await getDocs(q);
  const checkpoints = cpSnap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Checkpoint[];

  return { mission, checkpoints };
} 