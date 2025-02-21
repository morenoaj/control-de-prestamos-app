import { auth, db } from "@/lib/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

/**
 * 🔹 Sincroniza los usuarios de Firebase Authentication con Firestore.
 * 🔹 Si el usuario no está en Firestore, lo registra con el rol "Usuario".
 */
export const sincronizarUsuarioEnFirestore = async () => {
  return new Promise<void>((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log(`🔍 Verificando usuario en Firestore: ${user.uid}`);

        const usuarioRef = doc(db, "usuarios", user.uid);
        const usuarioSnap = await getDoc(usuarioRef);

        if (!usuarioSnap.exists()) {
          console.log("🆕 Usuario no encontrado en Firestore, registrándolo...");

          await setDoc(usuarioRef, {
            id: user.uid,
            nombre: user.displayName || "Usuario sin nombre",
            email: user.email,
            rol: "Usuario", // 🔹 Asigna el rol predeterminado
            fechaCreacion: new Date().toISOString(),
          });

          console.log("✅ Usuario registrado en Firestore con rol Usuario.");
        } else {
          console.log("🔍 Usuario ya registrado en Firestore.");
        }
        resolve();
      } else {
        console.log("⚠️ No hay usuario autenticado.");
        resolve();
      }
    });
  });
};

/**
 * 🔹 Obtiene el rol del usuario desde Firestore.
 */
export const obtenerRolDeUsuario = async (): Promise<string | null> => {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log(`🔍 Buscando rol para UID: ${user.uid}`);
        const usuarioRef = doc(db, "usuarios", user.uid);
        const usuarioSnap = await getDoc(usuarioRef);

        if (usuarioSnap.exists()) {
          const datos = usuarioSnap.data();
          console.log(`✅ Rol encontrado: ${datos.rol}`);
          resolve(datos.rol);
        } else {
          console.log("❌ No se encontró el usuario en Firestore.");
          resolve(null);
        }
      } else {
        console.log("⚠️ No hay usuario autenticado.");
        resolve(null);
      }
    });
  });
};
