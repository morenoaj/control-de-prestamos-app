"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebaseConfig";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
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

// Interfaces
interface Cliente {
  id: string;
  nombre: string;
}

interface Prestamo {
  id: string;
  monto: number;
  saldoCapital?: number;
  interesesAcumulados?: number;
  fechaInicio?: string;
  metodoPago?: string;
  clienteId: string;
}

interface Pago {
  id: string;
  prestamoId: string;
  montoCapital: number;
  montoInteres: number;
  fechaPago: string;
  createdAt: any;
}

// Función para parsear una fecha en formato "YYYY-MM-DD" a Date en horario local
const parseDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split("-");
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
};

// Función para contar quincenas (días 15 y 30, o el último día en febrero)
// entre startDate (exclusivo) y endDate (inclusivo)
const countQuincenasDesde = (startDate: Date, endDate: Date): number => {
  let count = 0;
  let d = new Date(startDate.getTime());
  d.setDate(d.getDate() + 1);
  while (d <= endDate) {
    const day = d.getDate();
    const month = d.getMonth();
    const year = d.getFullYear();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    if (day === 15 || day === (month === 1 ? lastDayOfMonth : 30)) {
      count++;
    }
    d.setDate(d.getDate() + 1);
  }
  return count;
};

// Función que, dado un préstamo, consulta sus pagos y recalcula el saldo y los intereses.
const calcularValoresPrestamo = async (prestamo: Prestamo): Promise<Prestamo> => {
  if (!prestamo.fechaInicio) return prestamo;
  // Consultar pagos del préstamo
  const pagosQuery = query(
    collection(db, "pagos"),
    where("prestamoId", "==", prestamo.id),
    orderBy("fechaPago", "desc")
  );
  const pagosSnapshot = await getDocs(pagosQuery);
  let totalCapitalPagado = 0;
  // Se usa la fecha de inicio del préstamo (parseada) como punto de partida
  let lastInterestPaymentDate = parseDate(prestamo.fechaInicio);
  pagosSnapshot.docs.forEach((doc) => {
    const pagoData = doc.data();
    totalCapitalPagado += pagoData.montoCapital || 0;
    if (pagoData.montoInteres > 0 && parseDate(pagoData.fechaPago) > lastInterestPaymentDate) {
      lastInterestPaymentDate = parseDate(pagoData.fechaPago);
    }
  });
  const saldoCapital = prestamo.monto - totalCapitalPagado;
  const quincenasPendientes = countQuincenasDesde(lastInterestPaymentDate, new Date());
  const interesesAcumulados = quincenasPendientes * (saldoCapital * 0.15);
  return { ...prestamo, saldoCapital, interesesAcumulados };
};

export default function ReportesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [rol, setRol] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
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
      const clientesData = clientesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Cliente));
      setClientes(clientesData);
      // Convertir y recalcular cada préstamo dinámicamente
      const prestamosConValores = await Promise.all(
        prestamosSnapshot.docs.map(async (doc) => {
          const prestamo = { id: doc.id, ...doc.data() } as Prestamo;
          return await calcularValoresPrestamo(prestamo);
        })
      );
      setPrestamos(prestamosConValores);
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

  // Cálculos para el resumen
  const totalPrestamos = prestamosFiltrados.length;
  const totalSaldoCapital = prestamosFiltrados.reduce((sum, p) => sum + (p.saldoCapital || 0), 0);
  const totalIntereses = prestamosFiltrados.reduce((sum, p) => sum + (p.interesesAcumulados || 0), 0);

  const prestamosPaginados = prestamosFiltrados.slice((pagina - 1) * prestamosPorPagina, pagina * prestamosPorPagina);

  // Funciones de paginación
  const totalPaginas = Math.ceil(prestamosFiltrados.length / prestamosPorPagina);
  const paginaAnterior = () => {
    if (pagina > 1) setPagina(pagina - 1);
  };
  const paginaSiguiente = () => {
    if (pagina < totalPaginas) setPagina(pagina + 1);
  };

  // Bloquear renderización hasta que se verifique la autenticación
  if (!authChecked) return null;
  if (!rol) return null;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
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
        <span className="text-lg font-semibold">Gestión de Reportes</span>
        <div className="flex space-x-4">
          <Link href="/" className="py-2 px-4 hover:bg-gray-700 rounded">Inicio</Link>
          <Link href="/clientes" className="py-2 px-4 hover:bg-gray-700 rounded">Clientes</Link>
          <Link href="/pagos" className="py-2 px-4 hover:bg-gray-700 rounded">Pagos</Link>
          <Link href="/reportes" className="py-2 px-4 hover:bg-gray-700 rounded">Reportes</Link>
        </div>
      </div>

      {/* Resumen de Reportes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-100">
          <CardContent className="text-center">
            <h3 className="text-xl font-bold">{totalPrestamos}</h3>
            <p className="text-gray-700">Préstamos Activos</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-100">
          <CardContent className="text-center">
            <h3 className="text-xl font-bold">${totalSaldoCapital.toFixed(2)}</h3>
            <p className="text-gray-700">Total Saldo Capital</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-100">
          <CardContent className="text-center">
            <h3 className="text-xl font-bold">${totalIntereses.toFixed(2)}</h3>
            <p className="text-gray-700">Total Intereses</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y Exportación */}
      <Card>
        <CardContent className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <Input
            placeholder="Buscar Cliente"
            value={busquedaCliente}
            onChange={(e) => setBusquedaCliente(e.target.value.toLowerCase())}
            className="w-full md:w-1/3"
          />
          <div className="flex space-x-2">
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
      <Card>
        <CardHeader>
          <CardTitle>Préstamos Activos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center">Cargando datos...</p>
          ) : (
            <>
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
                        <TableRow key={prestamo.id} className="hover:bg-gray-100">
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

              {/* Paginación */}
              <div className="flex justify-center items-center mt-4 space-x-4">
                <button
                  onClick={paginaAnterior}
                  disabled={pagina === 1}
                  className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
                >
                  Anterior
                </button>
                <span>
                  Página {pagina} de {totalPaginas}
                </span>
                <button
                  onClick={paginaSiguiente}
                  disabled={pagina === totalPaginas}
                  className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
