"use client";
import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function JoinTeamPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    
    if (!inviteCode.trim()) {
      setError("請輸入邀請碼");
      return;
    }

    if (!user) {
      setError("請先登入再加入團隊");
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // 檢查邀請碼是否存在
      const q = query(collection(db, "teams"), where("inviteCode", "==", inviteCode.trim()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setError("無效的邀請碼");
        setLoading(false);
        return;
      }

      const teamDoc = snap.docs[0];
      const teamData = teamDoc.data();

      // 檢查是否已經是團隊成員
      const isMember = teamData.members.some((member: any) => member.userId === user.uid);
      if (isMember) {
        setError("你已經是這個團隊的成員");
        setLoading(false);
        return;
      }

      // 更新團隊成員列表
      await updateDoc(doc(db, "teams", teamDoc.id), {
        members: arrayUnion({
          userId: user.uid,
          role: "D", // 預設角色
          status: "active"
        })
      });

      // 更新用戶的團隊列表
      await updateDoc(doc(db, "users", user.uid), {
        teams: arrayUnion(teamDoc.id)
      });

      router.push(`/teams/${teamDoc.id}`);
    } catch (err) {
      console.error("加入團隊失敗:", err);
      setError("加入團隊失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-white pt-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-black mb-6">加入團隊</h1>
        <form onSubmit={handleJoin} className="space-y-4">
          <input
            type="text"
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value.toUpperCase())}
            placeholder="請輸入團隊邀請碼"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-black focus:outline-none focus:ring-2 focus:ring-black"
            required
          />
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <button
            type="submit"
            className="w-full bg-black text-white py-3 rounded-xl font-semibold shadow hover:bg-gray-800 transition"
            disabled={loading}
          >
            {loading ? "加入中..." : "加入團隊"}
          </button>
        </form>
      </div>
    </div>
  );
} 