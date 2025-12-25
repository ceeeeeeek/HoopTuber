// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries


const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD5nt8_v6w2Gg_IlxPTO-pLrrOAsp-IDdw",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTHDOMAIN || "hooptuber-dev-1234.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID || "hooptuber-dev-1234.firebasestorage.app",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGEBUCKET || "288020494852",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDID || "1:288020494852:web:4f4e6c590a77c8b2df5351",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APPID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);