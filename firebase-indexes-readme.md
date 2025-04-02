# Firebase Indexes Guide

This document explains all indexes required for the Blood Donation System.

## Existing Indexes

1. **Collection: users**
   - `bloodType` (Ascending), `lastDonation` (Descending)
   - `role` (Ascending), `createdAt` (Descending)

2. **Collection: appointments**
   - `status` (Ascending), `donationDate` (Ascending)
   - `donorId` (Ascending), `createdAt` (Descending)
   - `hospitalId` (Ascending), `createdAt` (Descending)

3. **Collection: donationRequests**
   - `createdBy` (Ascending), `createdAt` (Descending)
   - `bloodType` (Ascending), `createdAt` (Descending)
   - `status` (Ascending), `urgency` (Descending), `createdAt` (Descending)

4. **Collection: bloodInventory**
   - `hospitalId` (Ascending), `bloodType` (Ascending)

## New Indexes

5. **Collection: donations**
   - `status` (Ascending)
   - `donorId` (Ascending)
   - `donorId` (Ascending), `contentHash` (Ascending), `createdAt` (Ascending)

6. **Collection: notifications**
   - `userId` (Ascending), `createdAt` (Descending)

7. **Collection: requests**
   - `userId` (Ascending), `createdAt` (Descending)

## Deployment Instructions

1. Place the `firestore.indexes.json` file in your project root
2. Run the command: `firebase deploy --only firestore:indexes`

Note: It may take a few minutes for indexes to be built and become active. During this time, you might still see index errors. You can check the status of your indexes in the Firebase Console.
