import { auth } from './firebase-config.js';

const emailInput = document.getElementById("signin-email");
const passwordInput = document.getElementById("signin-password");
const errorText = document.getElementById("signinError");

document.getElementById("signinBtn").addEventListener("click", async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  errorText.textContent = ""; // Clear any previous errors

  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    window.location.href = "dashboard.html";
  } catch (error) {
    errorText.textContent = "Invalid email or password. Please try again.";
  }
});

// Google Sign In
document.getElementById("googleLoginBtn").addEventListener("click", () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  
  firebase
  .auth()
  .signInWithPopup(provider)
  .then((result) => {
    console.log("Google sign-in successful:", result.user);
    window.location.href = "dashboard.html";
  })
  .catch((error) => {
    console.error("Google sign-in error:", error.message);
    alert(error.message);
  });
});

// Clear error when user types again
emailInput.addEventListener("input", () => errorText.textContent = "");
passwordInput.addEventListener("input", () => errorText.textContent = "");