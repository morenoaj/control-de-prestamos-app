import { useState } from "react";
import { db } from "@/lib/firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "react-hot-toast";

export default function ClienteForm({ actualizarClientes }: { actualizarClientes: () => void }) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState("");

  const formatTelefono = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    return numericValue.length > 4 ? `${numericValue.slice(0, 4)}-${numericValue.slice(4, 8)}` : numericValue;
  };

  const registrarCliente = async () => {
    setError("");

    if (!nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    if (!telefono.match(/^\d{4}-\d{4}$/)) {
      setError("El teléfono debe tener el formato 0000-0000");
      return;
    }

    try {
      await addDoc(collection(db, "clientes"), { nombre, telefono });
      setNombre("");
      setTelefono("");
      toast.success("Cliente registrado");
      actualizarClientes();
    } catch (error) {
      console.error("Error:", error);
      toast.error("No se pudo registrar el cliente");
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Registro de Clientes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <Input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          <Input placeholder="Teléfono (0000-0000)" value={telefono} onChange={(e) => setTelefono(formatTelefono(e.target.value))} required />
          {error && <p className="text-red-500">{error}</p>}
          <Button onClick={registrarCliente}>Registrar Cliente</Button>
        </div>
      </CardContent>
    </Card>
  );
}
