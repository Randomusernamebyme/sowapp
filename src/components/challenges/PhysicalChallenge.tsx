"use client";
import { useState, useEffect } from "react";

interface PhysicalChallengeProps {
  description: string;
  onComplete: () => void;
}

export default function PhysicalChallenge({ description, onComplete }: PhysicalChallengeProps) {
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const startChallenge = () => {
    setIsActive(true);
    setTimer(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full p-4 bg-white rounded-xl border border-gray-200">
      <h3 className="text-lg font-semibold text-black mb-2">體能挑戰</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      {!isActive ? (
        <button
          className="w-full px-4 py-2 rounded-xl bg-black text-white font-semibold"
          onClick={startChallenge}
        >
          開始挑戰
        </button>
      ) : (
        <div className="space-y-4">
          <div className="text-2xl font-mono text-center">{formatTime(timer)}</div>
          <button
            className="w-full px-4 py-2 rounded-xl bg-black text-white font-semibold"
            onClick={onComplete}
          >
            完成挑戰
          </button>
        </div>
      )}
    </div>
  );
} 