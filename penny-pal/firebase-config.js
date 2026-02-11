const firebaseConfig = {
  apiKey: "AIzaSyDSMBMsXPUITYwYkRXyrMabiCZQsyILjEM",
  authDomain: "pennypal-85c2e.firebaseapp.com",
  projectId: "pennypal-85c2e",
  storageBucket: "pennypal-85c2e.firebasestorage.app",
  messagingSenderId: "115869085872",
  appId: "1:115869085872:web:943f5b655b4459fdf68b75",
  measurementId: "G-FKDTW61QLQ",
};

// Initialize Firebase (ONLY if not already initialized)
if (firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth(); // Export auth for use in other files
export { auth };