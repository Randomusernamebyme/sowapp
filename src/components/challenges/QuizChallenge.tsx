import { useState } from "react";

interface QuizOption {
  id: string;
  text: string;
}

interface QuizChallengeProps {
  description: string;
  clue: string;
  onComplete: (answer: string) => void;
  options: QuizOption[];
  correctAnswer: string;
  maxAttempts?: number;
}

export default function QuizChallenge({ 
  description, 
  clue, 
  onComplete,
  options,
  correctAnswer,
  maxAttempts = 2
}: QuizChallengeProps) {
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const checkAnswer = () => {
    if (!selectedOption) {
      setError("請選擇一個答案");
      return;
    }

    if (attempts >= maxAttempts) {
      setError(`已達到最大嘗試次數 (${maxAttempts}次)`);
      return;
    }

    setAttempts(prev => prev + 1);

    if (selectedOption === correctAnswer) {
      setIsComplete(true);
      onComplete(selectedOption);
    } else {
      setError("答案不正確，請再試一次");
      if (attempts + 1 >= maxAttempts) {
        setShowHint(true);
      }
    }
  };

  return (
    <div className="w-full p-4 bg-white rounded-xl border border-gray-200">
      <h3 className="text-lg font-semibold text-black mb-2">問答挑戰</h3>
      <p className="text-gray-600 mb-2">{description}</p>
      <p className="text-sm text-gray-500 mb-4">提示：{clue}</p>
      <div className="space-y-4">
        <div className="space-y-2">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                setSelectedOption(option.id);
                setError("");
              }}
              className={`w-full px-4 py-3 rounded-xl border text-left transition
                ${selectedOption === option.id 
                  ? "border-black bg-black text-white" 
                  : "border-gray-200 hover:border-gray-300"
                }
                ${isComplete ? "opacity-50 cursor-not-allowed" : ""}
              `}
              disabled={isComplete}
            >
              {option.text}
            </button>
          ))}
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {showHint && (
          <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
            提示：仔細思考 {clue} 的含義
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">
            剩餘嘗試次數：{maxAttempts - attempts}
          </span>
          <button
            className="px-4 py-2 rounded-xl bg-black text-white font-semibold"
            onClick={checkAnswer}
            disabled={isComplete}
          >
            {isComplete ? "回答正確！" : "提交答案"}
          </button>
        </div>
      </div>
    </div>
  );
} 