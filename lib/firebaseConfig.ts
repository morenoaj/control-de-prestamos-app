import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";


const firebaseConfig = {
  apiKey: "AIzaSyBP-5ChH9EGLkGqEWZguhheZvj9qgJ9qQw",
  authDomain: "ppersonalapp.firebaseapp.com",
  projectId: "ppersonalapp",
  storageBucket: "ppersonalapp.appspot.com",
  messagingSenderId: "607493415087",
  appId: "1:607493415087:web:dabe0c9728225c96b0345a",
  measurementId: "G-C04ERN5ZX5"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // Inicializar Firestore
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export { db };

// 🔹 Función para iniciar sesión con Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    console.log("Usuario autenticado:", result.user);
    return result.user;
  } catch (error) {
    console.error("Error en la autenticación:", error);
    throw error;
  }
};

// 🔹 Función para cerrar sesión
export const logout = async () => {
  try {
    await signOut(auth); // Cierra la sesión
    console.log("Sesión cerrada");
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  }
};