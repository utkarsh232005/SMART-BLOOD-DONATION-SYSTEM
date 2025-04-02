/**
 * FIREBASE INDEXES SETUP GUIDE
 * 
 * This file contains a comprehensive list of all indexes required for the Blood Donation System.
 * It includes both your existing indexes and new ones needed for the current functionality.
 * 
 * EXISTING INDEXES (ALREADY CREATED):
 * 
 * 1. Collection: users
 *    Fields: 
 *    - bloodType (Ascending)
 *    - lastDonation (Descending)
 *    - __name__ (Descending)
 * 
 * 2. Collection: users
 *    Fields:
 *    - role (Ascending)
 *    - createdAt (Descending)
 *    - __name__ (Descending)
 * 
 * 3. Collection: appointments
 *    Fields:
 *    - status (Ascending)
 *    - donationDate (Ascending)
 *    - __name__ (Ascending)
 * 
 * 4. Collection: appointments
 *    Fields:
 *    - donorId (Ascending)
 *    - createdAt (Descending)
 *    - __name__ (Descending)
 * 
 * 5. Collection: appointments
 *    Fields:
 *    - hospitalId (Ascending)
 *    - createdAt (Descending)
 *    - __name__ (Descending)
 * 
 * 6. Collection: donationRequests
 *    Fields:
 *    - createdBy (Ascending)
 *    - createdAt (Descending)
 *    - __name__ (Descending)
 * 
 * 7. Collection: donationRequests
 *    Fields:
 *    - bloodType (Ascending)
 *    - createdAt (Descending)
 *    - __name__ (Descending)
 * 
 * 8. Collection: donationRequests
 *    Fields:
 *    - status (Ascending)
 *    - urgency (Descending)
 *    - createdAt (Descending)
 *    - __name__ (Descending)
 * 
 * 9. Collection: bloodInventory
 *    Fields:
 *    - hospitalId (Ascending)
 *    - bloodType (Ascending)
 *    - __name__ (Ascending)
 * 
 * ADDITIONAL INDEXES NEEDED FOR CURRENT FUNCTIONALITY:
 * 
 * 10. Collection: donations
 *     Fields: 
 *     - status (Ascending)
 *     - __name__ (Ascending)
 * 
 * 11. Collection: donations
 *     Fields: 
 *     - donorId (Ascending)
 *     - __name__ (Ascending)
 * 
 * 12. Collection: donations
 *     Fields: 
 *     - donorId (Ascending)
 *     - contentHash (Ascending)
 *     - createdAt (Ascending)
 * 
 * 13. Collection: notifications
 *     Fields:
 *     - userId (Ascending)
 *     - createdAt (Descending)
 * 
 * 14. Collection: requests
 *     Fields:
 *     - userId (Ascending)
 *     - createdAt (Descending)
 * 
 * NOTE: After creating indexes, it may take a few minutes for them to be built and become active.
 * During this time, you might still see index errors. You can check the status of your indexes
 * in the Firebase Console.
 * 
 * HOW TO CREATE NEW INDEXES:
 * 1. Go to https://console.firebase.google.com/
 * 2. Select your project
 * 3. Go to "Firestore Database" in the left menu
 * 4. Click on the "Indexes" tab
 * 5. Click "Add index" button
 * 6. Fill in the Collection ID and fields as listed above
 * 7. Set the Query scope to "Collection"
 * 8. Click "Create index"
 */
