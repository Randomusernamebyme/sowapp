import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAm9BzPvU4qPVQJ7lD7Fry7ccvvZeVRG8s",
  authDomain: "sowapp-3d85f.firebaseapp.com",
  projectId: "sowapp-3d85f",
  storageBucket: "sowapp-3d85f.appspot.com",
  messagingSenderId: "715816519247",
  appId: "1:715816519247:web:cc8d96f6a5e3e43c1b4c3a",
  measurementId: "G-5Q20H356RJ"
};

// 初始化 Firebase
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage }; 