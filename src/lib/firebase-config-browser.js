// Firebase configuration for browser usage with ESM imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";
import { getDatabase, connectDatabaseEmulator } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// Your web app's Firebase configuration - same as the main config
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const rtdb = getDatabase(app);

// Improve auth persistence
setPersistence(auth, browserLocalPersistence)
    .then(() => console.log("Auth persistence set to local"))
    .catch(error => console.error("Auth persistence error:", error));

// Enable offline data for Firestore
try {
    enableIndexedDbPersistence(db)
        .then(() => console.log("Firestore persistence enabled"))
        .catch(err => {
            if (err.code == 'failed-precondition') {
                console.warn("Firestore persistence requires exclusive browser tab");
            } else if (err.code == 'unimplemented') {
                console.warn("Browser doesn't support IndexedDB persistence");
            } else {
                console.error("Firestore persistence error:", err);
            }
        });
} catch (e) {
    console.warn("Firestore persistence setup error:", e);
}

// Listen for auth state changes to update online status
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in, update online status
        try {
            const userStatusRef = ref(rtdb, `users/${user.uid}`);
            set(userStatusRef, {
                online: true,
                lastActive: new Date().toISOString()
            });

            // Update status to offline when user closes tab/browser
            window.addEventListener('beforeunload', () => {
                set(userStatusRef, {
                    online: false,
                    lastActive: new Date().toISOString()
                });
            });
        } catch (e) {
            console.error("Error updating online status:", e);
        }
    }
});

export { auth, db, storage, rtdb };
