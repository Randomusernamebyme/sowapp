# Seek our Ways (全民運動)

一個基於位置的冒險遊戲，旨在促進身體活動和社區互動。

## 技術棧

- **前端**: Next.js, TypeScript, TailwindCSS
- **後端**: Firebase (Authentication, Firestore, Storage)
- **地圖**: Leaflet.js
- **PWA**: next-pwa

## 開發環境設置

1. 克隆專案
```bash
git clone https://github.com/Randomusernamebyme/sowapp.git
cd sowapp
```

2. 安裝依賴
```bash
npm install
```

3. 設置環境變量
複製 `.env.example` 到 `.env.local` 並填入必要的環境變量。

4. 運行開發伺服器
```bash
npm run dev
```

## 部署

專案使用 Vercel 進行部署。每次推送到 main 分支時會自動部署。

## 功能

- 用戶註冊和個人資料管理
- 基於 GPS 的檢查點導航
- 團隊形成和管理
- 任務進度追蹤
- PWA 支持

## 貢獻

歡迎提交 Pull Request 或創建 Issue。

## 授權

MIT License 