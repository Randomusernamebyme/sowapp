import { db } from "./firebase";
import { doc, setDoc, updateDoc, getDoc, Timestamp } from "firebase/firestore";

export interface CheckpointProgress {
  completed: boolean;
  completedAt?: Timestamp;
  challengeData?: {
    type: "physical" | "puzzle" | "photo";
    time?: number;
    answer?: string;
    photoUrl?: string;
  };
}

export interface MissionProgress {
  userId: string;
  missionId: string;
  status: "active" | "completed";
  currentCheckpoint: number;
  startTime: Timestamp;
  endTime?: Timestamp;
  checkpoints: {
    [checkpointId: string]: CheckpointProgress;
  };
}

export async function startMission(userId: string, missionId: string, checkpointIds: string[]) {
  const progressId = `${userId}_${missionId}`;
  const progress: MissionProgress = {
    userId,
    missionId,
    status: "active",
    currentCheckpoint: 0,
    startTime: Timestamp.now(),
    checkpoints: Object.fromEntries(
      checkpointIds.map(id => [
        id,
        {
          completed: false
        }
      ])
    )
  };

  await setDoc(doc(db, "userMissions", progressId), progress);
  return progress;
}

export async function updateCheckpointProgress(
  userId: string,
  missionId: string,
  checkpointId: string,
  challengeData?: CheckpointProgress["challengeData"]
) {
  const progressId = `${userId}_${missionId}`;
  const progressRef = doc(db, "userMissions", progressId);
  const progressSnap = await getDoc(progressRef);

  if (!progressSnap.exists()) {
    throw new Error("找不到任務進度");
  }

  const progress = progressSnap.data() as MissionProgress;
  const checkpointProgress = progress.checkpoints[checkpointId];

  if (!checkpointProgress) {
    throw new Error("找不到檢查點進度");
  }

  await updateDoc(progressRef, {
    [`checkpoints.${checkpointId}`]: {
      completed: true,
      completedAt: Timestamp.now(),
      challengeData
    },
    currentCheckpoint: progress.currentCheckpoint + 1
  });
}

export async function completeMission(userId: string, missionId: string) {
  const progressId = `${userId}_${missionId}`;
  const progressRef = doc(db, "userMissions", progressId);
  
  await updateDoc(progressRef, {
    status: "completed",
    endTime: Timestamp.now()
  });
}

export async function getMissionProgress(userId: string, missionId: string) {
  const progressId = `${userId}_${missionId}`;
  const progressSnap = await getDoc(doc(db, "userMissions", progressId));
  
  if (!progressSnap.exists()) {
    return null;
  }

  return progressSnap.data() as MissionProgress;
} 