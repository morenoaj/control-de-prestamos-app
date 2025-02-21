"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebaseConfig";
import { collection, addDoc, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { obtenerRolDeUsuario } from "@/lib/auth";
import { auth } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "react-hot-toast";
import { Menu, X } from "lucide-react"; 
import Link from "next/link";

interface Cliente {
  id: string;
  nombre: string;
}

interface Prestamo {
  id: string;
  clienteId: string;
  fechaInicio: string;
  saldoCapital: number;
  interesesAcumulados?: number;
}

interface Pago {
  prestamoId: string;
  montoCapital: number;
  montoInteres: number;
  fechaPago: string;
}

// Función para calcular intereses acumulados
const calcularInteresesAcumulados = (fechaInicio: string, saldoCapital: number): number => {
  const fechaActual = new Date();
  const inicio = new Date(fechaInicio);
  let interesesAcumulados = 0;

  while (inicio <= fechaActual) {
    const dia = inicio.getDate();
    const mes = inicio.getMonth();
    const anio = inicio.getFullYear();
    const ultimoDiaMes = new Date(anio, mes + 1, 0).getDate();

    if (dia === 15 || dia === (mes === 1 ? ultimoDiaMes : 30)) {
      interesesAcumulados += saldoCapital * 0.15;
    }
    inicio.setDate(inicio.getDate() + 1);
  }

  return interesesAcumulados;
};

export default function PagosPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [prestamoId, setPrestamoId] = useState<string>("");
  const [montoCapital, setMontoCapital] = useState<string>("");
  const [montoInteres, setMontoInteres] = useState<string>("");
  const [fechaPago, setFechaPago] = useState<string>("");
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
          obtenerDatos();
        }
      }
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, [router]);

  const obtenerDatos = useCallback(() => {
    const unsubscribeClientes = onSnapshot(collection(db, "clientes"), (snapshot) => {
      setClientes(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Cliente)));
    });

    const unsubscribePrestamos = onSnapshot(collection(db, "prestamos"), (snapshot) => {
      setPrestamos(
        snapshot.docs.map((doc) => {
          const prestamo = { id: doc.id, ...doc.data() } as Prestamo;
          prestamo.interesesAcumulados = calcularInteresesAcumulados(prestamo.fechaInicio, prestamo.saldoCapital);
          return prestamo;
        })
      );
      setLoading(false);
    });

    return () => {
      unsubscribeClientes();
      unsubscribePrestamos();
    };
  }, []);

  const registrarPago = async () => {
    if (!prestamoId || !fechaPago) {
      toast.error("Debe seleccionar un préstamo y una fecha.");
      return;
    }

    try {
      const prestamoRef = doc(db, "prestamos", prestamoId);
      const prestamo = prestamos.find((p) => p.id === prestamoId);

      if (!prestamo) {
        toast.error("Error: No se encontró el préstamo.");
        return;
      }

      const nuevoSaldoCapital = prestamo.saldoCapital - (parseFloat(montoCapital) || 0);
      const nuevoInteresesAcumulados = (prestamo.interesesAcumulados || 0) - (parseFloat(montoInteres) || 0);

      await updateDoc(prestamoRef, {
        saldoCapital: nuevoSaldoCapital >= 0 ? nuevoSaldoCapital : 0,
        interesesAcumulados: nuevoInteresesAcumulados >= 0 ? nuevoInteresesAcumulados : 0,
      });

      await addDoc(collection(db, "pagos"), {
        prestamoId,
        montoCapital: parseFloat(montoCapital) || 0,
        montoInteres: parseFloat(montoInteres) || 0,
        fechaPago,
      } as Pago);

      setPrestamoId("");
      setMontoCapital("");
      setMontoInteres("");
      setFechaPago("");

      toast.success("Pago registrado exitosamente.");
    } catch (error) {
      console.error("Error al registrar el pago:", error);
      toast.error("Error al registrar el pago.");
    }
  };

  // 🔥 Bloquear renderización hasta que se verifique la autenticación
  if (!authChecked) return null;

  // 🔥 Si el usuario no tiene permisos, ya habrá sido redirigido
  if (!rol) return null;

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Menú responsive */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center md:hidden">
        <span className="text-lg font-semibold">Gestión de Pagos</span>
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

      {/* Formulario de registro de pagos */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Registro de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center">Cargando datos...</p>
          ) : (
            <div className="flex flex-col gap-4">
              <Label>Préstamo</Label>
              <Select onValueChange={setPrestamoId}>
                <SelectTrigger>{prestamoId || "Selecciona un préstamo"}</SelectTrigger>
                <SelectContent>
                  {prestamos.map((prestamo) => (
                    <SelectItem key={prestamo.id} value={prestamo.id}>
                      {clientes.find((c) => c.id === prestamo.clienteId)?.nombre || "Desconocido"} - Saldo: {prestamo.saldoCapital}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Label>Monto al Capital</Label>
              <Input value={montoCapital} onChange={(e) => setMontoCapital(e.target.value)} />

              <Label>Monto al Interés</Label>
              <Input value={montoInteres} onChange={(e) => setMontoInteres(e.target.value)} />

              <Label>Fecha del Pago</Label>
              <Input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} />

              <Button onClick={registrarPago}>Registrar Pago</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
