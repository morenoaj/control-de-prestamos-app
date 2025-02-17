"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "react-hot-toast";
import Menu from "@/components/menu";
import ClienteForm from "@/components/clienteform";
import PrestamoForm from "@/components/prestamoform";

interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
}

export default function PagosPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  const obtenerClientes = useCallback(async () => {
    try {
      const snapshot = await getDocs(collection(db, "clientes"));
      setClientes(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Cliente)));
    } catch (error) {
      toast.error("Error al obtener clientes");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    obtenerClientes();
  }, [obtenerClientes]);

  return (
    <div className="container mx-auto p-6">
      <Menu />

      <ClienteForm actualizarClientes={obtenerClientes} />
      <PrestamoForm clientes={clientes} actualizarClientes={obtenerClientes} />

      {/* Lista de Clientes */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center">Cargando...</p>
          ) : clientes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Teléfono</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell>{cliente.nombre}</TableCell>
                    <TableCell>{cliente.telefono}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center">No hay clientes registrados</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
