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
import { Input } from "@/components/ui/input";
import { Menu, X } from "lucide-react"; 
import Link from "next/link";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Cliente {
  id: string;
  nombre: string;
}

interface Prestamo {
  id: string;
  saldoCapital?: number;
  interesesAcumulados?: number;
  fechaInicio?: string;
  metodoPago?: string;
  clienteId: string;
}

export default function ReportesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [rol, setRol] = useState<string | null>(null);
  const [pagina] = useState(1);
  const prestamosPorPagina = 10;
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
          cargarDatos();
        }
      }
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, [router]);

  const cargarDatos = useCallback(async () => {
    try {
      console.log("🔄 Cargando datos de reportes...");
      const [clientesSnapshot, prestamosSnapshot] = await Promise.all([
        getDocs(collection(db, "clientes")),
        getDocs(collection(db, "prestamos")),
      ]);

      setClientes(clientesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Cliente)));
      setPrestamos(prestamosSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Prestamo)));
      setLoading(false);
    } catch (error) {
      toast.error("Error al obtener los datos.");
      console.error(error);
    }
  }, []);

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(prestamos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reportes");
    XLSX.writeFile(wb, "reportes_prestamos.xlsx");
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte de Préstamos", 20, 10);
    autoTable(doc, { html: "#tablaReportes" });
    doc.save("reportes_prestamos.pdf");
  };

  const prestamosFiltrados = prestamos.filter((p) => {
    const cliente = clientes.find((c) => c.id === p.clienteId);
    return cliente && cliente.nombre.toLowerCase().includes(busquedaCliente);
  });

  const prestamosPaginados = prestamosFiltrados.slice((pagina - 1) * prestamosPorPagina, pagina * prestamosPorPagina);

  // 🔥 Bloquear renderización hasta que se verifique la autenticación
  if (!authChecked) return null;

  // 🔥 Si el usuario no tiene permisos, ya habrá sido redirigido
  if (!rol) return null;

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Menú responsive */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center md:hidden">
        <span className="text-lg font-semibold">Reportes</span>
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
        <span className="text-lg font-semibold">Gestión de Pagos</span>
        <div className="flex space-x-4">
        <Link href="/" className="py-2 px-4 hover:bg-gray-700 rounded">Inicio</Link>
          <Link href="/clientes" className="py-2 px-4 hover:bg-gray-700 rounded">Clientes</Link>
          <Link href="/pagos" className="py-2 px-4 hover:bg-gray-700 rounded">Pagos</Link>
          <Link href="/reportes" className="py-2 px-4 hover:bg-gray-700 rounded">Reportes</Link>
        </div>
      </div>

      {/* Reporte de Préstamos */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Reporte de Préstamos</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Buscar Cliente"
            value={busquedaCliente}
            onChange={(e) => setBusquedaCliente(e.target.value.toLowerCase())}
          />
          <div className="mt-4 flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
            <button onClick={exportarExcel} className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
              Exportar a Excel
            </button>
            <button onClick={exportarPDF} className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600">
              Exportar a PDF
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Préstamos */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Préstamos Activos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center">Cargando datos...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table id="tablaReportes">
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Saldo Capital</TableHead>
                    <TableHead>Intereses Acumulados</TableHead>
                    <TableHead>Fecha de Inicio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prestamosPaginados.map((prestamo) => {
                    const cliente = clientes.find((c) => c.id === prestamo.clienteId);
                    return (
                      <TableRow key={prestamo.id}>
                        <TableCell>{cliente ? cliente.nombre : "Desconocido"}</TableCell>
                        <TableCell>${(prestamo.saldoCapital ?? 0).toFixed(2)}</TableCell>
                        <TableCell>${(prestamo.interesesAcumulados ?? 0).toFixed(2)}</TableCell>
                        <TableCell>{prestamo.fechaInicio || "Sin fecha"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
