import { useState } from "react";

interface QuizChallengeProps {
  description: string;
  clue: string;
  onComplete: (answer: string) => void;
}

export default function QuizChallenge({ description, clue, onComplete }: QuizChallengeProps) {
  const [answer, setAnswer] = useState("");

  return (
    <div className="w-full p-4 bg-white rounded-xl border border-gray-200">
      <h3 className="text-lg font-semibold text-black mb-2">{description}</h3>
      <p className="text-gray-600 mb-4">{clue}</p>
      <input
        type="text"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="請輸入答案"
        className="w-full px-4 py-2 rounded-xl border border-gray-200 mb-4"
      />
      <button
        className="w-full px-4 py-2 rounded-xl bg-black text-white font-semibold"
        onClick={() => onComplete(answer)}
      >
        提交答案
      </button>
    </div>
  );
} 