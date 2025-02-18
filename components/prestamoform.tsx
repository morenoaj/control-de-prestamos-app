import { useState } from "react";
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
  actualizarClientes: () => Promise<void>; // 🔥 Agrega esta línea
}

export default function PrestamoForm({ clientes, actualizarClientes }: PrestamoFormProps) {
  const [clienteId, setClienteId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [monto, setMonto] = useState("");
  const [metodoPago, setMetodoPago] = useState("");

  const registrarPrestamo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteId || !fechaInicio || !monto || !metodoPago) {
      toast.error("Todos los campos son obligatorios");
      return;
    }

    try {
      await addDoc(collection(db, "prestamos"), {
        clienteId,
        fechaInicio,
        monto: parseFloat(monto),
        metodoPago,
      });

      toast.success("Préstamo registrado correctamente");

      // Resetear los campos del formulario
      setClienteId("");
      setFechaInicio("");
      setMonto("");
      setMetodoPago("");

      // Verificar si actualizarPrestamos es una función antes de llamarla
      if (typeof actualizarClientes === "function") {
        actualizarClientes();
      } else {
        console.warn("actualizarPrestamos no fue pasado como función al componente");
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
        <form onSubmit={registrarPrestamo} className="space-y-4">
          {/* Selección del cliente */}
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

          {/* Fecha de inicio del préstamo */}
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />

          {/* Monto del préstamo */}
          <input
            type="number"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Monto"
            className="w-full p-2 border rounded"
            required
          />

          {/* Método de pago con opciones actualizadas */}
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

          {/* Botón de envío con el componente Button */}
          <Button type="submit" className="w-full">
            Registrar Préstamo
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
