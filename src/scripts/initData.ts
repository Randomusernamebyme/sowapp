import { db, auth } from '../lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';

// 管理員用戶數據
const adminUser = {
  email: 'admin@sowapp.com',
  password: 'Admin@123', // 請在創建後立即更改此密碼
  displayName: '系統管理員',
  isAdmin: true,
  role: 'A',
  fitnessLevel: 'advanced',
  createdAt: new Date().toISOString()
};

// 初始任務數據
const initialMission = {
  title: '拆除炸彈',
  description: '一個神秘的炸彈被放置在龍虎山，需要團隊合作來拆除它。',
  difficulty: 'medium',
  startLocation: {
    lat: 22.2833,
    lng: 114.1500
  },
  endLocation: {
    lat: 22.2833,
    lng: 114.1500
  },
  estimatedDuration: 120, // 分鐘
  password: '123456',
  isActive: true,
  createdAt: new Date().toISOString()
};

// 初始檢查點數據
const initialCheckpoints = [
  {
    name: '香港大學站 A2 出口',
    description: '任務開始點，獲取初始指示',
    location: {
      lat: 22.2833,
      lng: 114.1500
    },
    challengeType: 'puzzle',
    challengeDescription: '解開第一個謎題',
    clue: '尋找站牌上的特殊標記',
    passwordDigit: {
      position: 1,
      value: '1'
    },
    nextCheckpoint: 'stone_houses'
  },
  {
    name: '石屋',
    description: '歷史建築物，尋找線索',
    location: {
      lat: 22.2833,
      lng: 114.1500
    },
    challengeType: 'physical',
    challengeDescription: '完成團隊平衡挑戰',
    clue: '注意建築物的特殊結構',
    passwordDigit: {
      position: 2,
      value: '2'
    },
    nextCheckpoint: 'public_toilet'
  },
  {
    name: '許願洲街公廁',
    description: '公共設施，尋找隱藏信息',
    location: {
      lat: 22.2833,
      lng: 114.1500
    },
    challengeType: 'photo',
    challengeDescription: '拍攝特定角度的照片',
    clue: '觀察周圍環境的細節',
    passwordDigit: {
      position: 3,
      value: '3'
    },
    nextCheckpoint: 'education_center'
  }
];

// 初始化數據的函數
async function initializeData() {
  try {
    // 創建管理員用戶
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      adminUser.email,
      adminUser.password
    );

    // 設置管理員用戶資料
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      ...adminUser,
      uid: userCredential.user.uid
    });

    // 創建初始任務
    const missionRef = doc(collection(db, 'missions'));
    await setDoc(missionRef, {
      ...initialMission,
      id: missionRef.id
    });

    // 創建初始檢查點
    for (const checkpoint of initialCheckpoints) {
      const checkpointRef = doc(collection(db, 'checkpoints'));
      await setDoc(checkpointRef, {
        ...checkpoint,
        id: checkpointRef.id,
        missionId: missionRef.id
      });
    }

    console.log('初始數據創建成功！');
  } catch (error) {
    console.error('初始化數據時出錯：', error);
  }
}

// 執行初始化
initializeData(); 