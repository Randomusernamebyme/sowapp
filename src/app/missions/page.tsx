"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { CHECKPOINT_TYPES, GEOGRAPHICAL_AREAS, MISSION_TYPES, MISSION_DIFFICULTY } from "@/lib/constants";

export default function MissionsPage() {
  const [missions, setMissions] = useState<any[]>([]);
  const [filteredMissions, setFilteredMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string[]>([]);
  const [allCheckpoints, setAllCheckpoints] = useState<any[]>([]);
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({});
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    async function fetchMissions() {
      const querySnapshot = await getDocs(collection(db, "missions"));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMissions(data);
      setFilteredMissions(data);
      // 載入所有 checkpoints
      const cpSnap = await getDocs(collection(db, "checkpoints"));
      setAllCheckpoints(cpSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      // 載入所有 teams，統計 playCount
      const teamSnap = await getDocs(collection(db, "teams"));
      const playCountMap: Record<string, number> = {};
      teamSnap.docs.forEach(teamDoc => {
        const team = teamDoc.data();
        const arr = Array.isArray(team.completedMissionProgress) ? team.completedMissionProgress : [];
        arr.forEach((p: any) => {
          if (p.missionId) playCountMap[p.missionId] = (playCountMap[p.missionId] || 0) + 1;
        });
      });
      setPlayCounts(playCountMap);
      setLoading(false);
    }
    fetchMissions();
  }, []);

  useEffect(() => {
    // 過濾任務
    let filtered = [...missions];
    
    // 搜索過濾
    if (searchQuery) {
      filtered = filtered.filter(mission =>
        mission.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mission.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // 檢查點類型過濾
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(mission => {
        const cps = allCheckpoints.filter(cp => cp.missionId === mission.id);
        return cps.some((cp: any) => selectedTypes.includes(cp.challengeType));
      });
    }
    
    // 地理區域過濾
    if (selectedAreas.length > 0) {
      filtered = filtered.filter(mission =>
        selectedAreas.includes(mission.area)
      );
    }

    // 難度過濾
    if (selectedDifficulty.length > 0) {
      filtered = filtered.filter(mission =>
        selectedDifficulty.includes(mission.difficulty)
      );
    }
    
    setFilteredMissions(filtered);
  }, [missions, searchQuery, selectedTypes, selectedAreas, selectedDifficulty, allCheckpoints]);

  const toggleCheckpointType = (typeId: string) => {
    setSelectedTypes(prev =>
      prev.includes(typeId)
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  const toggleGeographicalArea = (areaId: string) => {
    setSelectedAreas(prev =>
      prev.includes(areaId)
        ? prev.filter(id => id !== areaId)
        : [...prev, areaId]
    );
  };

  const toggleDifficulty = (difficultyId: string) => {
    setSelectedDifficulty(prev =>
      prev.includes(difficultyId)
        ? prev.filter(id => id !== difficultyId)
        : [...prev, difficultyId]
    );
  };

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-black mb-6">任務列表</h1>

        {/* 搜索和過濾區域 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 mb-6">
          <div className="space-y-4">
            {/* 搜索框 */}
            <div>
              <input
                type="text"
                placeholder="搜索任務..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-black focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            {/* 檢查點類型過濾 */}
            <div>
              <label className="block text-gray-700 mb-2">檢查點類型</label>
              <div className="flex flex-wrap gap-2">
                {CHECKPOINT_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => toggleCheckpointType(type.id)}
                    className={`px-4 py-2 rounded-full text-sm transition ${
                      selectedTypes.includes(type.id)
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 地理區域過濾 */}
            <div>
              <label className="block text-gray-700 mb-2">地理區域</label>
              <div className="flex flex-wrap gap-2">
                {GEOGRAPHICAL_AREAS.map(area => (
                  <button
                    key={area.id}
                    onClick={() => toggleGeographicalArea(area.id)}
                    className={`px-4 py-2 rounded-full text-sm transition ${
                      selectedAreas.includes(area.id)
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {area.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 難度過濾 */}
            <div>
              <label className="block text-gray-700 mb-2">難度</label>
              <div className="flex flex-wrap gap-2">
                {MISSION_DIFFICULTY.map(difficulty => (
                  <button
                    key={difficulty.id}
                    onClick={() => toggleDifficulty(difficulty.id)}
                    className={`px-4 py-2 rounded-full text-sm transition ${
                      selectedDifficulty.includes(difficulty.id)
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {difficulty.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 任務列表 */}
        {loading ? (
          <div className="text-center py-8">
            <div className="text-gray-500">載入中...</div>
          </div>
        ) : filteredMissions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400">沒有找到符合條件的任務</div>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredMissions.map(mission => {
              const cps = allCheckpoints.filter(cp => cp.missionId === mission.id);
              return (
                <button
                  key={mission.id}
                  onClick={() => router.push(`/missions/${mission.id}`)}
                  className="w-full text-left bg-white border border-gray-200 rounded-2xl shadow p-6 hover:bg-gray-50 transition"
                >
                  {mission.cover && (
                    <img src={mission.cover} alt="任務封面" className="w-full h-48 object-cover rounded-xl mb-4" />
                  )}
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-lg font-semibold text-black">{mission.title}</div>
                      <div className="text-gray-600 text-sm mt-1">{mission.description}</div>
                    </div>
                    <div className="flex gap-2">
                      {cps.map((checkpoint: any, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                        >
                          {CHECKPOINT_TYPES.find(t => t.id === checkpoint.challengeType)?.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-4 mt-4 text-xs text-gray-500">
                    <span>難度：{MISSION_DIFFICULTY.find(d => d.id === mission.difficulty)?.label || "-"}</span>
                    <span>預估時間：{mission.estimatedDuration || "-"} 分鐘</span>
                    <span>區域：{GEOGRAPHICAL_AREAS.find(a => a.id === mission.area)?.label || "-"}</span>
                    <span>游玩次數：{playCounts[mission.id] || 0}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 