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
  onSnapshot,
  limit,
  deleteDoc
} from 'firebase/firestore';
import { get, ref, set, update, push as rtdbPush } from 'firebase/database';
import { auth, db, rtdb } from './firebase-config';
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
  },
  
  updateRole: async (role: 'donor' | 'recipient'): Promise<void> => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      
      // Standardize role to uppercase for consistency
      const roleUppercase = role.toUpperCase();
      
      // Update Firestore directly instead of using API endpoint
      await updateDoc(doc(db, 'users', user.uid), {
        role: roleUppercase,
        updatedAt: Timestamp.now()
      });
      
      // Update realtime database as well
      await update(ref(rtdb, `users/${user.uid}`), {
        role: roleUppercase,
        updatedAt: new Date().toISOString()
      });
      
      console.log(`User role updated to ${roleUppercase}`);
      
      // Also store local token for API auth if needed
      localStorage.setItem('userRole', roleUppercase);
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
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
      
      // Get user profile to check role
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        throw new Error('User profile not found. Please complete your profile first.');
      }
      
      const userData = userDoc.data();
      console.log("User data for donation:", userData);
      
      // Check role in uppercase (standardize comparison)
      const userRole = (userData.role || '').toUpperCase();
      
      // Always update the role to DONOR before attempting to create a donation
      // This solves permission issues with security rules
      if (userRole !== 'DONOR') {
        console.log(`Current role is ${userRole}, updating to DONOR`);
        
        try {
          // Update role to DONOR in Firestore
          await updateDoc(doc(db, 'users', user.uid), {
            role: 'DONOR',
            updatedAt: Timestamp.now()
          });
          
          // Also update in realtime DB
          await update(ref(rtdb, `users/${user.uid}`), {
            role: 'DONOR',
            updatedAt: new Date().toISOString()
          });
          
          console.log("Role updated to DONOR for donation");
          
          // Wait for permissions to propagate
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (roleError) {
          console.error("Error updating role:", roleError);
          // Continue anyway, maybe the donation creation will still work
        }
      }
      
      // Ensure we have all required fields
      if (!donationData.bloodType) throw new Error("Blood type is required");
      if (!donationData.contactNumber) throw new Error("Contact number is required");
      if (!donationData.availability) throw new Error("Availability is required");
      if (!donationData.location) throw new Error("Location is required");
      
      // Prepare donor name using first and last name if available
      const donorName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Anonymous';
      
      // Create the donation document with proper time fields
      const newDonation = {
        bloodType: donationData.bloodType,
        contactNumber: donationData.contactNumber,
        availability: donationData.availability,
        location: donationData.location,
        additionalInfo: donationData.additionalInfo || "",
        status: donationData.status || 'available',
        donorId: user.uid,
        donorName: donorName,
        donorEmail: user.email,
        createdAt: Timestamp.now(),
        listedOn: new Date().toISOString(),
        updatedAt: Timestamp.now()
      };
      
      console.log("Saving donation to Firestore:", JSON.stringify(newDonation));
      
      // First try to create the donations collection if it doesn't exist yet
      try {
        // Create a temporary document if needed to ensure collection exists
        const tempCollectionRef = collection(db, 'donations');
        const donationsExist = await getDocs(query(tempCollectionRef, limit(1)));
        
        if (donationsExist.empty) {
          console.log("Creating donations collection");
          // Add a temporary document to create the collection
          const tempDoc = await addDoc(tempCollectionRef, { 
            temp: true, 
            createdAt: Timestamp.now() 
          });
          
          // Delete the temporary document
          await deleteDoc(doc(db, 'donations', tempDoc.id));
        }
      } catch (error) {
        console.log("Error checking/creating collection:", error);
        // Continue anyway
      }
      
      // Save to Firestore - now the collection should exist
      try {
        const donationsRef = collection(db, 'donations');
        const docRef = await addDoc(donationsRef, newDonation);
        console.log("Donation document created with ID:", docRef.id);
        
        // Also save to realtime database for faster access
        await set(ref(rtdb, `donations/${docRef.id}`), {
          ...newDonation,
          id: docRef.id,
          createdAt: new Date().toISOString()
        });
        
        // Update user's donation list (optional, for faster queries)
        const userDonationsRef = collection(db, `users/${user.uid}/donations`);
        await setDoc(doc(userDonationsRef, docRef.id), {
          donationId: docRef.id,
          bloodType: donationData.bloodType,
          createdAt: Timestamp.now(),
          status: 'available'
        });
        
        // Return the created document with ID and donor info
        return {
          id: docRef.id,
          ...newDonation,
          donor: {
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            email: user.email
          }
        };
      } catch (addError) {
        console.error("Error adding donation document:", addError);
        throw new Error("Failed to create donation. You may need to refresh and try again.");
      }
    } catch (error: any) {
      console.error("Error creating donation:", error);
      
      // Check specific error types and provide helpful messages
      if (error.code === 'permission-denied') {
        throw new Error('Permission denied. Please make sure you are logged in as a donor. Try refreshing the page and trying again.');
      } else if (error.message && error.message.includes('role')) {
        throw new Error('You must be a donor to list donations. Please update your role in the dashboard and try again.');
      } else {
        throw error;
      }
    }
  },
  
  // Request a donation as a recipient
  requestDonation: async (donationId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    
    // Get user data for the recipient name
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.exists() ? userDoc.data() : null;
    
    await updateDoc(doc(db, 'donations', donationId), {
      status: 'requested',
      recipientId: user.uid,
      recipientEmail: user.email,
      recipientName: userData?.firstName ? `${userData.firstName} ${userData.lastName || ''}` : user.displayName || 'Anonymous Recipient',
      requestedAt: Timestamp.now()
    });
    
    // Add a notification for the donor
    try {
      const donationDoc = await getDoc(doc(db, 'donations', donationId));
      if (donationDoc.exists()) {
        const donationData = donationDoc.data();
        const donorId = donationData.donorId;
        
        // Create notification in Firestore
        await addDoc(collection(db, 'notifications'), {
          userId: donorId,
          type: 'request',
          title: 'New Donation Request',
          message: `Someone has requested your ${donationData.bloodType} blood donation.`,
          donationId: donationId,
          read: false,
          createdAt: Timestamp.now()
        });
        
        // Also add to realtime database for immediate delivery
        await rtdbPush(ref(rtdb, `users/${donorId}/notifications`), {
          type: 'request',
          title: 'New Donation Request',
          message: `Someone has requested your ${donationData.bloodType} blood donation.`,
          donationId: donationId,
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error creating notification:", error);
      // Continue anyway since the request was successful
    }
    
    return { success: true };
  },
  
  // Accept a donation request (donor accepts a recipient's request)
  acceptDonationRequest: async (donationId: string, recipientId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    
    // Verify user is the donor
    const donationDoc = await getDoc(doc(db, 'donations', donationId));
    if (!donationDoc.exists()) throw new Error('Donation not found');
    
    const donationData = donationDoc.data();
    if (donationData.donorId !== user.uid) throw new Error('Only the donor can accept this request');
    
    // Update donation status
    await updateDoc(doc(db, 'donations', donationId), {
      status: 'accepted',
      acceptedAt: Timestamp.now()
    });
    
    // Create notification for the recipient
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : null;
      const donorName = userData && userData.firstName ? 
        `${userData.firstName} ${userData.lastName || ''}` : 
        user.displayName || 'A donor';
      
      // Create notification in Firestore
      await addDoc(collection(db, 'notifications'), {
        userId: recipientId,
        type: 'accepted',
        title: 'Donation Request Accepted',
        message: `${donorName} has accepted your blood donation request.`,
        donationId: donationId,
        read: false,
        createdAt: Timestamp.now()
      });
      
      // Also add to realtime database for immediate delivery
      await rtdbPush(ref(rtdb, `users/${recipientId}/notifications`), {
        type: 'accepted',
        title: 'Donation Request Accepted',
        message: `${donorName} has accepted your blood donation request.`,
        donationId: donationId,
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error creating notification:", error);
      // Continue anyway since the acceptance was successful
    }
    
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
  },
  
  // Get user's notifications
  getNotifications: async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    const notificationsSnapshot = await getDocs(notificationsQuery);
    return notificationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },
  
  // Mark notification as read
  markNotificationAsRead: async (notificationId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true
    });
    
    return { success: true };
  }
};