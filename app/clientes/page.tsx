"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import DashboardLayout from "@/components/dashboard-layout";
import ClienteForm from "@/components/clienteform";
import PrestamoForm from "@/components/prestamoform";
import ClientReport from "@/components/client-report";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem
} from "@/components/ui/select";
import * as Tabs from "@radix-ui/react-tabs";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { obtenerRolDeUsuario } from "@/lib/auth";

interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
}

export default function ClientesPage() {
  const router = useRouter();
  const path = usePathname();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [rol, setRol] = useState<string | null>(null);

  // Tabs internas
  const [selectedTab, setSelectedTab] = useState<"gestion" | "reporte">(
    "gestion"
  );
  const [selectedClient, setSelectedClient] = useState<string>("");

  // Carga clientes
  const cargarClientes = useCallback(async () => {
    const snap = await getDocs(collection(db, "clientes"));
    setClientes(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }))
    );
  }, []);

  // Auth + carga inicial
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return router.replace("/login");
      const r = await obtenerRolDeUsuario();
      if (r && !["Admin", "Gestor"].includes(r)) return router.replace("/");
      setRol(r);
      await cargarClientes();
      setAuthChecked(true);
    });
    return () => unsub();
  }, [cargarClientes, router]);

  if (!authChecked || !rol) return null;

  return (
    <DashboardLayout>
      <Tabs.Root
        defaultValue="gestion"
        onValueChange={(v) => setSelectedTab(v as any)}
        className="space-y-4"
      >
        <Tabs.List className="flex space-x-1 bg-gray-100 p-1 rounded">
          <Tabs.Trigger
            value="gestion"
            className={`px-4 py-2 rounded ${
              selectedTab === "gestion" ? "bg-white shadow" : ""
            }`}
          >
            Gestión
          </Tabs.Trigger>
          <Tabs.Trigger
            value="reporte"
            className={`px-4 py-2 rounded ${
              selectedTab === "reporte" ? "bg-white shadow" : ""
            }`}
          >
            Reporte Cliente
          </Tabs.Trigger>
        </Tabs.List>

        {/* PESTAÑA 1: Gestión */}
        <Tabs.Content value="gestion" className="bg-white p-4 rounded shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <ClienteForm actualizarClientes={cargarClientes} />
            <PrestamoForm
              clientes={clientes}
              actualizarClientes={cargarClientes}
            />
          </div>
          {/* Aquí podrías añadir tu tabla global de clientes/préstamos */}
        </Tabs.Content>

        {/* PESTAÑA 2: Reporte por cliente */}
        <Tabs.Content
          value="reporte"
          className="bg-white p-4 rounded shadow space-y-4"
        >
          <div>
            <label className="block mb-2 font-semibold">
              Selecciona un cliente:
            </label>
            <Select
              value={selectedClient}
              onValueChange={setSelectedClient}
            >
              <SelectTrigger className="w-full">
                {selectedClient
                  ? clientes.find((c) => c.id === selectedClient)?.nombre
                  : "-- Elige cliente --"}
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedClient ? (
            <ClientReport
              clienteId={selectedClient}
              clienteNombre={
                clientes.find((c) => c.id === selectedClient)!.nombre
              }
              clienteTelefono={
                clientes.find((c) => c.id === selectedClient)!.telefono
              }
            />
          ) : (
            <p className="text-center text-gray-500">
              Elige un cliente para ver su reporte.
            </p>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </DashboardLayout>
  );
}
