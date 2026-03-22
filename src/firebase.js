import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCxBSKwTOHcv4AEOp68-0Bk0D8lhZawM7Y",
  authDomain: "segundo-cerebro-82777.firebaseapp.com",
  projectId: "segundo-cerebro-82777",
  storageBucket: "segundo-cerebro-82777.firebasestorage.app",
  messagingSenderId: "341408588298",
  appId: "1:341408588298:web:f5a6364899bbf9b9f3f5f3"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');
