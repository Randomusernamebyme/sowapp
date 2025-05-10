"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function ProfileSetupPage() {
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

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
          email: user.email,
          createdAt: new Date(),
        }, { merge: true });
        router.push("/dashboard");
      } catch (err: any) {
        setError("儲存失敗，請重試");
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
        <h1 className="text-2xl font-bold mb-6 text-center text-black tracking-tight">個人檔案設定</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="暱稱"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-black focus:outline-none focus:ring-2 focus:ring-black"
            required
          />
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
  );
} 