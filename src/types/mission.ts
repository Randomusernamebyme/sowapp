export interface UserMission {
  id: string;
  userId: string;
  missionId: string;
  status: "active" | "completed" | "abandoned";
  currentCheckpoint: string;
  completedCheckpoints: string[];
  collectedDigits: number[];
  startedAt: Date;
  completedAt?: Date;
  teamId?: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
  estimatedDuration: string;
  password: string;
  isActive: boolean;
}

export interface Checkpoint {
  id: string;
  missionId: string;
  name: string;
  location: { lat: number; lng: number };
  description?: string;
  challengeDescription?: string;
  challengeType?: "physical" | "puzzle" | "photo";
  clue?: string;
  nextCheckpoint?: string;
  passwordDigit?: { position: number; value: number };
} 