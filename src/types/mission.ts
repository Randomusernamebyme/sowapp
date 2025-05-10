export interface MissionProgress {
  id: string;
  userId: string;
  missionId: string;
  currentCheckpoint: string;
  completedCheckpoints: string[];
  collectedDigits: string[];
  startedAt: Date;
  completedAt: Date | null;
  status: "active" | "completed" | "abandoned";
  teamId?: string;
} 