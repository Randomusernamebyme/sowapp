"use client";
import { useState } from "react";

interface PuzzleChallengeProps {
  description: string;
  clue: string;
  onComplete: () => void;
}

export default function PuzzleChallenge({ description, clue, onComplete }: PuzzleChallengeProps) {
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  const checkAnswer = () => {
    // 這裡可以加入答案驗證邏輯
    if (answer.trim() === "") {
      setError("請輸入答案");
      return;
    }
    onComplete();
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
        <button
          className="w-full px-4 py-2 rounded-xl bg-black text-white font-semibold"
          onClick={checkAnswer}
        >
          提交答案
        </button>
      </div>
    </div>
  );
} 