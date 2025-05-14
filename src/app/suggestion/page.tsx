"use client";
import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

export default function SuggestionPage() {
  const { user } = useAuth();
  const [mission, setMission] = useState("");
  const [flow, setFlow] = useState("");
  const [design, setDesign] = useState("");
  const [other, setOther] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      await addDoc(collection(db, "suggestions"), {
        userId: user?.uid || null,
        mission,
        flow,
        design,
        other,
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
      setMission("");
      setFlow("");
      setDesign("");
      setOther("");
    } catch (err: any) {
      setError("送出失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] p-4 flex flex-col items-center">
      <div className="max-w-xl w-full bg-[var(--color-card)] rounded-2xl shadow-lg p-6 border border-gray-200 mt-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-[var(--color-text)]">意見回饋</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[var(--color-text)] mb-2 font-medium">對本次任務的想法</label>
            <textarea
              className="w-full px-4 py-3 border border-[var(--color-secondary)] rounded-xl bg-[var(--color-secondary)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              rows={3}
              value={mission}
              onChange={e => setMission(e.target.value)}
              placeholder="請分享你對任務內容、挑戰、趣味性的看法..."
            />
          </div>
          <div>
            <label className="block text-[var(--color-text)] mb-2 font-medium">對遊戲流程的建議</label>
            <textarea
              className="w-full px-4 py-3 border border-[var(--color-secondary)] rounded-xl bg-[var(--color-secondary)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              rows={2}
              value={flow}
              onChange={e => setFlow(e.target.value)}
              placeholder="任務進行、團隊協作、地圖導航等流程體驗..."
            />
          </div>
          <div>
            <label className="block text-[var(--color-text)] mb-2 font-medium">對 App 設計的建議</label>
            <textarea
              className="w-full px-4 py-3 border border-[var(--color-secondary)] rounded-xl bg-[var(--color-secondary)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              rows={2}
              value={design}
              onChange={e => setDesign(e.target.value)}
              placeholder="UI/UX、顏色、操作、功能等..."
            />
          </div>
          <div>
            <label className="block text-[var(--color-text)] mb-2 font-medium">其他想法</label>
            <textarea
              className="w-full px-4 py-3 border border-[var(--color-secondary)] rounded-xl bg-[var(--color-secondary)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              rows={2}
              value={other}
              onChange={e => setOther(e.target.value)}
              placeholder="任何其他建議或感受..."
            />
          </div>
          {error && <div className="text-red-500 text-center">{error}</div>}
          {success && <div className="text-green-600 text-center">感謝您的寶貴意見！</div>}
          <button
            type="submit"
            className="w-full bg-[var(--color-primary)] text-[var(--color-bg)] py-3 rounded-xl font-semibold shadow hover:bg-[var(--color-accent)] transition"
            disabled={loading}
          >
            {loading ? "送出中..." : "送出建議"}
          </button>
        </form>
      </div>
    </div>
  );
} 