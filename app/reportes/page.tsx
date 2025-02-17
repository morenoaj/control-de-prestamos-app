/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import Menu from "@/components/menu";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// 🚀 Se eliminaron las importaciones de recharts que estaban generando errores

interface Cliente {
  id: string;
  nombre: string;
}

interface Prestamo {
  id: string;
  saldoCapital: number;
  interesesAcumulados: number;
  fechaInicio: string;
  metodoPago: string;
  clienteId: string;
}

export default function ReportesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(1); // 🔥 Se mantiene porque se usa en la paginación
  const prestamosPorPagina = 10;

  const obtenerDatos = useCallback(async () => {
    try {
      const [clientesSnapshot, prestamosSnapshot] = await Promise.all([
        getDocs(collection(db, "clientes")),
        getDocs(collection(db, "prestamos"))
      ]);

      const clientesData = clientesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Cliente));
      setClientes(clientesData);
      setPrestamos(prestamosSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Prestamo)));

      setLoading(false);
    } catch (error) {
      toast.error("Error al obtener los datos.");
      console.error(error);
    }
  }, []);

  useEffect(() => {
    obtenerDatos();
  }, [obtenerDatos]);

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

  return (
    <div className="container mx-auto p-6">
      <Menu />

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
          <button onClick={exportarExcel} className="btn btn-primary mt-4">Exportar a Excel</button>
          <button onClick={exportarPDF} className="btn btn-secondary mt-4 ml-2">Exportar a PDF</button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Préstamos Activos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center">Cargando datos...</p>
          ) : (
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

                  // Asegurar valores numéricos antes de llamar a .toFixed(2)
                  const saldoCapital = typeof prestamo.saldoCapital === "number" ? prestamo.saldoCapital.toFixed(2) : "0.00";
                  const interesesAcumulados = typeof prestamo.interesesAcumulados === "number" ? prestamo.interesesAcumulados.toFixed(2) : "0.00";

                  return (
                    <TableRow key={prestamo.id}>
                      <TableCell>{cliente ? cliente.nombre : "Desconocido"}</TableCell>
                      <TableCell>${saldoCapital}</TableCell>
                      <TableCell>${interesesAcumulados}</TableCell>
                      <TableCell>{prestamo.fechaInicio}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
