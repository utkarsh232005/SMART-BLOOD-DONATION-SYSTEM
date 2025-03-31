/**
 * API Fallback Service
 * Provides a unified API interface using Firebase.
 */

import { auth, db, rtdb } from "./src/lib/firebase-config.js";
import { collection, addDoc, getDocs, query, where, doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { ref, set, get, push, remove } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

class ApiFallbackService {
    constructor() {
        // Remove MySQL server URL and server availability check
    }

    // Get current user
    async getCurrentUser() {
        return new Promise((resolve) => {
            const unsubscribe = auth.onAuthStateChanged((user) => {
                unsubscribe();
                resolve(user);
            });
        });
    }

    // Generic method to handle API requests with Firebase
    async apiRequest(endpoint, firebaseMethod, options = {}) {
        try {
            return await firebaseMethod(options);
        } catch (error) {
            console.error("Firebase operation error:", error);
            throw error;
        }
    }
}

// Create and export a singleton instance
const apiFallback = new ApiFallbackService();
export default apiFallback;
