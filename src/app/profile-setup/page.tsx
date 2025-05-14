"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Image from "next/image";
import { CHECKPOINT_TYPES, GEOGRAPHICAL_AREAS, MISSION_TYPES } from "@/lib/constants";
import { useTheme } from "@/contexts/ThemeContext";

const AVATAR_OPTIONS = [
  "/avatars/avatar1.png",
  "/avatars/avatar2.png",
  "/avatars/avatar3.png",
  "/avatars/avatar4.png",
];

export default function ProfileSetupPage() {
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);
  const [selectedCheckpointTypes, setSelectedCheckpointTypes] = useState<string[]>([]);
  const [selectedGeographicalAreas, setSelectedGeographicalAreas] = useState<string[]>([]);
  const [selectedMissionTypes, setSelectedMissionTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth");
        return;
      }
      // 載入現有用戶資料
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setDisplayName(data.displayName || "");
        setDescription(data.description || "");
        setSelectedAvatar(data.avatar || AVATAR_OPTIONS[0]);
        setSelectedCheckpointTypes(data.preferredCheckpointTypes || []);
        setSelectedGeographicalAreas(data.preferredGeographicalAreas || []);
        setSelectedMissionTypes(data.preferredMissionTypes || []);
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setError("請先登入");
        setLoading(false);
        return;
      }
      try {
        await setDoc(doc(db, "users", user.uid), {
          displayName,
          description,
          avatar: selectedAvatar,
          preferredCheckpointTypes: selectedCheckpointTypes,
          preferredGeographicalAreas: selectedGeographicalAreas,
          preferredMissionTypes: selectedMissionTypes,
          email: user.email,
          updatedAt: new Date(),
        }, { merge: true });
        router.push("/dashboard");
      } catch (err: any) {
        setError("儲存失敗，請重試");
      } finally {
        setLoading(false);
      }
    });
  };

  const toggleCheckpointType = (typeId: string) => {
    setSelectedCheckpointTypes(prev =>
      prev.includes(typeId)
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  const toggleGeographicalArea = (areaId: string) => {
    setSelectedGeographicalAreas(prev =>
      prev.includes(areaId)
        ? prev.filter(id => id !== areaId)
        : [...prev, areaId]
    );
  };

  const toggleMissionType = (typeId: string) => {
    setSelectedMissionTypes(prev =>
      prev.includes(typeId)
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <h1 className="text-2xl font-bold mb-6 text-center text-black tracking-tight">個人檔案設定</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 頭像選擇 */}
            <div>
              <label className="block text-gray-700 mb-2">選擇頭像</label>
              <div className="grid grid-cols-3 gap-4">
                {AVATAR_OPTIONS.map((avatar, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedAvatar(avatar)}
                    className={`p-2 rounded-xl border-2 transition ${
                      selectedAvatar === avatar
                        ? "border-black"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Image
                      src={avatar}
                      alt={`Avatar ${index + 1}`}
                      width={80}
                      height={80}
                      className="rounded-lg"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* 基本資料 */}
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">暱稱</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-black focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">個人描述</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-black focus:outline-none focus:ring-2 focus:ring-black"
                  rows={3}
                  placeholder="簡單介紹一下自己..."
                />
              </div>
            </div>

            {/* 興趣標籤 */}
            <div>
              <label className="block text-gray-700 mb-2">感興趣的檢查點類型</label>
              <div className="flex flex-wrap gap-2">
                {CHECKPOINT_TYPES.map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => toggleCheckpointType(type.id)}
                    className={`px-4 py-2 rounded-full text-sm transition ${
                      selectedCheckpointTypes.includes(type.id)
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 地理區域偏好 */}
            <div>
              <label className="block text-gray-700 mb-2">感興趣的地理區域</label>
              <div className="flex flex-wrap gap-2">
                {GEOGRAPHICAL_AREAS.map(area => (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => toggleGeographicalArea(area.id)}
                    className={`px-4 py-2 rounded-full text-sm transition ${
                      selectedGeographicalAreas.includes(area.id)
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {area.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 任務類型偏好 */}
            <div>
              <label className="block text-gray-700 mb-2">感興趣的任務類型</label>
              <div className="flex flex-wrap gap-2">
                {MISSION_TYPES.map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => toggleMissionType(type.id)}
                    className={`px-4 py-2 rounded-full text-sm transition ${
                      selectedMissionTypes.includes(type.id)
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 主題切換 */}
            <div>
              <label className="block text-gray-700 mb-2">主題顏色</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  className={`px-4 py-2 rounded-full border transition font-semibold ${theme === 'bw' ? 'bg-black text-white border-black' : 'bg-gray-100 text-black border-gray-300 hover:bg-gray-200'}`}
                  onClick={() => setTheme('bw')}
                >
                  黑白灰
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 rounded-full border transition font-semibold ${theme === 'pastel' ? 'bg-pink-200 text-pink-900 border-pink-400' : 'bg-gray-100 text-black border-gray-300 hover:bg-gray-200'}`}
                  onClick={() => setTheme('pastel')}
                >
                  彩色
                </button>
              </div>
            </div>

            {/* 體能等級說明 */}
            <div className="text-gray-700 text-sm bg-gray-50 rounded-xl p-4">
              體能等級將由系統根據您完成任務所累積的分數自動判斷與升級。
              <br />
              <span className="block mt-2">分數對應等級：</span>
              <span>0~24 分：初學者（beginner）</span><br />
              <span>25~49 分：中階（intermediate）</span><br />
              <span>50 分以上：進階（advanced）</span>
            </div>

            {error && <div className="text-red-500 text-sm text-center">{error}</div>}
            
            <button
              type="submit"
              className="w-full bg-black text-white py-3 rounded-xl font-semibold shadow hover:bg-gray-800 transition"
              disabled={loading}
            >
              {loading ? "儲存中..." : "儲存並繼續"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 