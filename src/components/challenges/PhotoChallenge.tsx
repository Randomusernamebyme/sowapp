"use client";
import { useState, useRef } from "react";

interface PhotoChallengeProps {
  description: string;
  onComplete: () => void;
}

export default function PhotoChallenge({ description, onComplete }: PhotoChallengeProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTakePhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full p-4 bg-white rounded-xl border border-gray-200">
      <h3 className="text-lg font-semibold text-black mb-2">拍照挑戰</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      <div className="space-y-4">
        {photo ? (
          <div className="space-y-4">
            <img src={photo} alt="挑戰照片" className="w-full rounded-xl" />
            <div className="flex gap-2">
              <button
                className="flex-1 px-4 py-2 rounded-xl bg-gray-200 text-black font-semibold"
                onClick={() => setPhoto(null)}
              >
                重拍
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-xl bg-black text-white font-semibold"
                onClick={onComplete}
              >
                提交照片
              </button>
            </div>
          </div>
        ) : (
          <button
            className="w-full px-4 py-2 rounded-xl bg-black text-white font-semibold"
            onClick={handleTakePhoto}
          >
            拍照
          </button>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          capture="environment"
          className="hidden"
        />
      </div>
    </div>
  );
} 