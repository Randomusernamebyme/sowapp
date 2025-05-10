import { db } from "./firebase";
import { collection, doc, setDoc, updateDoc, getDoc, query, where, getDocs } from "firebase/firestore";
import { UserMission, Mission, Checkpoint } from "@/types/mission";

export async function startMission(userId: string, missionId: string): Promise<string> {
  const userMissionRef = doc(collection(db, "userMissions"));
  const userMission: Omit<UserMission, "id"> = {
    userId,
    missionId,
    status: "active",
    currentCheckpoint: "", // 會在取得第一個檢查點後更新
    completedCheckpoints: [],
    collectedDigits: [],
    startedAt: new Date(),
  };
  await setDoc(userMissionRef, userMission);
  return userMissionRef.id;
}

export async function updateMissionProgress(
  userMissionId: string,
  checkpointId: string,
  passwordDigit?: number
): Promise<void> {
  const userMissionRef = doc(db, "userMissions", userMissionId);
  const userMissionSnap = await getDoc(userMissionRef);
  
  if (!userMissionSnap.exists()) {
    throw new Error("找不到任務進度記錄");
  }

  const userMission = userMissionSnap.data() as UserMission;
  const updates: Partial<UserMission> = {
    currentCheckpoint: checkpointId,
    completedCheckpoints: [...userMission.completedCheckpoints, checkpointId],
  };

  if (passwordDigit !== undefined) {
    updates.collectedDigits = [...userMission.collectedDigits, passwordDigit];
  }

  await updateDoc(userMissionRef, updates);
}

export async function completeMission(userMissionId: string): Promise<void> {
  const userMissionRef = doc(db, "userMissions", userMissionId);
  await updateDoc(userMissionRef, {
    status: "completed",
    completedAt: new Date(),
  });
}

export async function getActiveMission(userId: string): Promise<UserMission | null> {
  const q = query(
    collection(db, "userMissions"),
    where("userId", "==", userId),
    where("status", "==", "active")
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as UserMission;
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