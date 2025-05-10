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
  await updateDoc(teamRef, {
    "missionProgress.currentCheckpoint": checkpointId,
    "missionProgress.completedCheckpoints": [...(progress.completedCheckpoints || []), checkpointId],
    "missionProgress.collectedDigits": passwordDigit !== undefined ? [...(progress.collectedDigits || []), passwordDigit] : progress.collectedDigits,
  });
}

// 完成團隊任務
export async function completeTeamMission(teamId: string) {
  const teamRef = doc(db, "teams", teamId);
  const teamSnap = await getDoc(teamRef);
  if (!teamSnap.exists()) throw new Error("找不到團隊");
  const data = teamSnap.data();
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