
import { auth } from "./firebase-config.js"; // Adjust path as needed

// Register button click
document.getElementById("registerBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const firstName = document.getElementById("Fname").value;

  try {
    const userCredential = await firebase
      .auth()
      .createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Update their displayName with first name
    await user.updateProfile({
      displayName: firstName,
    });

    console.log("User registered and signed in:", user);
    window.location.href = "dashboard.html";
  } catch (error) {
    console.error("Registration error:", error.message);
    alert(error.message);
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
