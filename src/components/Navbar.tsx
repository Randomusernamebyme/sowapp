"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const menuItems = [
  { label: "主頁", path: "/dashboard" },
  { label: "個人檔案", path: "/profile-setup" },
  { label: "任務", path: "/missions" },
  { label: "團隊", path: "/teams" },
  { label: "登出", path: "/auth" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50 shadow-sm">
      <div className="flex-1 flex justify-center">
        <span className="text-lg font-bold tracking-tight select-none">Sowapp</span>
      </div>
      <div className="absolute right-4">
        <button
          aria-label="Open menu"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="block w-6 h-0.5 bg-black rounded mb-1"></span>
          <span className="block w-6 h-0.5 bg-black rounded mb-1"></span>
          <span className="block w-6 h-0.5 bg-black rounded"></span>
        </button>
        {open && (
          <div ref={menuRef} className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-200 py-2">
            {menuItems.map((item) => (
              <button
                key={item.path}
                className="w-full text-left px-4 py-2 text-black hover:bg-gray-100 rounded-xl transition"
                onClick={() => {
                  setOpen(false);
                  router.push(item.path);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
} 