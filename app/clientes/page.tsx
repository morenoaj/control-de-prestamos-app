"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { obtenerRolDeUsuario } from "@/lib/auth";
import { auth } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "react-hot-toast";
import ClienteForm from "@/components/clienteform";
import PrestamoForm from "@/components/prestamoform";
import { Menu, X } from "lucide-react"; // Íconos para el menú
import Link from "next/link";

interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
}

export default function ClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [rol, setRol] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        console.log("⚠️ No hay usuario autenticado, redirigiendo a login...");
        router.replace("/login");
      } else {
        console.log(`✅ Usuario autenticado: ${firebaseUser.uid}`);
        const userRol = await obtenerRolDeUsuario();
        if (userRol !== "Admin" && userRol !== "Gestor") {
          console.log("🚫 Usuario no autorizado, redirigiendo a inicio...");
          router.replace("/");
        } else {
          setRol(userRol);
          cargarClientes();
        }
      }
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, [router]);

  const cargarClientes = useCallback(async () => {
    try {
      console.log("🔄 Cargando clientes desde Firestore...");
      const snapshot = await getDocs(collection(db, "clientes"));
      setClientes(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Cliente)));
    } catch (error) {
      toast.error("Error al obtener clientes");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 🔥 Bloquear renderización hasta que se verifique la autenticación
  if (!authChecked) return null;

  // 🔥 Si el usuario no tiene permisos, ya habrá sido redirigido
  if (!rol) return null;

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Menú responsive */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center md:hidden">
        <span className="text-lg font-semibold">Gestión de Clientes</span>
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

      {/* Menú visible en escritorio */}
      <div className="hidden md:flex justify-between bg-gray-800 text-white p-4 rounded-lg">
        <span className="text-lg font-semibold">Gestión de Clientes</span>
        <div className="flex space-x-4">
          <Link href="/" className="py-2 px-4 hover:bg-gray-700 rounded">Inicio</Link>
          <Link href="/clientes" className="py-2 px-4 hover:bg-gray-700 rounded">Clientes</Link>
          <Link href="/pagos" className="py-2 px-4 hover:bg-gray-700 rounded">Pagos</Link>
          <Link href="/reportes" className="py-2 px-4 hover:bg-gray-700 rounded">Reportes</Link>
        </div>
      </div>

      {/* Formularios en Grid para responsividad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <ClienteForm actualizarClientes={cargarClientes} />
        <PrestamoForm clientes={clientes} actualizarClientes={cargarClientes} />
      </div>

      {/* Lista de Clientes */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center">Cargando...</p>
          ) : clientes.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="w-full text-sm md:text-base">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Teléfono</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell>{cliente.nombre}</TableCell>
                      <TableCell>{cliente.telefono}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center">No hay clientes registrados</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
