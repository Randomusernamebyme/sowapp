import { db } from "./firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  query, 
  where, 
  getDocs
} from "firebase/firestore";
import { MissionProgress } from "@/types/mission";

// 開始新任務
export async function startMission(userId: string, missionId: string, teamId?: string) {
  const progressRef = doc(collection(db, "missionProgress"));
  const progress: Omit<MissionProgress, "id"> = {
    userId,
    missionId,
    currentCheckpoint: "", // 會在取得第一個檢查點後更新
    completedCheckpoints: [],
    collectedDigits: [],
    startedAt: new Date(),
    completedAt: null,
    status: "active",
    teamId
  };
  await setDoc(progressRef, progress);
  return progressRef.id;
}

// 更新當前檢查點
export async function updateCurrentCheckpoint(progressId: string, checkpointId: string) {
  const progressRef = doc(db, "missionProgress", progressId);
  await updateDoc(progressRef, {
    currentCheckpoint: checkpointId
  });
}

// 完成檢查點
export async function completeCheckpoint(progressId: string, checkpointId: string, digit?: string) {
  const progressRef = doc(db, "missionProgress", progressId);
  const progressSnap = await getDoc(progressRef);
  if (!progressSnap.exists()) return;

  const progress = progressSnap.data();
  const completedCheckpoints = [...progress.completedCheckpoints, checkpointId];
  const collectedDigits = digit ? [...progress.collectedDigits, digit] : progress.collectedDigits;

  await updateDoc(progressRef, {
    completedCheckpoints,
    collectedDigits
  });
}

// 完成任務
export async function completeMission(progressId: string) {
  const progressRef = doc(db, "missionProgress", progressId);
  await updateDoc(progressRef, {
    status: "completed",
    completedAt: new Date()
  });
}

// 放棄任務
export async function abandonMission(progressId: string) {
  const progressRef = doc(db, "missionProgress", progressId);
  await updateDoc(progressRef, {
    status: "abandoned",
    completedAt: new Date()
  });
}

// 取得用戶的進行中任務
export async function getActiveMission(userId: string) {
  const q = query(
    collection(db, "missionProgress"),
    where("userId", "==", userId),
    where("status", "==", "active")
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as MissionProgress;
}

// 取得團隊的進行中任務
export async function getTeamActiveMission(teamId: string) {
  const q = query(
    collection(db, "missionProgress"),
    where("teamId", "==", teamId),
    where("status", "==", "active")
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as MissionProgress;
} 