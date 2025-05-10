"use client";
import { useState } from "react";

interface PuzzleChallengeProps {
  description: string;
  clue: string;
  onComplete: (answer: string) => void;
  correctAnswer: string;
  maxAttempts?: number;
}

export default function PuzzleChallenge({ 
  description, 
  clue, 
  onComplete, 
  correctAnswer,
  maxAttempts = 3 
}: PuzzleChallengeProps) {
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const checkAnswer = () => {
    if (answer.trim() === "") {
      setError("請輸入答案");
      return;
    }

    if (attempts >= maxAttempts) {
      setError(`已達到最大嘗試次數 (${maxAttempts}次)`);
      return;
    }

    setAttempts(prev => prev + 1);

    if (answer.toLowerCase() === correctAnswer.toLowerCase()) {
      onComplete(answer);
    } else {
      setError("答案不正確，請再試一次");
      if (attempts + 1 >= maxAttempts) {
        setShowHint(true);
      }
    }
  };

  return (
    <div className="w-full p-4 bg-white rounded-xl border border-gray-200">
      <h3 className="text-lg font-semibold text-black mb-2">解謎挑戰</h3>
      <p className="text-gray-600 mb-2">{description}</p>
      <p className="text-sm text-gray-500 mb-4">提示：{clue}</p>
      <div className="space-y-4">
        <input
          type="text"
          value={answer}
          onChange={(e) => {
            setAnswer(e.target.value);
            setError("");
          }}
          placeholder="輸入你的答案"
          className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-black"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {showHint && (
          <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
            提示：答案與 {clue} 有關
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">
            剩餘嘗試次數：{maxAttempts - attempts}
          </span>
          <button
            className="px-4 py-2 rounded-xl bg-black text-white font-semibold"
            onClick={checkAnswer}
          >
            提交答案
          </button>
        </div>
      </div>
    </div>
  );
} 