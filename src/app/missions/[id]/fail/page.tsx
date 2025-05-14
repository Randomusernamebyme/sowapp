"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc, arrayUnion, setDoc } from "firebase/firestore";

export default function MissionFailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = searchParams.get("teamId");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    async function handleFail() {
      if (!teamId || !id) return;
      try {
        const teamRef = doc(db, "teams", teamId);
        const teamSnap = await getDoc(teamRef);
        if (!teamSnap.exists()) return;
        const teamData = teamSnap.data();
        // 將 activeMission 移到 missionFailed
        await updateDoc(teamRef, {
          missionFailed: arrayUnion(id),
          missionFailedProgress: arrayUnion({
            missionId: id,
            failedAt: new Date(),
            missionProgress: teamData.missionProgress || {},
          }),
          activeMission: "",
          missionProgress: {},
        });
        setLoading(false);
      } catch (err: any) {
        setError("紀錄失敗，請稍後再試");
        setLoading(false);
      }
    }
    handleFail();
  }, [teamId, id]);

  const handleRetry = async () => {
    if (!teamId || !id) return;
    setRetrying(true);
    try {
      // 重新啟動同一任務
      const teamRef = doc(db, "teams", teamId);
      await updateDoc(teamRef, {
        activeMission: id,
        missionProgress: {
          startedAt: new Date(),
          completedCheckpoints: [],
          collectedDigits: [],
        },
      });
      router.replace(`/missions/${id}/active?teamId=${teamId}`);
    } catch (err) {
      setError("重新開始任務失敗，請稍後再試");
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-black">處理中...</div>;
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-red-500">{error}</div>;
  }
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <h1 className="text-3xl font-bold text-red-600 mb-4">任務失敗</h1>
      <p className="text-gray-700 mb-6">很遺憾，這次任務未能完成。請再接再厲！</p>
      <button
        className="px-6 py-2 bg-black text-white rounded-xl font-bold text-lg hover:bg-gray-800 transition"
        onClick={handleRetry}
        disabled={retrying}
      >
        {retrying ? "啟動中..." : "再試一次"}
      </button>
      <a href="/missions" className="mt-4 text-gray-500 underline">返回任務列表</a>
    </div>
  );
} 