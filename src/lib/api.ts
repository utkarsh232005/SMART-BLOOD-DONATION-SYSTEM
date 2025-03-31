import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  addDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { get, ref, set, update } from 'firebase/database';
import { auth, db, rtdb } from './firebase-config.ts';
import { User, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';

// Base API URL
const API_BASE_URL = 'http://localhost:8082';

// Auth token management is handled by Firebase Authentication
const TOKEN_KEY = 'auth_token';

// Check if user is authenticated using Firebase Auth
export const isAuthenticated = (): boolean => {
  return !!auth.currentUser;
};

// Get current user info
export const getCurrentUser = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  
  try {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
      return {
        ...userDoc.data(),
        uid: currentUser.uid,
        email: currentUser.email
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
};

// Authentication API
export const authAPI = {
  register: async (userData: any) => {
    try {
      const { email, password, ...profileData } = userData;
      
      // Create user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Save profile data to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        ...profileData,
        email,
        createdAt: Timestamp.now(),
        role: userData.role || 'donor',
      });
      
      // Save to Realtime DB for online status
      await set(ref(rtdb, `users/${user.uid}`), {
        name: userData.name,
        email,
        bloodType: userData.bloodType,
        online: true,
        lastActive: new Date().toISOString()
      });
      
      // Add to blood type group
      if (userData.bloodType) {
        await set(ref(rtdb, `bloodGroups/${userData.bloodType}/${user.uid}`), true);
      }
      
      return {
        user: {
          uid: user.uid,
          email: user.email
        }
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },
  
  login: async (credentials: { email: string; password: string }) => {
    try {
      // Add device info to the login request
      const deviceInfo = {
        ...getBrowserInfo()
      };
      
      // Sign in with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        credentials.email, 
        credentials.password
      );
      const user = userCredential.user;
      
      // Update user's last login and device info
      await updateDoc(doc(db, 'users', user.uid), {
        lastLogin: Timestamp.now(),
        lastDevice: deviceInfo
      });
      
      // Update online status in Realtime Database
      await update(ref(rtdb, `users/${user.uid}`), {
        online: true,
        lastActive: new Date().toISOString()
      });
      
      return {
        user: {
          uid: user.uid,
          email: user.email
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  logout: async () => {
    const user = auth.currentUser;
    
    if (user) {
      // Update online status before signing out
      await update(ref(rtdb, `users/${user.uid}`), {
        online: false,
        lastActive: new Date().toISOString()
      });
    }
    
    return signOut(auth);
  }
};

// Helper function to get browser and device information
const getBrowserInfo = (): any => {
  if (typeof window === 'undefined') return { device: 'server' };
  
  const userAgent = window.navigator.userAgent;
  return {
    userAgent,
    browser: detectBrowser(userAgent),
    os: detectOS(userAgent),
    device: detectDevice(userAgent),
    time: new Date().toISOString()
  };
};

// Simple browser detection
const detectBrowser = (userAgent: string): string => {
  if (userAgent.indexOf("Firefox") > -1) return "Firefox";
  if (userAgent.indexOf("Opera") > -1 || userAgent.indexOf("OPR") > -1) return "Opera";
  if (userAgent.indexOf("Edge") > -1) return "Edge";
  if (userAgent.indexOf("Chrome") > -1) return "Chrome";
  if (userAgent.indexOf("Safari") > -1) return "Safari";
  if (userAgent.indexOf("MSIE") > -1 || userAgent.indexOf("Trident") > -1) return "Internet Explorer";
  return "Unknown";
};

// Simple OS detection
const detectOS = (userAgent: string): string => {
  if (userAgent.indexOf("Windows") > -1) return "Windows";
  if (userAgent.indexOf("Mac") > -1) return "MacOS";
  if (userAgent.indexOf("Linux") > -1) return "Linux";
  if (userAgent.indexOf("Android") > -1) return "Android";
  if (userAgent.indexOf("iOS") > -1 || userAgent.indexOf("iPhone") > -1 || userAgent.indexOf("iPad") > -1) return "iOS";
  return "Unknown";
};

// Simple device detection
const detectDevice = (userAgent: string): string => {
  if (userAgent.indexOf("Mobile") > -1) return "Mobile";
  if (userAgent.indexOf("Tablet") > -1) return "Tablet";
  return "Desktop";
};

// User API
export const userAPI = {
  getProfile: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) throw new Error('User profile not found');
    
    return {
      ...userDoc.data(),
      uid: user.uid,
      email: user.email
    };
  },
  
  getAllUsers: async () => {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    return usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },
  
  getDonorsByBloodType: async (bloodType: string) => {
    const donorsQuery = query(
      collection(db, 'users'),
      where('bloodType', '==', bloodType),
      where('role', '==', 'donor')
    );
    
    const donorsSnapshot = await getDocs(donorsQuery);
    return donorsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },
  
  updateProfile: async (userData: any) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    
    // Update Firestore document
    await updateDoc(doc(db, 'users', user.uid), {
      ...userData,
      updatedAt: Timestamp.now()
    });
    
    // Update relevant fields in Realtime Database
    const rtdbUpdate: any = {};
    if (userData.name) rtdbUpdate.name = userData.name;
    if (userData.bloodType) rtdbUpdate.bloodType = userData.bloodType;
    
    await update(ref(rtdb, `users/${user.uid}`), rtdbUpdate);
    
    // If blood type changed, update blood group memberships
    if (userData.bloodType && userData.previousBloodType && userData.previousBloodType !== userData.bloodType) {
      // Remove from old blood group
      await set(ref(rtdb, `bloodGroups/${userData.previousBloodType}/${user.uid}`), null);
      // Add to new blood group
      await set(ref(rtdb, `bloodGroups/${userData.bloodType}/${user.uid}`), true);
    }
    
    return { success: true };
  }
};

// Blood Request API
export const bloodRequestAPI = {
  getAllRequests: async () => {
    const requestsSnapshot = await getDocs(
      query(collection(db, 'requests'), orderBy('createdAt', 'desc'))
    );
    
    return requestsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },
  
  createRequest: async (requestData: any) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    
    const newRequest = {
      ...requestData,
      userId: user.uid,
      userEmail: user.email,
      status: 'pending',
      createdAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'requests'), newRequest);
    
    // Also add to realtime database for notifications
    await set(ref(rtdb, `requests/${docRef.id}`), {
      ...newRequest,
      id: docRef.id,
      createdAt: new Date().toISOString()
    });
    
    return {
      id: docRef.id,
      ...newRequest
    };
  },
  
  acceptRequest: async (requestId: string, donorId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    
    // Update request in Firestore
    await updateDoc(doc(db, 'requests', requestId), {
      status: 'accepted',
      donorId: donorId,
      acceptedAt: Timestamp.now()
    });
    
    // Update in Realtime Database
    await update(ref(rtdb, `requests/${requestId}`), {
      status: 'accepted',
      donorId: donorId,
      acceptedAt: new Date().toISOString()
    });
    
    return { success: true };
  },
  
  getMyRequests: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    
    const myRequestsQuery = query(
      collection(db, 'requests'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    
    const requestsSnapshot = await getDocs(myRequestsQuery);
    return requestsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }
};

// Donation API
export const donationAPI = {
  // Get all available donations
  getAvailableDonations: async () => {
    const donationsQuery = query(
      collection(db, 'donations'),
      where('status', '==', 'available'),
      orderBy('createdAt', 'desc')
    );
    
    const donationsSnapshot = await getDocs(donationsQuery);
    return donationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },
  
  // Get all donations (admin only)
  getAllDonations: async () => {
    const donationsSnapshot = await getDocs(
      query(collection(db, 'donations'), orderBy('createdAt', 'desc'))
    );
    
    return donationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },
  
  // Get donations by blood type
  getDonationsByBloodType: async (bloodType: string) => {
    const donationsQuery = query(
      collection(db, 'donations'),
      where('bloodType', '==', bloodType),
      where('status', '==', 'available'),
      orderBy('createdAt', 'desc')
    );
    
    const donationsSnapshot = await getDocs(donationsQuery);
    return donationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },
  
  // Get current user's donations (as donor)
  getMyDonations: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    
    try {
      console.log("Getting donations for user:", user.uid);
      
      // Query Firestore for donations where donorId equals the current user's ID
      const donationsRef = collection(db, 'donations');
      const q = query(
        donationsRef,
        where('donorId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      console.log("Executing Firestore query");
      const querySnapshot = await getDocs(q);
      console.log("Query complete, documents found:", querySnapshot.size);
      
      // Convert query snapshot to array of donation objects
      const donations = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log("Parsed donations:", donations);
      return donations;
    } catch (error) {
      console.error("Error getting user donations:", error);
      throw error;
    }
  },
  
  // Get current user's donation requests (as recipient)
  getMyRequests: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    
    const myRequestsQuery = query(
      collection(db, 'donations'),
      where('recipientId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    
    const requestsSnapshot = await getDocs(myRequestsQuery);
    return requestsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },
  
  // Create a new donation listing
  createDonation: async (donationData: any) => {
    try {
      // First check if the user is authenticated
      const user = auth.currentUser;
      if (!user) {
        console.error("Authentication error: No user is signed in");
        throw new Error('Not authenticated. Please sign in again.');
      }
      
      console.log("Creating donation with user:", user.uid, user.email);
      
      // Ensure we have all required fields
      if (!donationData.bloodType) throw new Error("Blood type is required");
      if (!donationData.contactNumber) throw new Error("Contact number is required");
      if (!donationData.availability) throw new Error("Availability is required");
      if (!donationData.location) throw new Error("Location is required");
      
      // Create the donation document
      const newDonation = {
        bloodType: donationData.bloodType,
        contactNumber: donationData.contactNumber,
        availability: donationData.availability,
        location: donationData.location,
        notes: donationData.notes || "",
        status: donationData.status || 'available',
        donorId: user.uid,
        donorEmail: user.email,
        createdAt: Timestamp.now()
      };
      
      console.log("Saving donation to Firestore:", JSON.stringify(newDonation));
      
      // Save to Firestore with explicit error handling
      try {
        // Get a reference to the donations collection
        const donationsRef = collection(db, 'donations');
        console.log("Got collection reference");
        
        // Add the document
        const docRef = await addDoc(donationsRef, newDonation);
        console.log("Document created with ID:", docRef.id);
        
        // Return the created document with ID
        return {
          id: docRef.id,
          ...newDonation
        };
      } catch (firestoreError: any) {
        console.error("Firestore error in createDonation:", firestoreError);
        console.error("Error code:", firestoreError.code);
        console.error("Error message:", firestoreError.message);
        
        // More specific error messages based on Firestore error codes
        if (firestoreError.code === 'permission-denied') {
          throw new Error('You do not have permission to create donations. Please check your account.');
        } else if (firestoreError.code === 'unavailable') {
          throw new Error('The service is currently unavailable. Please check your internet connection and try again.');
        } else {
          throw new Error(`Firebase error: ${firestoreError.message}`);
        }
      }
    } catch (error: any) {
      console.error("Error creating donation:", error);
      // Re-throw with clear message
      throw error;
    }
  },
  
  // Request a donation as a recipient
  requestDonation: async (donationId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    
    await updateDoc(doc(db, 'donations', donationId), {
      status: 'requested',
      recipientId: user.uid,
      recipientEmail: user.email,
      requestedAt: Timestamp.now()
    });
    
    return { success: true };
  },
  
  // Confirm a donation (donor confirms)
  confirmDonation: async (donationId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    
    // Verify user is the donor
    const donationDoc = await getDoc(doc(db, 'donations', donationId));
    if (!donationDoc.exists()) throw new Error('Donation not found');
    
    const donationData = donationDoc.data();
    if (donationData.donorId !== user.uid) throw new Error('Only the donor can confirm this donation');
    
    await updateDoc(doc(db, 'donations', donationId), {
      status: 'completed',
      completedAt: Timestamp.now()
    });
    
    return { success: true };
  },
  
  // Cancel a donation request (recipient cancels)
  cancelRequest: async (donationId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    
    // Verify user is the recipient
    const donationDoc = await getDoc(doc(db, 'donations', donationId));
    if (!donationDoc.exists()) throw new Error('Donation not found');
    
    const donationData = donationDoc.data();
    if (donationData.recipientId !== user.uid) throw new Error('Only the recipient can cancel this request');
    
    await updateDoc(doc(db, 'donations', donationId), {
      status: 'available',
      recipientId: null,
      recipientEmail: null,
      requestedAt: null
    });
    
    return { success: true };
  }
}; 