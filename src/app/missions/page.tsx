"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { CHECKPOINT_TYPES, GEOGRAPHICAL_AREAS, MISSION_TYPES, MISSION_DIFFICULTY } from "@/lib/constants";
import Image from "next/image";
import Link from "next/link";

export default function MissionsPage() {
  const [missions, setMissions] = useState<any[]>([]);
  const [filteredMissions, setFilteredMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
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
    if (selectedDifficulty) {
      filtered = filtered.filter(mission =>
        mission.difficulty === selectedDifficulty
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
      prev === difficultyId
        ? null
        : difficultyId
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)]">
        載入中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-6">任務列表</h1>

        {/* 篩選器 */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedDifficulty(null)}
              className={`px-4 py-2 rounded-full text-sm transition ${
                !selectedDifficulty
                  ? "bg-[var(--color-primary)] text-[var(--color-bg)]"
                  : "bg-[var(--color-secondary)] text-[var(--color-text)] hover:bg-gray-200"
              }`}
            >
              全部
            </button>
            {["簡單", "中等", "困難"].map(difficulty => (
              <button
                key={difficulty}
                onClick={() => setSelectedDifficulty(difficulty)}
                className={`px-4 py-2 rounded-full text-sm transition ${
                  selectedDifficulty === difficulty
                    ? "bg-[var(--color-primary)] text-[var(--color-bg)]"
                    : "bg-[var(--color-secondary)] text-[var(--color-text)] hover:bg-gray-200"
                }`}
              >
                {difficulty}
              </button>
            ))}
          </div>
        </div>

        {/* 任務列表 */}
        <div className="grid gap-6 md:grid-cols-2">
          {filteredMissions.map(mission => (
            <div
              key={mission.id}
              className="bg-[var(--color-card)] rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
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
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold text-[var(--color-text)]">{mission.title}</h2>
                  <span className="text-sm text-[var(--color-text)]">
                    遊玩次數：{playCounts[mission.id] || 0}
                  </span>
                </div>
                <p className="text-[var(--color-text)] mb-4">{mission.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 bg-[var(--color-secondary)] text-[var(--color-text)] rounded-full text-sm">
                    難度：{mission.difficulty}
                  </span>
                  <span className="px-3 py-1 bg-[var(--color-secondary)] text-[var(--color-text)] rounded-full text-sm">
                    預計時間：{mission.estimatedDuration}
                  </span>
                </div>
                <Link
                  href={`/missions/${mission.id}`}
                  className="block w-full text-center px-4 py-2 bg-[var(--color-primary)] text-[var(--color-bg)] rounded-xl hover:bg-[var(--color-accent)] transition"
                >
                  查看詳情
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 