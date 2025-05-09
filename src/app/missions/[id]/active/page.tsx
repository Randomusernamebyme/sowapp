"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import MapView from "@/components/MapView";

function useUserLocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);
  return location;
}

export default function ActiveMissionPage() {
  const { id } = useParams();
  const [mission, setMission] = useState<any>(null);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const userLocation = useUserLocation();

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      const missionSnap = await getDoc(doc(db, "missions", id as string));
      if (!missionSnap.exists()) return;
      const missionData = missionSnap.data();
      setMission(missionData);
      const q = query(collection(db, "checkpoints"), where("missionId", "==", id));
      const cpSnap = await getDocs(q);
      let checkpointsRaw = cpSnap.docs.map(doc => {
        const data = doc.data() as any;
        return { ...data, id: doc.id };
      });
      // nextCheckpoint 串連
      let ordered: any[] = [];
      if (checkpointsRaw.length > 0) {
        const cpMap = Object.fromEntries(checkpointsRaw.map(cp => [cp.id, cp]));
        let start = checkpointsRaw.find(cp => !checkpointsRaw.some(c => c.nextCheckpoint === cp.id));
        let current = start;
        while (current) {
          ordered.push(current);
          current = current.nextCheckpoint ? cpMap[current.nextCheckpoint] : undefined;
        }
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
  if (!mission || checkpoints.length === 0) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-400">找不到任務或檢查點</div>;
  }

  const currentCheckpoint = checkpoints[currentIdx];

  return (
    <div className="min-h-screen flex flex-col items-center bg-white pt-8">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
        <MapView
          checkpoints={checkpoints}
          startLocation={mission.startLocation}
          endLocation={mission.endLocation}
          userLocation={userLocation}
        />
        <div className="mt-4">
          <div className="text-lg font-bold text-black mb-1">目前檢查點：{currentCheckpoint.name}</div>
          <div className="text-gray-600 mb-2">{currentCheckpoint.description}</div>
          <div className="text-xs text-gray-400 mb-2">{currentCheckpoint.challengeDescription}</div>
          {/* 這裡可根據 challengeType 顯示不同互動元件 */}
        </div>
        <div className="flex gap-2 mt-4">
          {currentIdx > 0 && (
            <button className="px-4 py-2 rounded-xl bg-gray-200 text-black font-semibold" onClick={() => setCurrentIdx(i => i - 1)}>上一個</button>
          )}
          {currentIdx < checkpoints.length - 1 && (
            <button className="px-4 py-2 rounded-xl bg-black text-white font-semibold" onClick={() => setCurrentIdx(i => i + 1)}>下一個</button>
          )}
        </div>
      </div>
    </div>
  );
} 