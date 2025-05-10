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

  const generateHKUWestMission = async () => {
    if (!isAdmin) {
      setError("只有管理員才能生成任務");
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      // 創建任務
      const missionRef = doc(collection(db, "missions"));
      const missionData = {
        id: missionRef.id,
        title: "港島西路線",
        description: "從香港大學出發，途經西寶城、堅尼地城泳池、卑路乍街市、堅尼地城遊樂園，最終到達龍虎山。",
        difficulty: "medium",
        startLocation: { lat: 22.2831, lng: 114.1371 }, // 香港大學
        endLocation: { lat: 22.2821, lng: 114.1292 },   // 龍虎山
        estimatedDuration: "90",
        password: "1234",
        isActive: true,
        cover: "/missions/hku-west-route.jpg",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(missionRef, missionData);
      // 檢查點資料
      const checkpoints: CheckpointData[] = [
        {
          name: "西寶城 (貝沙灣站)",
          description: "購物站，完成指定小任務。",
          location: { lat: 22.2826, lng: 114.1297 },
          challengeType: "puzzle",
          challengeDescription: "請在西寶城內找到一個以海洋為主題的裝置並拍照。",
          clue: "留意商場中庭。",
          passwordDigit: { position: 1, value: "1" },
          challengeConfig: { puzzle: { correctAnswer: "海洋雕塑", maxAttempts: 3 } },
          missionId: missionRef.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          name: "堅尼地城泳池",
          description: "到泳池外完成拍照任務。",
          location: { lat: 22.2828, lng: 114.1272 },
          challengeType: "photo",
          challengeDescription: "與泳池標誌合照。",
          clue: "泳池正門外。",
          passwordDigit: { position: 2, value: "2" },
          missionId: missionRef.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          name: "卑路乍街市",
          description: "完成市場內的問答挑戰。",
          location: { lat: 22.2837, lng: 114.1291 },
          challengeType: "quiz",
          challengeDescription: "請問卑路乍街市有多少層？",
          clue: "留意市場入口的樓層指示。",
          passwordDigit: { position: 3, value: "3" },
          challengeConfig: { quiz: { options: [ { id: "A", text: "1" }, { id: "B", text: "2" }, { id: "C", text: "3" }, { id: "D", text: "4" } ], correctAnswer: "C", maxAttempts: 2 } },
          missionId: missionRef.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          name: "堅尼地城遊樂園",
          description: "完成體能挑戰。",
          location: { lat: 22.2822, lng: 114.1276 },
          challengeType: "physical",
          challengeDescription: "在籃球場完成 10 次投籃。",
          clue: "遊樂園內的籃球場。",
          passwordDigit: { position: 4, value: "4" },
          challengeConfig: { physical: { timeLimit: 120, requiredReps: 10 } },
          missionId: missionRef.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      // 創建檢查點文檔並設置關聯
      const checkpointRefs = [];
      for (const checkpoint of checkpoints) {
        const checkpointRef = doc(collection(db, "checkpoints"));
        checkpointRefs.push(checkpointRef);
        await setDoc(checkpointRef, { ...checkpoint, id: checkpointRef.id });
      }
      // 更新檢查點之間的 nextCheckpoint
      for (let i = 0; i < checkpointRefs.length; i++) {
        if (i < checkpointRefs.length - 1) {
          await setDoc(checkpointRefs[i], { nextCheckpoint: checkpointRefs[i + 1].id }, { merge: true });
        }
      }
      alert("港島西路線任務已成功創建！");
    } catch (err) {
      console.error("生成港島西路線任務時出錯：", err);
      setError("生成港島西路線任務時發生錯誤");
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
        onClick={generateHKUWestMission}
        disabled={isGenerating}
        className={`w-full px-4 py-2 rounded-xl font-semibold transition
          ${isGenerating 
            ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
            : "bg-black text-white hover:bg-gray-800"
          }`}
      >
        {isGenerating ? "生成中..." : "一鍵生成港島西路線任務"}
      </button>
      {error && (
        <p className="mt-2 text-red-500 text-sm">{error}</p>
      )}
    </div>
  );
} 