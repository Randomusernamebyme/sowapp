import { db } from "./firebase";
import { collection, doc, setDoc, updateDoc, getDoc, query, where, getDocs } from "firebase/firestore";
import { UserMission, Mission, Checkpoint } from "@/types/mission";

// 啟動團隊任務
export async function startTeamMission(teamId: string, missionId: string) {
  const teamRef = doc(db, "teams", teamId);
  await updateDoc(teamRef, {
    activeMission: missionId,
    missionProgress: {
      currentCheckpoint: "",
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
  // 查詢目前 checkpoint 的 nextCheckpoint
  const checkpointSnap = await getDoc(doc(db, "checkpoints", checkpointId));
  let nextCheckpoint = "";
  if (checkpointSnap.exists()) {
    nextCheckpoint = checkpointSnap.data().nextCheckpoint || "";
  }
  await updateDoc(teamRef, {
    "missionProgress.currentCheckpoint": nextCheckpoint,
    "missionProgress.completedCheckpoints": [...(progress.completedCheckpoints || []), checkpointId],
    "missionProgress.collectedDigits": passwordDigit !== undefined ? [...(progress.collectedDigits || []), passwordDigit] : progress.collectedDigits,
  });
}

// 完成團隊任務並給所有成員加分
export async function completeTeamMission(teamId: string) {
  const teamRef = doc(db, "teams", teamId);
  const teamSnap = await getDoc(teamRef);
  if (!teamSnap.exists()) throw new Error("找不到團隊");
  const data = teamSnap.data();
  const missionId = data.activeMission;
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
      const newPoints = (userData.points || 0) + points;
      let fitnessLevel = "beginner";
      if (newPoints >= 50) fitnessLevel = "advanced";
      else if (newPoints >= 25) fitnessLevel = "intermediate";
      await updateDoc(userRef, {
        points: newPoints,
        fitnessLevel
      });
    }
  }
  await updateDoc(teamRef, {
    activeMission: "",
    completedMissions: [...(data.completedMissions || []), data.activeMission],
    missionProgress: {},
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