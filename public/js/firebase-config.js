// ============================================
// Firebase Configuration - Mis Raízes
// ============================================
// INSTRUCCIONES: Reemplaza los valores de abajo con tu configuración real de Firebase.
// Encuéntralos en: Firebase Console > Configuración del proyecto > Tu app web

const firebaseConfig = {
    apiKey: "AIzaSyCVbSPjMjV7wVdIBjzMhC9tZ2G-eRn-f_E",
    authDomain: "carta-mis-raizes.firebaseapp.com",
    projectId: "carta-mis-raizes",
    storageBucket: "carta-mis-raizes.firebasestorage.app",
    messagingSenderId: "686838234637",
    appId: "1:686838234637:web:2425e3fccc79304a02df44"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Exports
const db = firebase.firestore();
const auth = firebase.auth ? firebase.auth() : null;
