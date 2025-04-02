// Copy these rules to your Firebase console (Firestore Database → Rules)

rules_version = '2';
service cloud.firestore {
    match / databases / { database } / documents {
        // Allow users to read/write their own data
        match / users / { userId } {
      allow read, write: if request.auth != null && request.auth.uid == userId;
        }

        // Allow donors to create donations
        match / donations / { donationId } {
      // Anyone can read available donations
      allow read: if request.auth != null;
      // Only owners can update their donations
      allow update, delete: if request.auth != null && resource.data.donorId == request.auth.uid;
      // Anyone authenticated can create a donation
      allow create: if request.auth != null;
        }

        // Allow users to read/write their own notifications
        match / notifications / { notificationId } {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      // Allow creation if the notification is for the authenticated user
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
        }

        // Blood requests can be read by anyone, but only edited by owner
        match / requests / { requestId } {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null &&
                (resource.data.userId == request.auth.uid || resource.data.donorId == request.auth.uid);
        }
    }
}
