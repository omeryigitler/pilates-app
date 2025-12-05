import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBG2Br1O8PkgKg4ofeXbdqSO0OxkbHMxao",
    authDomain: "reformer-pilates-malta.firebaseapp.com",
    projectId: "reformer-pilates-malta",
    storageBucket: "reformer-pilates-malta.firebasestorage.app",
    messagingSenderId: "229596924816",
    appId: "1:229596924816:web:7861587fac11fc59188115",
    measurementId: "G-W4ZP6FS2LB"
};

// Initialize Firebase properly (Singleton pattern for Next.js)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// Explicitly set persistence ensures it sticks even after bad resets
setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error("Firebase Persistence Error:", error);
});
// Enable Firestore persistence for offline support (Optional but good)
// enableIndexedDbPersistence(db).catch((err) => {
//     if (err.code == 'failed-precondition') {
//         // Multiple tabs open, persistence can only be enabled in one tab at a a time.
//         // ...
//     } else if (err.code == 'unimplemented') {
//         // The current browser does not support all of the features required to enable persistence
//         // ...
//     }
// });
