"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import MapView from "@/components/MapView";

interface CheckpointType {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  description?: string;
  challengeDescription?: string;
  nextCheckpoint?: string;
}

export default function MissionDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [mission, setMission] = useState<any>(null);
  const [checkpoints, setCheckpoints] = useState<CheckpointType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      // 取得任務資料
      const missionSnap = await getDoc(doc(db, "missions", id as string));
      if (!missionSnap.exists()) return;
      const missionData = missionSnap.data();
      setMission(missionData);
      // 取得該任務所有 checkpoints
      const q = query(collection(db, "checkpoints"), where("missionId", "==", id));
      const cpSnap = await getDocs(q);
      // 先取得所有 checkpoint
      let checkpointsRaw = cpSnap.docs.map(doc => {
        const data = doc.data() as Omit<CheckpointType, "id">;
        return { ...data, id: doc.id };
      });
      // 用 nextCheckpoint 串連所有 checkpoint
      let ordered: CheckpointType[] = [];
      if (checkpointsRaw.length > 0) {
        const cpMap = Object.fromEntries(checkpointsRaw.map(cp => [cp.id, cp]));
        // 找到起點（沒有被其他 checkpoint 指向的）
        let start = checkpointsRaw.find(cp => !checkpointsRaw.some(c => c.nextCheckpoint === cp.id));
        let current = start;
        while (current) {
          ordered.push(current);
          current = current.nextCheckpoint ? cpMap[current.nextCheckpoint] : undefined;
        }
        // 若串連不完整，補上遺漏的點
        if (ordered.length < checkpointsRaw.length) {
          const missing = checkpointsRaw.filter(cp => !ordered.includes(cp));
          ordered = [...ordered, ...missing];
        }
      }
      setCheckpoints(ordered);
      setLoading(false);
    }
    fetchData();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-black">載入中...</div>;
  }
  if (!mission) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-400">找不到任務</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-white pt-8">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
        <div className="text-2xl font-bold text-black mb-2">{mission.title}</div>
        <div className="text-gray-600 mb-4">{mission.description}</div>
        <MapView
          checkpoints={checkpoints}
          startLocation={mission.startLocation}
          endLocation={mission.endLocation}
        />
        <div className="text-xs text-gray-500 mt-2">難度：{mission.difficulty || "-"}　預估時間：{mission.estimatedDuration || "-"}</div>
      </div>
      <div className="w-full max-w-xl space-y-4">
        {checkpoints.map((cp, idx) => (
          <div key={cp.id} className="bg-white border border-gray-200 rounded-xl shadow p-4">
            <div className="font-semibold text-black">{idx + 1}. {cp.name}</div>
            <div className="text-gray-600 text-sm">{cp.description}</div>
            <div className="text-xs text-gray-400 mt-1">{cp.challengeDescription}</div>
          </div>
        ))}
      </div>
      <button
        className="px-4 py-2 rounded-xl bg-black text-white font-semibold mt-4"
        onClick={() => router.push(`/missions/${id}/active`)}
      >
        開始任務
      </button>
    </div>
  );
} 