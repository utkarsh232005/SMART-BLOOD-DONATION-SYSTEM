// Using dynamic import for browser environments
(async () => {
    // Import Firebase modules dynamically
    const { auth, db, rtdb } = await import('./src/lib/firebase-config-browser.js');
    const { createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js');
    const { doc, setDoc, collection } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    const { ref, set } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js');

    document.getElementById("registrationForm")?.addEventListener("submit", function (event) {
        event.preventDefault();

        const name = document.getElementById("name").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const bloodType = document.getElementById("bloodType").value;
        const phoneNumber = document.getElementById("phoneNumber")?.value || "";
        const address = document.getElementById("address")?.value || "";

        // Create new user with email and password
        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // User account created successfully
                const user = userCredential.user;

                // Update profile with display name
                return updateProfile(user, {
                    displayName: name
                }).then(() => user);
            })
            .then((user) => {
                // Add user profile info to Firestore (for detailed user data)
                const userDocPromise = setDoc(doc(db, "users", user.uid), {
                    name: name,
                    email: email,
                    bloodType: bloodType,
                    phoneNumber: phoneNumber,
                    address: address,
                    role: "donor", // Default role
                    createdAt: new Date(),
                    preferences: {
                        notifications: true,
                        emailAlerts: true
                    }
                });

                // Add user info to Realtime Database (for faster retrieval)
                const userRtdbPromise = set(ref(rtdb, `users/${user.uid}`), {
                    name: name,
                    email: email,
                    bloodType: bloodType,
                    online: true,
                    lastActive: new Date().toISOString()
                });

                // Add user to appropriate blood type group for targeting notifications
                const bloodGroupRef = ref(rtdb, `bloodGroups/${bloodType}/${user.uid}`);
                const bloodGroupPromise = set(bloodGroupRef, true);

                return Promise.all([userDocPromise, userRtdbPromise, bloodGroupPromise]).then(() => user);
            })
            .then(() => {
                console.log("Registration successful");
                // Redirect to login or dashboard
                window.location.href = "dashboard.html";
            })
            .catch((error) => {
                console.error("Registration error:", error.message);
                document.getElementById("registrationError").textContent = error.message;
            });
    });
})();
