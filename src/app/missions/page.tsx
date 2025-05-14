"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { CHECKPOINT_TYPES, GEOGRAPHICAL_AREAS, MISSION_TYPES, MISSION_DIFFICULTY } from "@/lib/constants";
import Image from "next/image";

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
    <div className="min-h-screen bg-[var(--color-bg)] p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-6">任務列表</h1>

        {/* 搜尋與篩選 */}
        <div className="bg-[var(--color-card)] rounded-2xl shadow-lg p-6 border border-gray-200 mb-6">
          <div className="mb-4">
            <input
              type="text"
              placeholder="搜尋任務..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-[var(--color-secondary)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-[var(--color-text)] mb-2">任務類型</h3>
              <div className="flex flex-wrap gap-2">
                {MISSION_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setSelectedTypes(prev =>
                        prev.includes(type.id)
                          ? prev.filter(id => id !== type.id)
                          : [...prev, type.id]
                      );
                    }}
                    className={`px-4 py-2 rounded-full text-sm transition ${
                      selectedTypes.includes(type.id)
                        ? "bg-[var(--color-primary)] text-[var(--color-bg)]"
                        : "bg-[var(--color-secondary)] text-[var(--color-text)] hover:bg-gray-200"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-[var(--color-text)] mb-2">地理區域</h3>
              <div className="flex flex-wrap gap-2">
                {GEOGRAPHICAL_AREAS.map(area => (
                  <button
                    key={area.id}
                    onClick={() => {
                      setSelectedAreas(prev =>
                        prev.includes(area.id)
                          ? prev.filter(id => id !== area.id)
                          : [...prev, area.id]
                      );
                    }}
                    className={`px-4 py-2 rounded-full text-sm transition ${
                      selectedAreas.includes(area.id)
                        ? "bg-[var(--color-primary)] text-[var(--color-bg)]"
                        : "bg-[var(--color-secondary)] text-[var(--color-text)] hover:bg-gray-200"
                    }`}
                  >
                    {area.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-[var(--color-text)] mb-2">難度等級</h3>
              <div className="flex flex-wrap gap-2">
                {MISSION_DIFFICULTY.map(difficulty => (
                  <button
                    key={difficulty.id}
                    onClick={() => {
                      setSelectedDifficulty(prev =>
                        prev.includes(difficulty.id)
                          ? prev.filter(id => id !== difficulty.id)
                          : [...prev, difficulty.id]
                      );
                    }}
                    className={`px-4 py-2 rounded-full text-sm transition ${
                      selectedDifficulty.includes(difficulty.id)
                        ? "bg-[var(--color-primary)] text-[var(--color-bg)]"
                        : "bg-[var(--color-secondary)] text-[var(--color-text)] hover:bg-gray-200"
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
        <div className="grid gap-4 md:grid-cols-2">
          {filteredMissions.map(mission => (
            <div
              key={mission.id}
              className="bg-[var(--color-card)] rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition"
            >
              {mission.imageUrl && (
                <div className="relative h-48">
                  <Image
                    src={mission.imageUrl}
                    alt={mission.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-semibold text-[var(--color-text)]">{mission.title}</h2>
                  <span className="text-sm text-[var(--color-text)]">
                    已玩 {playCounts[mission.id] || 0} 次
                  </span>
                </div>
                <p className="text-[var(--color-text)] mb-4">{mission.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 bg-[var(--color-secondary)] text-[var(--color-text)] rounded-full text-sm">
                    {MISSION_DIFFICULTY.find(d => d.id === mission.difficulty)?.label}
                  </span>
                  <span className="px-3 py-1 bg-[var(--color-secondary)] text-[var(--color-text)] rounded-full text-sm">
                    預計 {mission.estimatedDuration}
                  </span>
                </div>
                <button
                  onClick={() => router.push(`/missions/${mission.id}`)}
                  className="w-full bg-[var(--color-primary)] text-[var(--color-bg)] py-3 rounded-xl font-semibold shadow hover:bg-[var(--color-accent)] transition"
                >
                  查看詳情
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 