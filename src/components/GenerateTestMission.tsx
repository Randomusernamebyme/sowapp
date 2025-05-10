"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc, getDoc } from "firebase/firestore";
import { CheckpointType } from "@/types/mission";
import { useAuth } from "@/contexts/AuthContext";

interface CheckpointData extends Omit<CheckpointType, 'id' | 'nextCheckpoint'> {
  nextCheckpoint?: string;
}

export default function GenerateTestMission() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        setIsAdmin(userData?.isAdmin === true);
      } catch (err) {
        console.error("檢查管理員狀態時出錯：", err);
      }
    };
    checkAdminStatus();
  }, [user]);

  const generateTestMission = async () => {
    if (!isAdmin) {
      setError("只有管理員才能生成測試任務");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // 創建任務
      const missionRef = doc(collection(db, "missions"));
      const missionData = {
        id: missionRef.id,
        title: "測試任務 - 四種挑戰",
        description: "這是一個包含所有類型挑戰的測試任務。",
        difficulty: "medium",
        startLocation: {
          lat: 22.2833,
          lng: 114.1500
        },
        endLocation: {
          lat: 22.2833,
          lng: 114.1500
        },
        estimatedDuration: "60",
        password: "123456",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(missionRef, missionData);

      // 創建檢查點
      const checkpoints: CheckpointData[] = [
        {
          name: "解謎挑戰點",
          description: "完成解謎挑戰",
          location: {
            lat: 22.2833,
            lng: 114.1500
          },
          challengeType: "puzzle",
          challengeDescription: "解開謎題：找出隱藏的密碼",
          clue: "密碼是三個字母的縮寫",
          passwordDigit: {
            position: 1,
            value: "1"
          },
          challengeConfig: {
            puzzle: {
              correctAnswer: "ABC",
              maxAttempts: 3
            }
          },
          missionId: missionRef.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          name: "體能挑戰點",
          description: "完成體能挑戰",
          location: {
            lat: 22.2833,
            lng: 114.1500
          },
          challengeType: "physical",
          challengeDescription: "完成 5 次跳躍",
          clue: "保持平衡",
          passwordDigit: {
            position: 2,
            value: "2"
          },
          challengeConfig: {
            physical: {
              timeLimit: 30,
              requiredReps: 5
            }
          },
          missionId: missionRef.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          name: "拍照挑戰點",
          description: "完成拍照挑戰",
          location: {
            lat: 22.2833,
            lng: 114.1500
          },
          challengeType: "photo",
          challengeDescription: "拍攝指定建築物的照片",
          clue: "確保照片清晰可見",
          passwordDigit: {
            position: 3,
            value: "3"
          },
          missionId: missionRef.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          name: "問答挑戰點",
          description: "完成問答挑戰",
          location: {
            lat: 22.2833,
            lng: 114.1500
          },
          challengeType: "quiz",
          challengeDescription: "回答關於香港的問題",
          clue: "仔細閱讀問題",
          passwordDigit: {
            position: 4,
            value: "4"
          },
          challengeConfig: {
            quiz: {
              options: [
                { id: "A", text: "香港島" },
                { id: "B", text: "九龍" },
                { id: "C", text: "新界" },
                { id: "D", text: "離島" }
              ],
              correctAnswer: "A",
              maxAttempts: 2
            }
          },
          missionId: missionRef.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      // 創建檢查點文檔並設置關聯
      const checkpointRefs = [];
      for (const checkpoint of checkpoints) {
        const checkpointRef = doc(collection(db, "checkpoints"));
        checkpointRefs.push(checkpointRef);
        await setDoc(checkpointRef, {
          ...checkpoint,
          id: checkpointRef.id
        });
      }

      // 更新檢查點之間的關聯
      for (let i = 0; i < checkpointRefs.length; i++) {
        if (i < checkpointRefs.length - 1) {
          await setDoc(checkpointRefs[i], {
            nextCheckpoint: checkpointRefs[i + 1].id
          }, { merge: true });
        }
      }

      alert("測試任務已成功創建！");
    } catch (err) {
      console.error("生成測試任務時出錯：", err);
      setError("生成測試任務時發生錯誤");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="w-full max-w-xl mx-auto p-4">
      <button
        onClick={generateTestMission}
        disabled={isGenerating}
        className={`w-full px-4 py-2 rounded-xl font-semibold transition
          ${isGenerating 
            ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
            : "bg-black text-white hover:bg-gray-800"
          }`}
      >
        {isGenerating ? "生成中..." : "生成測試任務"}
      </button>
      {error && (
        <p className="mt-2 text-red-500 text-sm">{error}</p>
      )}
    </div>
  );
} 