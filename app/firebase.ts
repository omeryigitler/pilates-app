import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

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

// Enable Offline Persistence (Classic Method - More Compatible)
// This attempts to enable persistence, but falls back gracefully if not supported,
// ensuring synchronization always works.
if (typeof window !== "undefined") {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') {
            // Multiple tabs open, persistence can only be enabled in one tab at a a time.
            console.warn("Firebase persistence failed-precondition: Multiple tabs open.");
        } else if (err.code == 'unimplemented') {
            // The current browser does not support all of the features required to enable persistence
            console.warn("Firebase persistence unimplemented: Browser not supported.");
        }
    });
}

export { db };
