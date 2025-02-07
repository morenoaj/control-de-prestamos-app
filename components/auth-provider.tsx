"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname(); // Detecta la ruta actual

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      console.log("Estado de autenticación:", authUser);
      setUser(authUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 🔥 Solución para evitar loops: Solo redirigir si el usuario no está autenticado y no está en /login
  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.replace("/login");
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return <p className="flex justify-center items-center h-screen">Cargando...</p>;
  }

  return <>{children}</>;
}
