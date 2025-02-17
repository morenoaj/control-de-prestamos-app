"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebaseConfig";
import { collection, addDoc, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import Menu from "@/components/menu";
import { toast } from "react-hot-toast";

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
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [prestamoId, setPrestamoId] = useState<string>("");
  const [montoCapital, setMontoCapital] = useState<string>("");
  const [montoInteres, setMontoInteres] = useState<string>("");
  const [fechaPago, setFechaPago] = useState<string>("");
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    obtenerDatos();
  }, [obtenerDatos]);

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

  return (
    <div className="container mx-auto p-6">
      <Menu />

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
              <Input value={montoCapital} onChange={(e) => setMontoCapital(e.target.value)} className="mb-4" />

              <Label>Monto al Interés</Label>
              <Input value={montoInteres} onChange={(e) => setMontoInteres(e.target.value)} className="mb-4" />

              <Label>Fecha del Pago</Label>
              <Input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className="mb-4" />

              <Button onClick={registrarPago}>Registrar Pago</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
