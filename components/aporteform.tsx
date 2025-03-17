"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebaseConfig";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { toast } from "react-hot-toast";

interface AporteFormProps {
  actualizarAportes: () => void;
}

export default function AporteForm({ actualizarAportes }: AporteFormProps) {
  const [inversionistas, setInversionistas] = useState<{ id: string; nombre: string }[]>([]);
  const [inversionistaId, setInversionistaId] = useState("");
  const [monto, setMonto] = useState<number | "">("");
  const [interes, setInteres] = useState<number | "">("");
  const [fecha, setFecha] = useState<string>("");

  useEffect(() => {
    const cargarInversionistas = async () => {
      const snapshot = await getDocs(collection(db, "inversionistas"));
      setInversionistas(snapshot.docs.map((doc) => ({ id: doc.id, nombre: doc.data().nombre })));
    };
    cargarInversionistas();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inversionistaId || !monto || !interes || !fecha) {
      toast.error("Todos los campos son obligatorios");
      return;
    }

    try {
      await addDoc(collection(db, "aportes"), {
        inversionistaId,
        monto: Number(monto),
        interes: Number(interes),
        fecha,
      });
      toast.success("Aporte registrado exitosamente");
      setMonto("");
      setInteres("");
      setFecha("");
      actualizarAportes();
    } catch (error) {
      console.error("Error al registrar el aporte:", error);
      toast.error("Error al registrar el aporte");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded-lg shadow-lg">
      <h2 className="text-lg font-semibold text-blue-600">Registrar Aporte</h2>
      <div>
        <label className="block text-sm font-medium">Inversionista</label>
        <select
          value={inversionistaId}
          onChange={(e) => setInversionistaId(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">Seleccione un inversionista</option>
          {inversionistas.map((inv) => (
            <option key={inv.id} value={inv.id}>
              {inv.nombre}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium">Monto ($)</label>
        <input type="number" value={monto} onChange={(e) => setMonto(Number(e.target.value))} className="w-full p-2 border rounded" />
      </div>
      <div>
        <label className="block text-sm font-medium">Interés (%)</label>
        <input type="number" value={interes} onChange={(e) => setInteres(Number(e.target.value))} className="w-full p-2 border rounded" />
      </div>
      <div>
        <label className="block text-sm font-medium">Fecha del Aporte</label>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full p-2 border rounded" />
      </div>
      <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded">
        Registrar Aporte
      </button>
    </form>
  );
}
