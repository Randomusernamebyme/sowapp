"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc, getDoc, query, where, getDocs, deleteDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { CHECKPOINT_TYPES, GEOGRAPHICAL_AREAS, MISSION_TYPES, MISSION_DIFFICULTY } from "@/lib/constants";
import Link from "next/link";
import GenerateTestMission from "@/components/GenerateTestMission";

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
  const [mission, setMission] = useState<{
    title: string;
    description: string;
    area: string;
    type: string;
    difficulty: string;
    startLocation: { lat: number; lng: number };
    endLocation: { lat: number; lng: number };
    estimatedDuration: string;
    password: string;
    isActive: boolean;
    cover: string;
    checkpoints: string[];
    createdAt: string;
    updatedAt: string;
  }>({
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
  const [passwordLength, setPasswordLength] = useState(6);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
      const missionData: {
        id: string;
        title: string;
        description: string;
        area: string;
        type: string;
        difficulty: string;
        startLocation: { lat: number; lng: number };
        endLocation: { lat: number; lng: number };
        estimatedDuration: string;
        password: string;
        isActive: boolean;
        cover: string;
        checkpoints: string[];
        createdAt: string;
        updatedAt: string;
      } = {
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

  const handleSelectMission = async (mission: any) => {
    setSelectedMission(mission);
    setMission({ ...mission });
    setIsEditing(true);
    // 載入 checkpoints
    const cpQ = query(collection(db, "checkpoints"), where("missionId", "==", mission.id));
    const cpSnap = await getDocs(cpQ);
    const cps = cpSnap.docs.map(d => ({
      name: d.data().name || "",
      description: d.data().description || "",
      location: d.data().location || { lat: 0, lng: 0 },
      challengeType: d.data().challengeType || "puzzle",
      challengeDescription: d.data().challengeDescription || "",
      clue: d.data().clue || "",
      passwordDigit: d.data().passwordDigit || { position: 1, value: "" },
      challengeConfig: d.data().challengeConfig || {},
      id: d.id
    } as any));
    setCheckpoints(cps as any);
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
      setShowDeleteModal(false);
      // 重新載入任務
      const q = query(collection(db, "missions"));
      const snap = await getDocs(q);
      setMissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err: any) {
      setError("刪除失敗：" + err.message);
    }
  };

  const handleUpdate = async (e: any) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!selectedMission) return;
    try {
      const missionRef = doc(db, "missions", selectedMission.id);
      const now = new Date().toISOString();
      const missionData = {
        ...mission,
        updatedAt: now,
      };
      await setDoc(missionRef, missionData, { merge: true });
      // 更新 checkpoints
      for (let i = 0; i < checkpoints.length; i++) {
        const cp: any = checkpoints[i];
        const cpRef = cp.id ? doc(db, "checkpoints", cp.id) : doc(collection(db, "checkpoints"));
        const cpData = {
          ...cp,
          id: cpRef.id,
          missionId: selectedMission.id,
          updatedAt: now,
        };
        await setDoc(cpRef, cpData, { merge: true });
      }
      setSuccess("任務已更新");
      setIsEditing(false);
      setSelectedMission(null);
      setCheckpoints([]);
    } catch (err: any) {
      setError("更新任務失敗：" + err.message);
    }
  };

  // 檢查點順序調整
  const moveCheckpointUp = (idx: number) => {
    if (idx === 0) return;
    const newCheckpoints = [...checkpoints];
    [newCheckpoints[idx - 1], newCheckpoints[idx]] = [newCheckpoints[idx], newCheckpoints[idx - 1]];
    setCheckpoints(newCheckpoints);
  };
  const moveCheckpointDown = (idx: number) => {
    if (idx === checkpoints.length - 1) return;
    const newCheckpoints = [...checkpoints];
    [newCheckpoints[idx], newCheckpoints[idx + 1]] = [newCheckpoints[idx + 1], newCheckpoints[idx]];
    setCheckpoints(newCheckpoints);
  };
  const deleteCheckpoint = (idx: number) => {
    const newCheckpoints = checkpoints.filter((_, i) => i !== idx);
    setCheckpoints(newCheckpoints);
  };

  return (
    <div className="min-h-screen bg-white p-4 font-sans">
      <GenerateTestMission />
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-black">建立新任務</h1>
        {error && <div className="text-red-500 mb-4 ios-card">{error}</div>}
        {success && <div className="text-green-600 mb-4 ios-card">{success}</div>}
        <form onSubmit={isEditing ? handleUpdate : handleSubmit} className="space-y-6">
          <div className="ios-card">
            <label className="block font-medium mb-1 text-black">任務標題</label>
            <input name="title" value={mission.title} onChange={handleMissionChange} className="w-full border rounded-lg p-2 bg-white text-black focus:ring-2 focus:ring-black" required />
          </div>
          <div className="ios-card">
            <label className="block font-medium mb-1 text-black">描述</label>
            <textarea name="description" value={mission.description} onChange={handleMissionChange} className="w-full border rounded-lg p-2 bg-white text-black focus:ring-2 focus:ring-black" required />
          </div>
          <div className="ios-card">
            <label className="block font-medium mb-1 text-black">地區</label>
            <select name="area" value={mission.area} onChange={handleMissionChange} className="w-full border rounded-lg p-2 bg-white text-black focus:ring-2 focus:ring-black">
              <option value="">請選擇</option>
              {GEOGRAPHICAL_AREAS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>
          <div className="ios-card">
            <label className="block font-medium mb-1 text-black">任務類型</label>
            <select name="type" value={mission.type} onChange={handleMissionChange} className="w-full border rounded-lg p-2 bg-white text-black focus:ring-2 focus:ring-black">
              <option value="">請選擇</option>
              {MISSION_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div className="ios-card">
            <label className="block font-medium mb-1 text-black">難度</label>
            <select name="difficulty" value={mission.difficulty} onChange={handleMissionChange} className="w-full border rounded-lg p-2 bg-white text-black focus:ring-2 focus:ring-black">
              {MISSION_DIFFICULTY.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </div>
          <div className="ios-card flex gap-4">
            <div className="flex-1">
              <label className="block font-medium mb-1 text-black">起點緯度</label>
              <input type="number" step="any" value={mission.startLocation.lat} onChange={e => setMission({ ...mission, startLocation: { ...mission.startLocation, lat: parseFloat(e.target.value) } })} className="w-full border rounded-lg p-2 bg-white text-black focus:ring-2 focus:ring-black" required />
            </div>
            <div className="flex-1">
              <label className="block font-medium mb-1 text-black">起點經度</label>
              <input type="number" step="any" value={mission.startLocation.lng} onChange={e => setMission({ ...mission, startLocation: { ...mission.startLocation, lng: parseFloat(e.target.value) } })} className="w-full border rounded-lg p-2 bg-white text-black focus:ring-2 focus:ring-black" required />
            </div>
          </div>
          <div className="ios-card flex gap-4">
            <div className="flex-1">
              <label className="block font-medium mb-1 text-black">終點緯度</label>
              <input type="number" step="any" value={mission.endLocation.lat} onChange={e => setMission({ ...mission, endLocation: { ...mission.endLocation, lat: parseFloat(e.target.value) } })} className="w-full border rounded-lg p-2 bg-white text-black focus:ring-2 focus:ring-black" required />
            </div>
            <div className="flex-1">
              <label className="block font-medium mb-1 text-black">終點經度</label>
              <input type="number" step="any" value={mission.endLocation.lng} onChange={e => setMission({ ...mission, endLocation: { ...mission.endLocation, lng: parseFloat(e.target.value) } })} className="w-full border rounded-lg p-2 bg-white text-black focus:ring-2 focus:ring-black" required />
            </div>
          </div>
          <div className="ios-card">
            <label className="block font-medium mb-1 text-black">預估時長（分鐘）</label>
            <input name="estimatedDuration" value={mission.estimatedDuration} onChange={handleMissionChange} className="w-full border rounded-lg p-2 bg-white text-black focus:ring-2 focus:ring-black" required />
          </div>
          <div className="ios-card">
            <label className="block font-medium mb-1 text-black">密碼長度</label>
            <input type="number" min={1} max={20} value={passwordLength} onChange={e => setPasswordLength(Number(e.target.value))} className="w-full border rounded-lg p-2 bg-white text-black focus:ring-2 focus:ring-black" required />
          </div>
          <div className="ios-card">
            <label className="block font-medium mb-1 text-black">密碼（請輸入完整密碼，長度不限）</label>
            <input name="password" value={mission.password} onChange={handleMissionChange} className="w-full border rounded-lg p-2 bg-white text-black focus:ring-2 focus:ring-black" required />
          </div>
          <div className="ios-card">
            <label className="block font-medium mb-1 text-black">啟用狀態</label>
            <select name="isActive" value={mission.isActive ? "true" : "false"} onChange={e => setMission({ ...mission, isActive: e.target.value === "true" })} className="w-full border rounded-lg p-2 bg-white text-black focus:ring-2 focus:ring-black">
              <option value="true">啟用</option>
              <option value="false">停用</option>
            </select>
          </div>
          <div className="ios-card">
            <label className="block font-medium mb-1 text-black">任務封面（請將圖片放到 public/missions/）</label>
            <input type="file" accept="image/*" onChange={handleCoverChange} className="w-full" />
            {mission.cover && <div className="mt-2 text-gray-600">圖片路徑：<span className="text-black font-mono">{mission.cover}</span></div>}
          </div>
          <div className="ios-card">
            <label className="block font-medium mb-1 text-black">檢查點</label>
            <button type="button" onClick={handleAddCheckpoint} className="ml-2 px-3 py-1 bg-black text-white rounded-lg shadow hover:bg-gray-800 transition">新增檢查點</button>
            <div className="space-y-4 mt-4">
              {checkpoints.map((cp, idx) => (
                <div key={idx} className="border rounded-xl p-3 bg-gray-50 ios-card">
                  <div className="flex items-center mb-2">
                    <span className="font-bold text-black mr-2">檢查點 {idx + 1}</span>
                    <button type="button" onClick={() => moveCheckpointUp(idx)} disabled={idx === 0} className="px-2 py-1 text-xs rounded bg-gray-200 text-black mr-1 disabled:opacity-40">↑</button>
                    <button type="button" onClick={() => moveCheckpointDown(idx)} disabled={idx === checkpoints.length - 1} className="px-2 py-1 text-xs rounded bg-gray-200 text-black mr-1 disabled:opacity-40">↓</button>
                    <button type="button" onClick={() => deleteCheckpoint(idx)} className="px-2 py-1 text-xs rounded bg-red-200 text-red-700">刪除</button>
                  </div>
                  <div className="flex gap-2 mb-2">
                    <input placeholder="名稱" value={cp.name} onChange={e => handleCheckpointChange(idx, "name", e.target.value)} className="border rounded-lg p-1 flex-1 bg-white text-black" />
                    <input placeholder="描述" value={cp.description} onChange={e => handleCheckpointChange(idx, "description", e.target.value)} className="border rounded-lg p-1 flex-1 bg-white text-black" />
                  </div>
                  <div className="flex gap-2 mb-2">
                    <input type="number" step="any" placeholder="緯度" value={cp.location.lat} onChange={e => handleCheckpointChange(idx, "location", { ...cp.location, lat: parseFloat(e.target.value) })} className="border rounded-lg p-1 flex-1 bg-white text-black" />
                    <input type="number" step="any" placeholder="經度" value={cp.location.lng} onChange={e => handleCheckpointChange(idx, "location", { ...cp.location, lng: parseFloat(e.target.value) })} className="border rounded-lg p-1 flex-1 bg-white text-black" />
                  </div>
                  <div className="flex gap-2 mb-2">
                    <select value={cp.challengeType} onChange={e => handleCheckpointChange(idx, "challengeType", e.target.value)} className="border rounded-lg p-1 flex-1 bg-white text-black">
                      {CHECKPOINT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                    <input placeholder="挑戰描述" value={cp.challengeDescription} onChange={e => handleCheckpointChange(idx, "challengeDescription", e.target.value)} className="border rounded-lg p-1 flex-1 bg-white text-black" />
                  </div>
                  <div className="flex gap-2 mb-2">
                    <input placeholder="提示" value={cp.clue} onChange={e => handleCheckpointChange(idx, "clue", e.target.value)} className="border rounded-lg p-1 flex-1 bg-white text-black" />
                    <select value={cp.passwordDigit.position} onChange={e => handleCheckpointChange(idx, "passwordDigit", { ...cp.passwordDigit, position: parseInt(e.target.value) })} className="border rounded-lg p-1 w-24 bg-white text-black">
                      {Array.from({ length: passwordLength }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                    <input placeholder="密碼數字" value={cp.passwordDigit.value} onChange={e => handleCheckpointChange(idx, "passwordDigit", { ...cp.passwordDigit, value: e.target.value })} className="border rounded-lg p-1 w-24 bg-white text-black" />
                  </div>
                  {/* 根據 challengeType 顯示額外欄位 */}
                  {cp.challengeType === "puzzle" && (
                    <div className="flex gap-2 mb-2">
                      <input placeholder="正確答案" value={cp.challengeConfig?.puzzle?.correctAnswer || ""} onChange={e => handleCheckpointChange(idx, "challengeConfig", { ...cp.challengeConfig, puzzle: { ...cp.challengeConfig?.puzzle, correctAnswer: e.target.value } })} className="border rounded-lg p-1 flex-1 bg-white text-black" />
                      <input placeholder="最大嘗試次數" type="number" value={cp.challengeConfig?.puzzle?.maxAttempts || 3} onChange={e => handleCheckpointChange(idx, "challengeConfig", { ...cp.challengeConfig, puzzle: { ...cp.challengeConfig?.puzzle, maxAttempts: parseInt(e.target.value) } })} className="border rounded-lg p-1 w-32 bg-white text-black" />
                    </div>
                  )}
                  {cp.challengeType === "physical" && (
                    <div className="flex gap-2 mb-2">
                      <input placeholder="時間限制(秒)" type="number" value={cp.challengeConfig?.physical?.timeLimit || 60} onChange={e => handleCheckpointChange(idx, "challengeConfig", { ...cp.challengeConfig, physical: { ...cp.challengeConfig?.physical, timeLimit: parseInt(e.target.value) } })} className="border rounded-lg p-1 w-32 bg-white text-black" />
                      <input placeholder="次數要求" type="number" value={cp.challengeConfig?.physical?.requiredReps || 10} onChange={e => handleCheckpointChange(idx, "challengeConfig", { ...cp.challengeConfig, physical: { ...cp.challengeConfig?.physical, requiredReps: parseInt(e.target.value) } })} className="border rounded-lg p-1 w-32 bg-white text-black" />
                    </div>
                  )}
                  {cp.challengeType === "quiz" && (
                    <div className="flex flex-col gap-2 mb-2">
                      <input placeholder="正確答案" value={cp.challengeConfig?.quiz?.correctAnswer || ""} onChange={e => handleCheckpointChange(idx, "challengeConfig", { ...cp.challengeConfig, quiz: { ...cp.challengeConfig?.quiz, correctAnswer: e.target.value } })} className="border rounded-lg p-1 flex-1 bg-white text-black" />
                      <input placeholder="最大嘗試次數" type="number" value={cp.challengeConfig?.quiz?.maxAttempts || 2} onChange={e => handleCheckpointChange(idx, "challengeConfig", { ...cp.challengeConfig, quiz: { ...cp.challengeConfig?.quiz, maxAttempts: parseInt(e.target.value) } })} className="border rounded-lg p-1 w-32 bg-white text-black" />
                      <textarea placeholder="選項（每行一個，格式：A. 內容）" value={cp.challengeConfig?.quiz?.options?.map((o: any) => `${o.id}. ${o.text}`).join("\n") || ""} onChange={e => handleCheckpointChange(idx, "challengeConfig", { ...cp.challengeConfig, quiz: { ...cp.challengeConfig?.quiz, options: e.target.value.split("\n").map((line: string) => { const [id, ...rest] = line.split('.'); return { id: id?.trim(), text: rest.join('.').trim() }; }) } })} className="border rounded-lg p-1 flex-1 bg-white text-black" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <button type="submit" className="w-full bg-black text-white py-3 rounded-xl font-semibold shadow hover:bg-gray-800 transition">
            {isEditing ? "儲存變更" : "建立任務"}
          </button>
        </form>
        <div className="mt-8 text-gray-500 text-sm">請將任務封面圖片放到 <span className="text-blue-600">public/missions/</span> 目錄下，並於上方選擇檔案。</div>
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-2">現有任務</h2>
          <div className="space-y-2">
            {missions.map(m => (
              <div key={m.id} className="flex items-center gap-2 border rounded p-2 bg-gray-50">
                <span className="flex-1 cursor-pointer" onClick={() => handleSelectMission(m)}>{m.title}</span>
                <button className="text-blue-600 underline" onClick={() => handleSelectMission(m)}>編輯</button>
                <button className="text-red-600 underline" onClick={() => { setSelectedMission(m); setShowDeleteModal(true); }}>刪除</button>
              </div>
            ))}
          </div>
        </div>
        {/* 刪除任務彈窗 */}
        {showDeleteModal && selectedMission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-xs w-full text-center">
              <div className="mb-2 font-bold text-red-700 text-lg">刪除任務：{selectedMission.title}</div>
              <div className="mb-2 text-sm text-gray-700">請輸入完整任務標題以確認刪除：</div>
              <input className="border rounded-lg p-2 w-full mb-2 bg-white text-black" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} />
              <button className="bg-red-600 text-white px-4 py-2 rounded-xl w-full font-semibold mb-2" onClick={handleDeleteMission}>確認刪除</button>
              <button className="px-4 py-2 rounded-xl border w-full" onClick={() => setShowDeleteModal(false)}>取消</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 