"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const fitnessLevels = [
  { value: "beginner", label: "初學者" },
  { value: "intermediate", label: "中階" },
  { value: "advanced", label: "進階" },
];

export default function ProfileSetupPage() {
  const [displayName, setDisplayName] = useState("");
  const [fitnessLevel, setFitnessLevel] = useState(fitnessLevels[0].value);
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
          fitnessLevel,
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">個人檔案設定</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="暱稱"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="w-full px-4 py-2 border rounded"
            required
          />
          <div>
            <label className="block mb-2 font-semibold">體能等級</label>
            <select
              value={fitnessLevel}
              onChange={e => setFitnessLevel(e.target.value)}
              className="w-full px-4 py-2 border rounded"
            >
              {fitnessLevels.map(level => (
                <option key={level.value} value={level.value}>{level.label}</option>
              ))}
            </select>
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
            disabled={loading}
          >
            {loading ? "儲存中..." : "儲存並繼續"}
          </button>
        </form>
      </div>
    </div>
  );
} 