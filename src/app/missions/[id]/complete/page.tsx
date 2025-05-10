"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Mission, UserMission } from "@/types/mission";

export default function MissionCompletePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [mission, setMission] = useState<Mission | null>(null);
  const [userMission, setUserMission] = useState<UserMission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user || !id) return;
      // 取得任務資料
      const missionSnap = await getDoc(doc(db, "missions", id as string));
      if (missionSnap.exists()) {
        setMission({ id: missionSnap.id, ...missionSnap.data() } as Mission);
      }
      // 取得用戶任務進度
      const q = query(
        collection(db, "userMissions"),
        where("userId", "==", user.uid),
        where("missionId", "==", id)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        setUserMission({ id: docSnap.id, ...docSnap.data() } as UserMission);
      }
      setLoading(false);
    }
    fetchData();
  }, [user, id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-black">載入中...</div>;
  }
  if (!mission || !userMission) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-400">找不到任務資料</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-white pt-8">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6 text-center">
        <h1 className="text-2xl font-bold text-black mb-2">任務完成！</h1>
        <div className="text-lg text-gray-700 mb-4">{mission.title}</div>
        <div className="mb-4">
          <div className="text-gray-600">完成時間：</div>
          <div className="font-semibold text-black">{userMission.completedAt ? new Date(userMission.completedAt).toLocaleString() : "-"}</div>
        </div>
        <div className="mb-4">
          <div className="text-gray-600">收集到的密碼數字：</div>
          <div className="font-mono text-xl tracking-widest text-black">
            {userMission.collectedDigits && userMission.collectedDigits.length > 0
              ? userMission.collectedDigits.join(" ")
              : "-"}
          </div>
        </div>
        <div className="mb-4">
          <div className="text-gray-600">完成檢查點數量：</div>
          <div className="font-semibold text-black">{userMission.completedCheckpoints.length}</div>
        </div>
        <div className="flex flex-col gap-3 mt-6">
          <button
            className="w-full bg-black text-white py-3 rounded-xl font-semibold shadow hover:bg-gray-800 transition"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `我完成了「${mission.title}」任務！`,
                  text: `我在 Seek our Ways 完成了「${mission.title}」，快來挑戰吧！`,
                  url: window.location.origin + `/missions/${id}`,
                });
              } else {
                alert("已複製分享連結！");
                navigator.clipboard.writeText(window.location.origin + `/missions/${id}`);
              }
            }}
          >
            分享結果
          </button>
          <button
            className="w-full bg-gray-200 text-black py-3 rounded-xl font-semibold shadow hover:bg-gray-300 transition"
            onClick={() => router.push("/dashboard")}
          >
            返回首頁
          </button>
        </div>
      </div>
    </div>
  );
} 