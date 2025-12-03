import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBG2Br1O8PkgKg4ofeXbdqSO0OxkbHMxao",
    authDomain: "reformer-pilates-malta.firebaseapp.com",
    projectId: "reformer-pilates-malta",
    storageBucket: "reformer-pilates-malta.firebasestorage.app",
    messagingSenderId: "229596924816",
    appId: "1:229596924816:web:7861587fac11fc59188115",
    measurementId: "G-W4ZP6FS2LB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
