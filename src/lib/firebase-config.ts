// Firebase configuration using npm imports
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getDatabase, Database } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBc-iLFO3gg7VbXvVfc7rWDwod5LhqIS6k",
    authDomain: "smart-blood-donation-8ca0e.firebaseapp.com",
    databaseURL: "https://smart-blood-donation-8ca0e-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "smart-blood-donation-8ca0e",
    storageBucket: "smart-blood-donation-8ca0e.firebasestorage.app",
    messagingSenderId: "1053679517257",
    appId: "1:1053679517257:web:a4aa2398d42683be794998",
    measurementId: "G-CPGQ4GL0D1"
};

// Initialize Firebase with error handling
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let rtdb: Database;

try {
    console.log("Initializing Firebase with config:", firebaseConfig);
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    rtdb = getDatabase(app);
    
    console.log("Firebase successfully initialized!");
} catch (error) {
    console.error("Error initializing Firebase:", error);
    throw new Error("Failed to initialize Firebase");
}

// For development/debugging - log auth state changes
auth.onAuthStateChanged(user => {
    if (user) {
        console.log("User is signed in:", user.uid);
    } else {
        console.log("User is signed out");
    }
});

export { auth, db, storage, rtdb }; 