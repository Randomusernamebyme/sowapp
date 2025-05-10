import { db } from "./config";
import { doc, setDoc, updateDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

export interface MissionProgress {
  userId: string;
  missionId: string;
  currentCheckpoint: string;
  completedCheckpoints: string[];
  collectedDigits: string[];
  startedAt: Date;
  lastUpdatedAt: Date;
}

export async function startMission(userId: string, missionId: string, firstCheckpointId: string) {
  const progressRef = doc(db, "missionProgress", `${userId}_${missionId}`);
  const progress: MissionProgress = {
    userId,
    missionId,
    currentCheckpoint: firstCheckpointId,
    completedCheckpoints: [],
    collectedDigits: [],
    startedAt: new Date(),
    lastUpdatedAt: new Date(),
  };
  await setDoc(progressRef, progress);
  return progress;
}

export async function updateMissionProgress(
  userId: string,
  missionId: string,
  checkpointId: string,
  digit?: string
) {
  const progressRef = doc(db, "missionProgress", `${userId}_${missionId}`);
  const progressSnap = await getDoc(progressRef);
  
  if (!progressSnap.exists()) {
    throw new Error("找不到任務進度");
  }

  const progress = progressSnap.data() as MissionProgress;
  const updates: Partial<MissionProgress> = {
    completedCheckpoints: [...progress.completedCheckpoints, checkpointId],
    lastUpdatedAt: new Date(),
  };

  if (digit) {
    updates.collectedDigits = [...progress.collectedDigits, digit];
  }

  await updateDoc(progressRef, updates);
  return { ...progress, ...updates };
}

export async function getMissionProgress(userId: string, missionId: string) {
  const progressRef = doc(db, "missionProgress", `${userId}_${missionId}`);
  const progressSnap = await getDoc(progressRef);
  return progressSnap.exists() ? (progressSnap.data() as MissionProgress) : null;
}

export async function getUserActiveMissions(userId: string) {
  const q = query(collection(db, "missionProgress"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as MissionProgress);
} 