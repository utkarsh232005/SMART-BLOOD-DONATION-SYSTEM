(async () => {
    // Import Firebase modules dynamically
    const { auth, db, rtdb } = await import('./src/lib/firebase-config-browser.js');
    const { doc, getDoc, updateDoc, setDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    const {
        onAuthStateChanged,
        updateEmail,
        updatePassword,
        updateProfile,
        reauthenticateWithCredential,
        EmailAuthProvider
    } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js');
    const { ref, update, set } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js');

    // Check if user is logged in
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in, load profile data
            loadProfileData(user.uid);

            // Setup re-authentication dialog
            setupReauthModal();
        } else {
            // User is not signed in, redirect to login
            window.location.href = "login.html";
        }
    });

    // Load user profile data
    function loadProfileData(userId) {
        const userDoc = doc(db, "users", userId);

        getDoc(userDoc)
            .then((docSnap) => {
                if (docSnap.exists()) {
                    const userData = docSnap.data();

                    // Fill profile form with user data
                    document.getElementById("name").value = userData.name || "";
                    document.getElementById("email").value = userData.email || "";
                    document.getElementById("bloodType").value = userData.bloodType || "";
                    document.getElementById("phone").value = userData.phone || userData.phoneNumber || "";
                    document.getElementById("address").value = userData.address || "";
                }
            })
            .catch((error) => {
                console.error("Error loading profile data:", error);
                showError("Failed to load profile data. Please refresh the page.");
            });
    }

    // Setup re-authentication modal
    function setupReauthModal() {
        // Create re-authentication modal if it doesn't exist
        if (!document.getElementById('reauthModal')) {
            const modalHtml = `
                <div id="reauthModal" class="modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background-color:rgba(0,0,0,0.7); z-index:1000;">
                    <div class="modal-content" style="background-color:#1E1E1E; margin:15% auto; padding:20px; border:1px solid #333; border-radius:8px; width:90%; max-width:400px;">
                        <h3 style="color:white; margin-top:0;">Confirm Your Identity</h3>
                        <p style="color:#CCC;">For security, please enter your password to continue.</p>
                        <form id="reauthForm">
                            <div style="margin-bottom:15px;">
                                <input type="password" id="reauthPassword" placeholder="Your password" style="width:100%; padding:10px; background:#262626; border:1px solid #333; color:white; border-radius:4px;">
                            </div>
                            <div id="reauthError" style="color:#f44336; margin-bottom:10px; display:none;"></div>
                            <div style="display:flex; justify-content:flex-end; gap:10px;">
                                <button type="button" id="cancelReauth" style="padding:8px 16px; background:transparent; border:1px solid #9C27B0; color:#9C27B0; border-radius:4px; cursor:pointer;">Cancel</button>
                                <button type="submit" style="padding:8px 16px; background:#9C27B0; border:none; color:white; border-radius:4px; cursor:pointer;">Authenticate</button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = modalHtml;
            document.body.appendChild(modalContainer.firstElementChild);

            // Setup event listeners
            document.getElementById('cancelReauth').addEventListener('click', () => {
                hideReauthModal();
                // Reset any pending operations
                pendingProfileUpdate = null;
            });

            document.getElementById('reauthForm').addEventListener('submit', (e) => {
                e.preventDefault();
                const password = document.getElementById('reauthPassword').value;
                reauthenticateUser(password);
            });
        }
    }

    // Show re-authentication modal
    function showReauthModal() {
        document.getElementById('reauthModal').style.display = 'block';
        document.getElementById('reauthPassword').value = '';
        document.getElementById('reauthError').style.display = 'none';
    }

    // Hide re-authentication modal
    function hideReauthModal() {
        document.getElementById('reauthModal').style.display = 'none';
    }

    // Store pending profile update
    let pendingProfileUpdate = null;

    // Re-authenticate user
    function reauthenticateUser(password) {
        const user = auth.currentUser;
        if (!user || !user.email) {
            showReauthError('User not found. Please try logging in again.');
            return;
        }

        const credential = EmailAuthProvider.credential(user.email, password);

        reauthenticateWithCredential(user, credential)
            .then(() => {
                hideReauthModal();

                // Execute pending update if it exists
                if (pendingProfileUpdate) {
                    pendingProfileUpdate();
                    pendingProfileUpdate = null;
                }
            })
            .catch((error) => {
                console.error('Reauthentication error:', error);
                showReauthError('Invalid password. Please try again.');
            });
    }

    // Show re-authentication error
    function showReauthError(message) {
        const errorElement = document.getElementById('reauthError');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    // Handle profile update
    document.getElementById("profileForm")?.addEventListener("submit", function (event) {
        event.preventDefault();

        const user = auth.currentUser;
        if (!user) {
            showError("You must be logged in to update your profile.");
            return;
        }

        // Get form data
        const name = document.getElementById("name").value;
        const email = document.getElementById("email").value;
        const bloodType = document.getElementById("bloodType").value;
        const phone = document.getElementById("phone").value;
        const address = document.getElementById("address").value;
        const newPassword = document.getElementById("newPassword")?.value || "";

        // Validate required fields
        if (!name || !email || !bloodType) {
            showError("Name, email and blood type are required fields.");
            return;
        }

        // Show loading state
        const submitButton = this.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = 'Updating...';
        }
        hideError();

        // Check if email or password change requires re-authentication
        const needsReauth = (email !== user.email) || newPassword;

        // Create update function that will be executed directly or after re-authentication
        const executeProfileUpdate = () => {
            // Prepare the update data
            const userData = {
                name: name,
                email: email,
                bloodType: bloodType,
                phone: phone,
                phoneNumber: phone,
                address: address,
                updatedAt: new Date()
            };

            // We'll use setDoc with merge instead of updateDoc for better error handling
            setDoc(doc(db, "users", user.uid), userData, { merge: true })
                .then(() => {
                    console.log("Firestore profile updated successfully");

                    // Create a chain of promises for the remaining operations
                    let updateChain = Promise.resolve();

                    // Update display name if changed
                    if (name !== user.displayName) {
                        updateChain = updateChain.then(() => {
                            return updateProfile(user, { displayName: name });
                        });
                    }

                    // Update Realtime Database
                    updateChain = updateChain.then(() => {
                        return set(ref(rtdb, `users/${user.uid}`), {
                            name: name,
                            email: email,
                            bloodType: bloodType,
                            online: true,
                            lastActive: new Date().toISOString()
                        });
                    });

                    // Update email if changed
                    if (email !== user.email) {
                        updateChain = updateChain.then(() => {
                            return updateEmail(user, email);
                        });
                    }

                    // Update password if provided
                    if (newPassword) {
                        updateChain = updateChain.then(() => {
                            return updatePassword(user, newPassword);
                        });
                    }

                    // Handle final success or error
                    updateChain
                        .then(() => {
                            // Reset user reload to ensure latest details are shown
                            return user.reload();
                        })
                        .then(() => {
                            showSuccess("Profile updated successfully!");
                            // Reset password field
                            if (document.getElementById("newPassword")) {
                                document.getElementById("newPassword").value = "";
                            }
                        })
                        .catch((error) => {
                            console.error("Profile update chain error:", error);
                            showError(error.message || "Error updating profile. Please try again.");
                        })
                        .finally(() => {
                            // Reset button state
                            if (submitButton) {
                                submitButton.disabled = false;
                                submitButton.innerHTML = 'Update Profile';
                            }
                        });
                })
                .catch((error) => {
                    console.error("Firestore update error:", error);
                    showError("Failed to update profile in database. Please try again.");

                    // Reset button state
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.innerHTML = 'Update Profile';
                    }
                });
        };

        // If email or password is changing, we need to re-authenticate first
        if (needsReauth) {
            pendingProfileUpdate = executeProfileUpdate;
            showReauthModal();
        } else {
            // Otherwise execute update directly
            executeProfileUpdate();
        }
    });

    // Helper functions for UI feedback
    function showError(message) {
        const errorElement = document.getElementById("profileError") || createFeedbackElement("profileError", "error-message");
        errorElement.textContent = message;
        errorElement.style.display = "block";
    }

    function hideError() {
        const errorElement = document.getElementById("profileError");
        if (errorElement) {
            errorElement.style.display = "none";
        }
    }

    function showSuccess(message) {
        const successElement = document.getElementById("profileSuccess") || createFeedbackElement("profileSuccess", "success-message");
        successElement.textContent = message;
        successElement.style.display = "block";

        // Hide success message after 3 seconds
        setTimeout(() => {
            successElement.style.display = "none";
        }, 3000);
    }

    function createFeedbackElement(id, className) {
        const element = document.createElement("div");
        element.id = id;
        element.className = className;

        if (className === "error-message") {
            element.style.color = "#f44336";
        } else if (className === "success-message") {
            element.style.color = "#4caf50";
        }

        element.style.marginTop = "10px";
        element.style.marginBottom = "10px";

        const form = document.getElementById("profileForm");
        if (form) {
            form.appendChild(element);
        }

        return element;
    }
})();
