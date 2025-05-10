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

export type CheckpointType = {
  id: string;
  name: string;
  description: string;
  location: {
    lat: number;
    lng: number;
  };
  challengeType: "physical" | "puzzle" | "photo" | "quiz";
  challengeDescription: string;
  clue: string;
  passwordDigit: {
    position: number;
    value: string;
  };
  nextCheckpoint?: string;
  missionId: string;
  createdAt: string;
  updatedAt: string;
}; 