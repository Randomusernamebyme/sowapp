"use client";
import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

function generateInviteCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function CreateTeamPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("請輸入團隊名稱");
      return;
    }
    if (!user) {
      setError("請先登入再創建團隊");
      setLoading(false);
      return;
    }
    setLoading(true);
    // 檢查團隊名稱唯一
    const q = query(collection(db, "teams"), where("name", "==", name.trim()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setError("團隊名稱已被使用，請換一個");
      setLoading(false);
      return;
    }
    // 產生唯一邀請碼（簡單防撞）
    let inviteCode = generateInviteCode();
    let codeSnap = await getDocs(query(collection(db, "teams"), where("inviteCode", "==", inviteCode)));
    while (!codeSnap.empty) {
      inviteCode = generateInviteCode();
      codeSnap = await getDocs(query(collection(db, "teams"), where("inviteCode", "==", inviteCode)));
    }
    // 建立團隊
    const docRef = await addDoc(collection(db, "teams"), {
      name: name.trim(),
      members: [{ userId: user.uid, role: "A", status: "active" }],
      activeMission: "",
      completedMissions: [],
      createdAt: Timestamp.now(),
      inviteCode,
    });
    setLoading(false);
    router.push(`/teams/${docRef.id}`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-white pt-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-black mb-6">創建新團隊</h1>
        <form onSubmit={handleCreate} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="團隊名稱（唯一）"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-black focus:outline-none focus:ring-2 focus:ring-black"
            required
          />
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <button
            type="submit"
            className="w-full bg-black text-white py-3 rounded-xl font-semibold shadow hover:bg-gray-800 transition"
            disabled={loading}
          >
            {loading ? "建立中..." : "建立團隊"}
          </button>
        </form>
      </div>
    </div>
  );
} 