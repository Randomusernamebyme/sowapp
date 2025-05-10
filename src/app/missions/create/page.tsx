"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc, getDoc, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { CHECKPOINT_TYPES, GEOGRAPHICAL_AREAS, MISSION_TYPES, MISSION_DIFFICULTY } from "@/lib/constants";
import Link from "next/link";

interface CheckpointForm {
  name: string;
  description: string;
  location: { lat: number; lng: number };
  challengeType: string;
  challengeDescription: string;
  clue: string;
  passwordDigit: { position: number; value: string };
  challengeConfig?: any;
}

export default function MissionCreatePage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mission, setMission] = useState({
    title: "",
    description: "",
    area: "",
    type: "",
    difficulty: "medium",
    startLocation: { lat: 22.2833, lng: 114.1500 },
    endLocation: { lat: 22.2833, lng: 114.1500 },
    estimatedDuration: "60",
    password: "",
    isActive: true,
    cover: "",
    checkpoints: [],
    createdAt: "",
    updatedAt: ""
  });
  const [checkpoints, setCheckpoints] = useState<CheckpointForm[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [selectedMission, setSelectedMission] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    async function checkAdmin() {
      if (!user) return;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      setIsAdmin(userDoc.exists() && userDoc.data()?.isAdmin === true);
      setLoading(false);
      // 載入所有任務
      const q = query(collection(db, "missions"));
      const snap = await getDocs(q);
      setMissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }
    checkAdmin();
  }, [user, success]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-black">載入中...</div>;
  }
  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-red-500">僅限管理員使用</div>;
  }

  const handleMissionChange = (e: any) => {
    setMission({ ...mission, [e.target.name]: e.target.value });
  };

  const handleAddCheckpoint = () => {
    setCheckpoints([
      ...checkpoints,
      {
        name: "",
        description: "",
        location: { lat: 22.2833, lng: 114.1500 },
        challengeType: "puzzle",
        challengeDescription: "",
        clue: "",
        passwordDigit: { position: checkpoints.length + 1, value: "" },
        challengeConfig: {}
      }
    ]);
  };

  const handleCheckpointChange = (idx: number, field: string, value: any) => {
    const newCheckpoints = [...checkpoints];
    switch (field) {
      case "name":
        newCheckpoints[idx].name = value;
        break;
      case "description":
        newCheckpoints[idx].description = value;
        break;
      case "location":
        newCheckpoints[idx].location = value;
        break;
      case "challengeType":
        newCheckpoints[idx].challengeType = value;
        break;
      case "challengeDescription":
        newCheckpoints[idx].challengeDescription = value;
        break;
      case "clue":
        newCheckpoints[idx].clue = value;
        break;
      case "passwordDigit":
        newCheckpoints[idx].passwordDigit = value;
        break;
      case "challengeConfig":
        newCheckpoints[idx].challengeConfig = value;
        break;
      default:
        break;
    }
    setCheckpoints(newCheckpoints);
  };

  const handleCoverChange = (e: any) => {
    if (e.target.files && e.target.files[0]) {
      setCoverFile(e.target.files[0]);
      setMission({ ...mission, cover: `/missions/${e.target.files[0].name}` });
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const missionRef = doc(collection(db, "missions"));
      const now = new Date().toISOString();
      const missionData = {
        ...mission,
        id: missionRef.id,
        createdAt: now,
        updatedAt: now,
        checkpoints: [],
      };
      // 建立 checkpoints
      let prevCpId = null;
      for (let i = 0; i < checkpoints.length; i++) {
        const cpRef = doc(collection(db, "checkpoints"));
        const cpData = {
          ...checkpoints[i],
          id: cpRef.id,
          missionId: missionRef.id,
          createdAt: now,
          updatedAt: now,
          nextCheckpoint: i < checkpoints.length - 1 ? undefined : null
        };
        await setDoc(cpRef, cpData);
        missionData.checkpoints.push(cpRef.id);
        // 設定上一個 checkpoint 的 nextCheckpoint
        if (prevCpId) {
          await setDoc(doc(db, "checkpoints", prevCpId), { nextCheckpoint: cpRef.id }, { merge: true });
        }
        prevCpId = cpRef.id;
      }
      await setDoc(missionRef, missionData, { merge: true });
      setSuccess("任務建立成功！請將封面圖片放到 public/missions 目錄下。");
      setCheckpoints([]);
    } catch (err: any) {
      setError("建立任務失敗：" + err.message);
    }
  };

  const handleSelectMission = (mission: any) => {
    setSelectedMission(mission);
    setMission({ ...mission });
    // 載入 checkpoints
    // 可根據需要載入並編輯 checkpoints
  };

  const handleDeleteMission = async () => {
    if (!selectedMission || deleteConfirm !== selectedMission.title) {
      setError("請正確輸入完整任務標題以確認刪除");
      return;
    }
    try {
      // 刪除相關 checkpoints
      const cpQ = query(collection(db, "checkpoints"), where("missionId", "==", selectedMission.id));
      const cpSnap = await getDocs(cpQ);
      for (const docSnap of cpSnap.docs) {
        await deleteDoc(doc(db, "checkpoints", docSnap.id));
      }
      // 刪除 mission
      await deleteDoc(doc(db, "missions", selectedMission.id));
      setSuccess("任務與相關檢查點已刪除");
      setSelectedMission(null);
      setDeleteConfirm("");
      // 重新載入任務
      const q = query(collection(db, "missions"));
      const snap = await getDocs(q);
      setMissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err: any) {
      setError("刪除失敗：" + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">建立新任務</h1>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        {success && <div className="text-green-600 mb-4">{success}</div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-medium mb-1">任務標題</label>
            <input name="title" value={mission.title} onChange={handleMissionChange} className="w-full border rounded p-2" required />
          </div>
          <div>
            <label className="block font-medium mb-1">描述</label>
            <textarea name="description" value={mission.description} onChange={handleMissionChange} className="w-full border rounded p-2" required />
          </div>
          <div>
            <label className="block font-medium mb-1">地區</label>
            <select name="area" value={mission.area} onChange={handleMissionChange} className="w-full border rounded p-2">
              <option value="">請選擇</option>
              {GEOGRAPHICAL_AREAS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1">任務類型</label>
            <select name="type" value={mission.type} onChange={handleMissionChange} className="w-full border rounded p-2">
              <option value="">請選擇</option>
              {MISSION_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1">難度</label>
            <select name="difficulty" value={mission.difficulty} onChange={handleMissionChange} className="w-full border rounded p-2">
              {MISSION_DIFFICULTY.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </div>
          <div className="flex gap-4">
            <div>
              <label className="block font-medium mb-1">起點緯度</label>
              <input type="number" step="any" value={mission.startLocation.lat} onChange={e => setMission({ ...mission, startLocation: { ...mission.startLocation, lat: parseFloat(e.target.value) } })} className="w-full border rounded p-2" required />
            </div>
            <div>
              <label className="block font-medium mb-1">起點經度</label>
              <input type="number" step="any" value={mission.startLocation.lng} onChange={e => setMission({ ...mission, startLocation: { ...mission.startLocation, lng: parseFloat(e.target.value) } })} className="w-full border rounded p-2" required />
            </div>
          </div>
          <div className="flex gap-4">
            <div>
              <label className="block font-medium mb-1">終點緯度</label>
              <input type="number" step="any" value={mission.endLocation.lat} onChange={e => setMission({ ...mission, endLocation: { ...mission.endLocation, lat: parseFloat(e.target.value) } })} className="w-full border rounded p-2" required />
            </div>
            <div>
              <label className="block font-medium mb-1">終點經度</label>
              <input type="number" step="any" value={mission.endLocation.lng} onChange={e => setMission({ ...mission, endLocation: { ...mission.endLocation, lng: parseFloat(e.target.value) } })} className="w-full border rounded p-2" required />
            </div>
          </div>
          <div>
            <label className="block font-medium mb-1">預估時長（分鐘）</label>
            <input name="estimatedDuration" value={mission.estimatedDuration} onChange={handleMissionChange} className="w-full border rounded p-2" required />
          </div>
          <div>
            <label className="block font-medium mb-1">密碼（6位數）</label>
            <input name="password" value={mission.password} onChange={handleMissionChange} className="w-full border rounded p-2" required />
          </div>
          <div>
            <label className="block font-medium mb-1">啟用狀態</label>
            <select name="isActive" value={mission.isActive ? "true" : "false"} onChange={e => setMission({ ...mission, isActive: e.target.value === "true" })} className="w-full border rounded p-2">
              <option value="true">啟用</option>
              <option value="false">停用</option>
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1">任務封面（請將圖片放到 public/missions/）</label>
            <input type="file" accept="image/*" onChange={handleCoverChange} className="w-full" />
            {mission.cover && <div className="mt-2">圖片路徑：<span className="text-blue-600">{mission.cover}</span></div>}
          </div>
          <div>
            <label className="block font-medium mb-1">檢查點</label>
            <button type="button" onClick={handleAddCheckpoint} className="ml-2 px-3 py-1 bg-black text-white rounded">新增檢查點</button>
            <div className="space-y-4 mt-4">
              {checkpoints.map((cp, idx) => (
                <div key={idx} className="border rounded p-3 bg-gray-50">
                  <div className="flex gap-2 mb-2">
                    <input placeholder="名稱" value={cp.name} onChange={e => handleCheckpointChange(idx, "name", e.target.value)} className="border rounded p-1 flex-1" />
                    <input placeholder="描述" value={cp.description} onChange={e => handleCheckpointChange(idx, "description", e.target.value)} className="border rounded p-1 flex-1" />
                  </div>
                  <div className="flex gap-2 mb-2">
                    <input type="number" step="any" placeholder="緯度" value={cp.location.lat} onChange={e => handleCheckpointChange(idx, "location", { ...cp.location, lat: parseFloat(e.target.value) })} className="border rounded p-1 flex-1" />
                    <input type="number" step="any" placeholder="經度" value={cp.location.lng} onChange={e => handleCheckpointChange(idx, "location", { ...cp.location, lng: parseFloat(e.target.value) })} className="border rounded p-1 flex-1" />
                  </div>
                  <div className="flex gap-2 mb-2">
                    <select value={cp.challengeType} onChange={e => handleCheckpointChange(idx, "challengeType", e.target.value)} className="border rounded p-1 flex-1">
                      {CHECKPOINT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                    <input placeholder="挑戰描述" value={cp.challengeDescription} onChange={e => handleCheckpointChange(idx, "challengeDescription", e.target.value)} className="border rounded p-1 flex-1" />
                  </div>
                  <div className="flex gap-2 mb-2">
                    <input placeholder="提示" value={cp.clue} onChange={e => handleCheckpointChange(idx, "clue", e.target.value)} className="border rounded p-1 flex-1" />
                    <input placeholder="密碼位數" type="number" value={cp.passwordDigit.position} onChange={e => handleCheckpointChange(idx, "passwordDigit", { ...cp.passwordDigit, position: parseInt(e.target.value) })} className="border rounded p-1 w-24" />
                    <input placeholder="密碼數字" value={cp.passwordDigit.value} onChange={e => handleCheckpointChange(idx, "passwordDigit", { ...cp.passwordDigit, value: e.target.value })} className="border rounded p-1 w-24" />
                  </div>
                  {/* 根據 challengeType 顯示額外欄位 */}
                  {cp.challengeType === "puzzle" && (
                    <div className="flex gap-2 mb-2">
                      <input placeholder="正確答案" value={cp.challengeConfig?.puzzle?.correctAnswer || ""} onChange={e => handleCheckpointChange(idx, "challengeConfig", { ...cp.challengeConfig, puzzle: { ...cp.challengeConfig?.puzzle, correctAnswer: e.target.value } })} className="border rounded p-1 flex-1" />
                      <input placeholder="最大嘗試次數" type="number" value={cp.challengeConfig?.puzzle?.maxAttempts || 3} onChange={e => handleCheckpointChange(idx, "challengeConfig", { ...cp.challengeConfig, puzzle: { ...cp.challengeConfig?.puzzle, maxAttempts: parseInt(e.target.value) } })} className="border rounded p-1 w-32" />
                    </div>
                  )}
                  {cp.challengeType === "physical" && (
                    <div className="flex gap-2 mb-2">
                      <input placeholder="時間限制(秒)" type="number" value={cp.challengeConfig?.physical?.timeLimit || 60} onChange={e => handleCheckpointChange(idx, "challengeConfig", { ...cp.challengeConfig, physical: { ...cp.challengeConfig?.physical, timeLimit: parseInt(e.target.value) } })} className="border rounded p-1 w-32" />
                      <input placeholder="次數要求" type="number" value={cp.challengeConfig?.physical?.requiredReps || 10} onChange={e => handleCheckpointChange(idx, "challengeConfig", { ...cp.challengeConfig, physical: { ...cp.challengeConfig?.physical, requiredReps: parseInt(e.target.value) } })} className="border rounded p-1 w-32" />
                    </div>
                  )}
                  {cp.challengeType === "quiz" && (
                    <div className="flex flex-col gap-2 mb-2">
                      <input placeholder="正確答案" value={cp.challengeConfig?.quiz?.correctAnswer || ""} onChange={e => handleCheckpointChange(idx, "challengeConfig", { ...cp.challengeConfig, quiz: { ...cp.challengeConfig?.quiz, correctAnswer: e.target.value } })} className="border rounded p-1 flex-1" />
                      <input placeholder="最大嘗試次數" type="number" value={cp.challengeConfig?.quiz?.maxAttempts || 2} onChange={e => handleCheckpointChange(idx, "challengeConfig", { ...cp.challengeConfig, quiz: { ...cp.challengeConfig?.quiz, maxAttempts: parseInt(e.target.value) } })} className="border rounded p-1 w-32" />
                      <textarea placeholder="選項（每行一個，格式：A. 內容）" value={cp.challengeConfig?.quiz?.options?.map((o: any) => `${o.id}. ${o.text}`).join("\n") || ""} onChange={e => handleCheckpointChange(idx, "challengeConfig", { ...cp.challengeConfig, quiz: { ...cp.challengeConfig?.quiz, options: e.target.value.split("\n").map((line: string) => { const [id, ...rest] = line.split('.'); return { id: id?.trim(), text: rest.join('.').trim() }; }) } })} className="border rounded p-1 flex-1" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-semibold shadow hover:bg-gray-800 transition">建立任務</button>
        </form>
        <div className="mt-8 text-gray-500 text-sm">請將任務封面圖片放到 <span className="text-blue-600">public/missions/</span> 目錄下，並於上方選擇檔案。</div>
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-2">現有任務</h2>
          <div className="space-y-2">
            {missions.map(m => (
              <div key={m.id} className="flex items-center gap-2 border rounded p-2 bg-gray-50">
                <span className="flex-1 cursor-pointer" onClick={() => handleSelectMission(m)}>{m.title}</span>
                <button className="text-blue-600 underline" onClick={() => handleSelectMission(m)}>編輯</button>
                <button className="text-red-600 underline" onClick={() => setSelectedMission(m)}>刪除</button>
              </div>
            ))}
          </div>
        </div>
        {selectedMission && (
          <div className="mb-8 border p-4 rounded bg-red-50">
            <div className="mb-2 font-bold text-red-700">刪除任務：{selectedMission.title}</div>
            <div className="mb-2 text-sm text-gray-700">請輸入完整任務標題以確認刪除：</div>
            <input className="border rounded p-2 w-full mb-2" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} />
            <button className="bg-red-600 text-white px-4 py-2 rounded" onClick={handleDeleteMission}>確認刪除</button>
            <button className="ml-2 px-4 py-2 rounded border" onClick={() => setSelectedMission(null)}>取消</button>
          </div>
        )}
      </div>
    </div>
  );
} 