import { db } from "./firebase";
import { doc, setDoc, updateDoc, getDoc, Timestamp } from "firebase/firestore";

export interface CheckpointResult {
  completedAt: Timestamp;
  challengeType: string;
  result?: any;
}

export interface UserMissionProgress {
  userId: string;
  missionId: string;
  status: "active" | "completed";
  currentCheckpoint: number;
  startTime: Timestamp;
  completedCheckpoints: {
    [key: string]: CheckpointResult;
  };
  collectedDigits: string[];
  endTime?: Timestamp;
}

export async function startMission(userId: string, missionId: string) {
  const docId = `${userId}_${missionId}`;
  const progress: UserMissionProgress = {
    userId,
    missionId,
    status: "active",
    currentCheckpoint: 0,
    startTime: Timestamp.now(),
    completedCheckpoints: {},
    collectedDigits: [],
  };
  await setDoc(doc(db, "userMissions", docId), progress);
  return progress;
}

export async function completeCheckpoint(
  userId: string,
  missionId: string,
  checkpointId: string,
  challengeType: string,
  result?: any
) {
  const docId = `${userId}_${missionId}`;
  const progressRef = doc(db, "userMissions", docId);
  const progressSnap = await getDoc(progressRef);
  
  if (!progressSnap.exists()) {
    throw new Error("找不到任務進度");
  }

  const progress = progressSnap.data() as UserMissionProgress;
  
  await updateDoc(progressRef, {
    currentCheckpoint: progress.currentCheckpoint + 1,
    [`completedCheckpoints.${checkpointId}`]: {
      completedAt: Timestamp.now(),
      challengeType,
      result,
    },
  });
}

export async function completeMission(userId: string, missionId: string) {
  const docId = `${userId}_${missionId}`;
  const progressRef = doc(db, "userMissions", docId);
  
  await updateDoc(progressRef, {
    status: "completed",
    endTime: Timestamp.now(),
  });
}

export async function getMissionProgress(userId: string, missionId: string) {
  const docId = `${userId}_${missionId}`;
  const progressSnap = await getDoc(doc(db, "userMissions", docId));
  
  if (!progressSnap.exists()) {
    return null;
  }
  
  return progressSnap.data() as UserMissionProgress;
} 