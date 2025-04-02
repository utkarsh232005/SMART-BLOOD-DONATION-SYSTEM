/**
 * DEPLOYMENT GUIDE
 * 
 * This file contains instructions for deploying your BloodConnect application to Firebase.
 * 
 * DEPLOYING FIRESTORE INDEXES
 * 
 * 1. Make sure you have Firebase CLI installed:
 *    npm install -g firebase-tools
 * 
 * 2. Log in to Firebase (if not already logged in):
 *    firebase login
 * 
 * 3. Navigate to the project root directory:
 *    cd "c:\Users\utkar\Downloads\smart blood donation system with mysql"
 * 
 * 4. Initialize Firebase in your project (if not already done):
 *    firebase init
 *    - Select "Firestore" when prompted for features
 *    - Choose your Firebase project
 *    - Accept the default file locations for Firestore rules and indexes
 * 
 * 5. Make sure the firestore.indexes.json file is in your project root
 *    - This file should contain all your index definitions
 * 
 * 6. Deploy only the Firestore indexes:
 *    firebase deploy --only firestore:indexes
 * 
 * 7. Wait for confirmation that indexes are being built
 *    - Note: It may take several minutes for indexes to finish building
 * 
 * 8. Check the status of your indexes in the Firebase Console:
 *    - Go to https://console.firebase.google.com/
 *    - Select your project
 *    - Navigate to Firestore Database → Indexes
 * 
 * FULL APPLICATION DEPLOYMENT
 * 
 * To deploy the entire application, build it first and then deploy:
 * 
 * 1. Build your Next.js application:
 *    cd FRONT
 *    npm run build
 *    npm run export (if using static export in next.config.js)
 * 
 * 2. Deploy everything to Firebase:
 *    firebase deploy
 * 
 * INDIVIDUAL COMPONENT DEPLOYMENT
 * 
 * - Deploy only Firestore rules:
 *   firebase deploy --only firestore:rules
 * 
 * - Deploy only hosting:
 *   firebase deploy --only hosting
 * 
 * - Deploy only functions:
 *   firebase deploy --only functions
 */
