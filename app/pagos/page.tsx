"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebaseConfig";
import { collection, addDoc, onSnapshot, query, where, orderBy, getDocs } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "react-hot-toast";
import { Menu } from "lucide-react"; 
import Link from "next/link";

type Cliente = {
  id: string;
  nombre: string;
};

type Prestamo = {
  id: string;
  clienteId: string;
  fechaInicio: string;
  saldoCapital: number;
  monto: number;
  interesesAcumulados?: number;
  ultimaFechaPago?: string;
};

type Pago = {
  id: string;
  prestamoId: string;
  montoCapital: number;
  montoInteres: number;
  fechaPago: string;
  createdAt: any;
};

// Función auxiliar para parsear fechas en formato "YYYY-MM-DD" o "DD-MM-YYYY" a una fecha local
const parseDate = (dateString: string): Date => {
  const parts = dateString.split("-");
  if (parts[0].length === 4) {
    // Formato ISO: "YYYY-MM-DD"
    const [year, month, day] = parts;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  // Formato "DD-MM-YYYY"
  const [day, month, year] = parts;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
};

// Función auxiliar para contar quincenas (días 15 y 30 o último día en febrero)
// que ocurren entre startDate (exclusivo) y endDate (inclusivo)
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

export default function PagosPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>("");
  const [prestamosFiltrados, setPrestamosFiltrados] = useState<Prestamo[]>([]);
  const [prestamoSeleccionado, setPrestamoSeleccionado] = useState<Prestamo | null>(null);
  const [montoCapital, setMontoCapital] = useState<string>("");
  const [montoInteres, setMontoInteres] = useState<string>("");
  const [fechaPago, setFechaPago] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pagosPrestamo, setPagosPrestamo] = useState<Pago[]>([]);

  useEffect(() => {
    const unsubscribeClientes = onSnapshot(collection(db, "clientes"), (snapshot) => {
      setClientes(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Cliente)));
    });

    const unsubscribePrestamos = onSnapshot(collection(db, "prestamos"), async (snapshot) => {
      const prestamosData = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const prestamo = { id: doc.id, ...doc.data() } as Prestamo;

          // Consultar pagos para el préstamo
          const pagosQuery = query(
            collection(db, "pagos"),
            where("prestamoId", "==", prestamo.id),
            orderBy("fechaPago", "desc")
          );
          const pagosSnapshot = await getDocs(pagosQuery);
          let totalCapitalPagado = 0;
          // Usaremos la fecha de inicio parseada como valor por defecto
          let lastInterestPaymentDate = parseDate(prestamo.fechaInicio);
          pagosSnapshot.docs.forEach((pagoDoc) => {
            const pagoData = pagoDoc.data();
            totalCapitalPagado += pagoData.montoCapital || 0;
            // Actualizar la fecha de reinicio si el pago incluye interés y es posterior
            if (pagoData.montoInteres > 0 && parseDate(pagoData.fechaPago) > lastInterestPaymentDate) {
              lastInterestPaymentDate = parseDate(pagoData.fechaPago);
            }
          });

          // Calcular saldo a capital: monto original menos lo abonado a capital
          const saldoCapitalCalculado = prestamo.monto - totalCapitalPagado;
          prestamo.saldoCapital = saldoCapitalCalculado;

          // Calcular los intereses acumulados a partir de la última fecha de reinicio
          const quincenasPendientes = countQuincenasDesde(lastInterestPaymentDate, new Date());
          const interesesPendientes = quincenasPendientes * (saldoCapitalCalculado * 0.15);
          prestamo.interesesAcumulados = parseFloat(interesesPendientes.toFixed(2));

          // Última fecha de pago (capital o interés)
          prestamo.ultimaFechaPago =
            pagosSnapshot.docs.length > 0 ? pagosSnapshot.docs[0].data().fechaPago : "N/A";

          return prestamo;
        })
      );
      setPrestamos(prestamosData);
      setLoading(false);
    });

    return () => {
      // Desuscribirse
      // (La función onSnapshot ya retorna la función de desuscripción)
    };
  }, []);

  useEffect(() => {
    if (clienteSeleccionado) {
      setPrestamosFiltrados(prestamos.filter((p) => p.clienteId === clienteSeleccionado));
    } else {
      setPrestamosFiltrados([]);
    }
  }, [clienteSeleccionado, prestamos]);

  // Suscribirse a los pagos del préstamo seleccionado para mostrarlos en el modal
  useEffect(() => {
    if (!prestamoSeleccionado) {
      setPagosPrestamo([]);
      return;
    }
    const pagosQuery = query(
      collection(db, "pagos"),
      where("prestamoId", "==", prestamoSeleccionado.id),
      orderBy("fechaPago", "desc")
    );
    const unsubscribePagos = onSnapshot(pagosQuery, (snapshot) => {
      const pagosData = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Pago)
      );
      setPagosPrestamo(pagosData);
    });
    return () => unsubscribePagos();
  }, [prestamoSeleccionado]);

  // Función para registrar el pago
  const registrarPago = async () => {
    if (!prestamoSeleccionado) return;
    try {
      // Convertir la fecha a formato ISO ("YYYY-MM-DD")
      const fechaPagoISO = new Date(fechaPago).toISOString().split("T")[0];
      await addDoc(collection(db, "pagos"), {
        prestamoId: prestamoSeleccionado.id,
        montoCapital: parseFloat(montoCapital) || 0,
        montoInteres: parseFloat(montoInteres) || 0,
        fechaPago: fechaPagoISO,
        createdAt: new Date()
      });
      toast.success("Pago registrado correctamente");
      // Reiniciar campos y ocultar modal
      setMontoCapital("");
      setMontoInteres("");
      setFechaPago("");
      setPrestamoSeleccionado(null);
      setModalOpen(false);
    } catch (error) {
      toast.error("Error al registrar el pago");
      console.error(error);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Menú hamburguesa en móviles */}
      {menuOpen && (
        <div className="bg-gray-800 text-white flex flex-col p-4 space-y-2 md:hidden">
          <Link href="/" className="py-2 px-4 hover:bg-gray-700 rounded">
            Inicio
          </Link>
          <Link href="/clientes" className="py-2 px-4 hover:bg-gray-700 rounded">
            Clientes
          </Link>
          <Link href="/pagos" className="py-2 px-4 hover:bg-gray-700 rounded">
            Pagos
          </Link>
          <Link href="/reportes" className="py-2 px-4 hover:bg-gray-700 rounded">
            Reportes
          </Link>
        </div>
      )}

      {/* Menú visible en escritorio */}
      <div className="hidden md:flex justify-between bg-gray-800 text-white p-4 rounded-lg">
        <span className="text-lg font-semibold">Gestión de Pagos</span>
        <div className="flex space-x-4">
          <Link href="/" className="py-2 px-4 hover:bg-gray-700 rounded">
            Inicio
          </Link>
          <Link href="/clientes" className="py-2 px-4 hover:bg-gray-700 rounded">
            Clientes
          </Link>
          <Link href="/pagos" className="py-2 px-4 hover:bg-gray-700 rounded">
            Pagos
          </Link>
          <Link href="/reportes" className="py-2 px-4 hover:bg-gray-700 rounded">
            Reportes
          </Link>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Registro de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
  <Label>Cliente</Label>
  <Select onValueChange={setClienteSeleccionado}>
    <SelectTrigger>{clienteSeleccionado || "Selecciona un cliente"}</SelectTrigger>
    <SelectContent>
      {clientes.map((cliente) => (
        <SelectItem key={cliente.id} value={cliente.id}>
          {cliente.nombre}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>

  {/* Sección para mostrar el nombre del cliente seleccionado de forma estética */}
  {clienteSeleccionado && (
    <div className="mt-4 p-4 bg-blue-50 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-center text-blue-800">
        Cliente Seleccionado: {clientes.find(c => c.id === clienteSeleccionado)?.nombre}
      </h2>
    </div>
  )}

  {prestamosFiltrados.length > 0 && (
    <table className="w-full border-collapse border border-gray-300 mt-4">
      <thead>
        <tr className="bg-gray-200">
          <th className="border p-2">Monto</th>
          <th className="border p-2">Saldo Capital</th>
          <th className="border p-2">Interés Acumulado</th>
          <th className="border p-2">Fecha de Inicio</th>
          <th className="border p-2">Último Pago</th>
          <th className="border p-2">Acción</th>
        </tr>
      </thead>
      <tbody>
        {prestamosFiltrados.map((prestamo) => (
          <tr key={prestamo.id} className="text-center">
            <td className="border p-2">{Number(prestamo.monto).toFixed(2)}</td>
            <td className="border p-2">{Number(prestamo.saldoCapital).toFixed(2)}</td>
            <td className="border p-2">{prestamo.interesesAcumulados?.toFixed(2)}</td>
            <td className="border p-2">{prestamo.fechaInicio}</td>
            <td className="border p-2">{prestamo.ultimaFechaPago}</td>
            <td className="border p-2">
              <Button
                onClick={() => {
                  setPrestamoSeleccionado(prestamo);
                  setModalOpen(true);
                }}
              >
                Seleccionar
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )}
</CardContent>

      </Card>

      {/* Modal para registrar el pago y ver detalles */}
      {modalOpen && prestamoSeleccionado && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <CardHeader>
              <CardTitle>Registrar Pago para el Préstamo</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Tabla con detalles de los pagos realizados */}
              {pagosPrestamo.length > 0 ? (
                <table className="w-full border-collapse border border-gray-300 mb-4">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border p-2">Capital</th>
                      <th className="border p-2">Interés</th>
                      <th className="border p-2">Fecha de Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagosPrestamo.map((pago) => (
                      <tr key={pago.id} className="text-center">
                        <td className="border p-2">
                          {Number(pago.montoCapital).toFixed(2)}
                        </td>
                        <td className="border p-2">
                          {Number(pago.montoInteres).toFixed(2)}
                        </td>
                        <td className="border p-2">{pago.fechaPago}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="mb-4">
                  No hay pagos registrados para este préstamo.
                </p>
              )}
              <div className="mb-4">
                <Label className="block">Pago a Capital</Label>
                <Input
                  type="number"
                  placeholder="Monto a capital"
                  value={montoCapital}
                  onChange={(e) => setMontoCapital(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <Label className="block">Pago a Interés</Label>
                <Input
                  type="number"
                  placeholder="Monto a interés"
                  value={montoInteres}
                  onChange={(e) => setMontoInteres(e.target.value)}
                />
              </div>
              <div className="mb-4">
                <Label className="block">Fecha de Pago</Label>
                <Input
                  type="date"
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button onClick={registrarPago}>Registrar Pago</Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setModalOpen(false);
                    setPrestamoSeleccionado(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </div>
        </div>
      )}
    </div>
  );
}
