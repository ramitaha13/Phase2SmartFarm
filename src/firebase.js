// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD-nSB8KuxVutklkljZgLtfXS2T8EtJUys",
  authDomain: "phase2-e70b5.firebaseapp.com",
  projectId: "phase2-e70b5",
  storageBucket: "phase2-e70b5.firebasestorage.app",
  messagingSenderId: "341710251415",
  appId: "1:341710251415:web:f496d58624d3d6f56a50d2",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
