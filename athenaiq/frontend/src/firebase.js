import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBcC_py5RtC68u_btX4LlXEni7pCKCO3U4",
  authDomain: "knowledge-ai-73761.firebaseapp.com",
  projectId: "knowledge-ai-73761",
  storageBucket: "knowledge-ai-73761.firebasestorage.app",
  messagingSenderId: "709146981197",
  appId: "1:709146981197:web:46088e8f964eb66407fd04",
  measurementId: "G-2ZXB4MWP20"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
