// Using dynamic import for browser environments
(async () => {
    // Import Firebase modules dynamically for browser environment
    const { auth } = await import('./src/lib/firebase-config-browser.js');
    const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js');

    document.getElementById("loginForm")?.addEventListener("submit", function (event) {
        event.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const loginError = document.getElementById("loginError");

        // Clear previous error messages
        if (loginError) loginError.textContent = "";

        // Show loading state
        const submitButton = this.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = "Logging in...";

        // Use Firebase authentication directly without server check
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // User signed in successfully
                const user = userCredential.user;
                console.log("User logged in:", user);
                // Redirect to dashboard or home page
                window.location.href = "dashboard.html";
            })
            .catch((error) => {
                // Handle errors
                const errorMessage = error.message;
                console.error("Login error:", errorMessage);

                if (loginError) {
                    loginError.textContent = "Invalid email or password";
                } else {
                    alert("Login failed: Invalid email or password");
                }

                // Reset button state
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            });
    });
})();
