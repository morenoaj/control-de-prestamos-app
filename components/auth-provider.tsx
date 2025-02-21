"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { sincronizarUsuarioEnFirestore } from "@/lib/auth";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        console.log("⚠️ No hay usuario autenticado, redirigiendo a login...");
        router.replace("/login");
      } else {
        await sincronizarUsuarioEnFirestore(); // 🔹 Ahora se asegura de registrar al usuario en Firestore
      }
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, [router]);

  // 🔥 Bloquea la renderización hasta que se verifique la autenticación
  if (!authChecked) return null;

  return <>{children}</>;
}
