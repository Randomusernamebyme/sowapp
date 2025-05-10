"use client";
import { useState, useEffect } from "react";

interface PhysicalChallengeProps {
  description: string;
  onComplete: () => void;
  timeLimit?: number; // 時間限制（秒）
  requiredReps?: number; // 需要完成的次數
}

export default function PhysicalChallenge({ 
  description, 
  onComplete,
  timeLimit = 60,
  requiredReps = 10
}: PhysicalChallengeProps) {
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [reps, setReps] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && !isComplete) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev >= timeLimit) {
            setIsActive(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLimit, isComplete]);

  const startChallenge = () => {
    setIsActive(true);
    setTimer(0);
    setReps(0);
    setIsComplete(false);
  };

  const addRep = () => {
    if (!isActive || isComplete) return;
    
    setReps(prev => {
      const newReps = prev + 1;
      if (newReps >= requiredReps) {
        setIsComplete(true);
        setIsActive(false);
        onComplete();
      }
      return newReps;
    });
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
          <div className="flex justify-between items-center">
            <div className="text-2xl font-mono">{formatTime(timer)}</div>
            <div className="text-lg">
              完成次數：{reps}/{requiredReps}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-black h-2 rounded-full transition-all duration-300"
              style={{ width: `${(reps / requiredReps) * 100}%` }}
            />
          </div>
          <button
            className="w-full px-4 py-2 rounded-xl bg-black text-white font-semibold"
            onClick={addRep}
            disabled={isComplete}
          >
            {isComplete ? "挑戰完成！" : "完成一次"}
          </button>
          {timer >= timeLimit && !isComplete && (
            <p className="text-red-500 text-center">
              時間到！請重新開始挑戰
            </p>
          )}
        </div>
      )}
    </div>
  );
} 