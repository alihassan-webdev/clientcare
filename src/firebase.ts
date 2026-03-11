import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyALqbMTOHLkMSJDtIzAx3PCNR2v5TkU1zs",
  authDomain: "client-care-6e7f2.firebaseapp.com",
  projectId: "client-care-6e7f2",
  storageBucket: "client-care-6e7f2.firebasestorage.app",
  messagingSenderId: "830917027489",
  appId: "1:830917027489:web:bd0d1a387b13242694f2e0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

export default app;
