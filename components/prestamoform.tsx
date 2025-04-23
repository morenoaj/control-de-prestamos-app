
"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

interface Cliente {
  id: string;
  nombre: string;
}

interface PrestamoFormProps {
  clientes: Cliente[];
  actualizarClientes?: () => Promise<void>;
}

export default function PrestamoForm({ clientes, actualizarClientes }: PrestamoFormProps) {
  const [clienteId, setClienteId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [monto, setMonto] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [errorVisible, setErrorVisible] = useState<string | null>(null);
  const [saldoCartera, setSaldoCartera] = useState<number | null>(null);

  const obtenerSaldoCartera = async () => {
    try {
      const res = await fetch('/api/cartera');
      const data = await res.json();
      setSaldoCartera(data.totalDisponible ?? 0);
    } catch (error) {
      console.error("Error al obtener el saldo de la cartera:", error);
    }
  };

  useEffect(() => {
    obtenerSaldoCartera();
  }, []);

  const registrarPrestamo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteId || !fechaInicio || !monto || !metodoPago) {
      toast.error("Todos los campos son obligatorios");
      return;
    }

    try {
      const resCartera = await fetch('/api/cartera');
      const cartera = await resCartera.json();
      console.log("💰 Cartera disponible:", cartera.totalDisponible);

      if (Number(cartera.totalDisponible) < parseFloat(monto)) {
        const mensaje = "Fondos insuficientes en la cartera para realizar el préstamo";
        setErrorVisible(mensaje);
        toast.error(mensaje);
        return;
      }

      setErrorVisible(null);
    } catch (error) {
      const mensaje = "No se pudo validar la cartera";
      setErrorVisible(mensaje);
      toast.error(mensaje);
      console.error("Error al verificar cartera:", error);
      return;
    }

    try {
      const res = await fetch('/api/prestamos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId,
          fechaInicio,
          monto,
          metodoPago
        })
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Error en el préstamo');
        return;
      }

      toast.success("Préstamo registrado correctamente");
      setClienteId("");
      setFechaInicio("");
      setMonto("");
      setMetodoPago("");

      await obtenerSaldoCartera();

      if (actualizarClientes) {
        actualizarClientes().catch((error) =>
          console.error("Error al actualizar clientes:", error)
        );
      }

    } catch (error) {
      toast.error("Error al registrar el préstamo");
      console.error("Error al registrar el préstamo:", error);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Registrar Préstamo</CardTitle>
      </CardHeader>
      <CardContent>
        {errorVisible && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
            {errorVisible}
          </div>
        )}

        <form onSubmit={registrarPrestamo} className="space-y-4">
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">Seleccionar Cliente</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nombre}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />

          <input
            type="number"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Monto"
            className="w-full p-2 border rounded"
            required
          />

          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value)}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">Seleccionar Método de Pago</option>
            <option value="Banco Nacional">Banco Nacional</option>
            <option value="Yappy">Yappy</option>
            <option value="Efectivo">Efectivo</option>
          </select>

          <Button type="submit" className="w-full">
            Registrar Préstamo
          </Button>
        </form>

        {saldoCartera !== null && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded text-blue-800 text-sm">
            💼 <strong>Saldo actual en cartera:</strong> ${saldoCartera.toFixed(2)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
