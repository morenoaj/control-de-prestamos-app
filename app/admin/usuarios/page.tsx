"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebaseConfig";
import { collection, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { obtenerRolDeUsuario as obtenerRolUsuario } from "@/lib/auth";
import { auth } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "react-hot-toast";
import { Menu, X } from "lucide-react"; 
import Link from "next/link";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: "Admin" | "Gestor" | "Usuario";
}

export default function UsuariosPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [rol, setRol] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const verificarAutenticacion = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        console.log("⚠️ No hay usuario autenticado, redirigiendo a login...");
        router.replace("/login");
      } else {
        console.log(`✅ Usuario autenticado: ${firebaseUser.uid}`);
        const userRol = await obtenerRolUsuario();
        if (userRol !== "Admin") {
          console.log("🚫 Usuario no autorizado, redirigiendo a inicio...");
          router.replace("/");
        } else {
          setRol(userRol);
          cargarUsuarios();
        }
      }
      setAuthChecked(true);
    });

    return () => verificarAutenticacion();
  }, [router]);

  const cargarUsuarios = async () => {
    try {
      console.log("🔄 Cargando usuarios desde Firestore...");
      const snapshot = await getDocs(collection(db, "usuarios"));
      const usuariosLista = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Usuario));

      if (usuariosLista.length === 0) {
        console.log("⚠️ No se encontraron usuarios en Firestore.");
      } else {
        console.log("✅ Usuarios cargados:", usuariosLista);
      }

      setUsuarios(usuariosLista);
    } catch (error) {
      console.error("🚨 Error al cargar usuarios:", error);
      toast.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  const cambiarRol = async (id: string, nuevoRol: "Admin" | "Gestor" | "Usuario") => {
    try {
      await updateDoc(doc(db, "usuarios", id), { rol: nuevoRol });
      toast.success("Rol actualizado correctamente");
      cargarUsuarios();
    } catch (error) {
      console.error(error);
      toast.error("Error al actualizar el rol");
    }
  };

  const eliminarUsuario = async (id: string) => {
    try {
      await deleteDoc(doc(db, "usuarios", id));
      toast.success("Usuario eliminado correctamente");
      setUsuarios(usuarios.filter((user) => user.id !== id));
    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar usuario");
    }
  };

  // 🔥 Bloqueo total: No mostrar nada hasta verificar la autenticación
  if (!authChecked) {
    return <div className="w-screen h-screen flex items-center justify-center"><p>Cargando...</p></div>;
  }

  if (!rol) return null; // Si no tiene rol, no mostrar la interfaz

  return (
    <div className="container mx-auto p-6">
      {/* Menú responsive */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center md:hidden">
        <span className="text-lg font-semibold">Gestión de Usuarios</span>
        <button onClick={() => setMenuOpen(!menuOpen)} className="focus:outline-none">
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Menú hamburguesa en móviles */}
      {menuOpen && (
        <div className="bg-gray-800 text-white flex flex-col p-4 space-y-2 md:hidden">
          <Link href="/" className="py-2 px-4 hover:bg-gray-700 rounded">Inicio</Link>
          <Link href="/clientes" className="py-2 px-4 hover:bg-gray-700 rounded">Clientes</Link>
          <Link href="/pagos" className="py-2 px-4 hover:bg-gray-700 rounded">Pagos</Link>
          <Link href="/reportes" className="py-2 px-4 hover:bg-gray-700 rounded">Reportes</Link>
        </div>
      )}

      {/* Menú en escritorio */}
      <div className="hidden md:flex justify-between bg-gray-800 text-white p-4 rounded-lg">
        <span className="text-lg font-semibold">Gestión de Usuarios</span>
        <div className="flex space-x-4">
          <Link href="/" className="py-2 px-4 hover:bg-gray-700 rounded">Inicio</Link>
          <Link href="/clientes" className="py-2 px-4 hover:bg-gray-700 rounded">Clientes</Link>
          <Link href="/pagos" className="py-2 px-4 hover:bg-gray-700 rounded">Pagos</Link>
          <Link href="/reportes" className="py-2 px-4 hover:bg-gray-700 rounded">Reportes</Link>
        </div>
      </div>

      {/* Contenido principal */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Gestión de Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center">Cargando usuarios...</p>
          ) : usuarios.length === 0 ? (
            <p className="text-center">No hay usuarios registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell>{usuario.nombre}</TableCell>
                    <TableCell>{usuario.email}</TableCell>
                    <TableCell>
                      <Select onValueChange={(valor) => cambiarRol(usuario.id, valor as "Admin" | "Gestor")} defaultValue={usuario.rol}>
                        <SelectTrigger>{usuario.rol}</SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Gestor">Gestor</SelectItem>
                          <SelectItem value="Usuario">Usuario</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button variant="destructive" onClick={() => eliminarUsuario(usuario.id)}>
                        Eliminar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
