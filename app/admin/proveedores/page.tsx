"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "react-hot-toast";

export default function CapitalProvidersAdmin() {
  // Estados para proveedores
  const [providers, setProviders] = useState([]);
  const [nombre, setNombre] = useState("");
  const [capital, setCapital] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [loading, setLoading] = useState(true);

  // Estados para transacciones
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [transactionType, setTransactionType] = useState("capital"); // "capital" o "interés"
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [transactionDescription, setTransactionDescription] = useState("");
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);

  // Cargar proveedores desde Firestore
  const cargarProviders = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "capitalProviders"));
      const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProviders(data);
    } catch (error) {
      toast.error("Error al cargar proveedores");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProviders();
  }, []);

  // Registrar nuevo proveedor
  const registrarProvider = async (e) => {
    e.preventDefault();
    if (!nombre || !capital || !interestRate) {
      toast.error("Todos los campos son obligatorios");
      return;
    }
    try {
      await addDoc(collection(db, "capitalProviders"), {
        nombre,
        capitalContributed: parseFloat(capital),
        interestRate: parseFloat(interestRate),
        balance: parseFloat(capital),
        transactions: [] // Opcional, si deseas guardar historial directamente aquí
      });
      toast.success("Proveedor registrado correctamente");
      setNombre("");
      setCapital("");
      setInterestRate("");
      cargarProviders();
    } catch (error) {
      toast.error("Error al registrar proveedor");
      console.error(error);
    }
  };

  // Cargar transacciones para un proveedor (se almacenan en "providerTransactions")
  const cargarTransactions = async (providerId) => {
    try {
      const q = query(
        collection(db, "providerTransactions"),
        where("providerId", "==", providerId),
        orderBy("transactionDate", "desc")
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTransactions(data);
    } catch (error) {
      toast.error("Error al cargar transacciones");
      console.error(error);
    }
  };

  // Abrir modal de transacciones para un proveedor seleccionado
  const abrirModalTransactions = (provider) => {
    setSelectedProvider(provider);
    cargarTransactions(provider.id);
    setTransactionModalOpen(true);
  };

  // Registrar una transacción
  const registrarTransaction = async (e) => {
    e.preventDefault();
    if (!transactionAmount || !transactionDate || !transactionType) {
      toast.error("Todos los campos de transacción son obligatorios");
      return;
    }
    try {
      const amount = parseFloat(transactionAmount);
      // Crear objeto transacción
      const newTransaction = {
        providerId: selectedProvider.id,
        transactionType,
        transactionAmount: amount,
        transactionDate, // Se asume formato "YYYY-MM-DD" (input type="date")
        transactionDescription
      };
      await addDoc(collection(db, "providerTransactions"), newTransaction);

      // Actualizar el balance del proveedor si se trata de un abono a capital
      if (transactionType === "capital") {
        const providerRef = doc(db, "capitalProviders", selectedProvider.id);
        const newBalance = selectedProvider.balance - amount;
        await updateDoc(providerRef, { balance: newBalance });
      }
      toast.success("Transacción registrada correctamente");
      // Resetear campos de transacción
      setTransactionAmount("");
      setTransactionDate("");
      setTransactionDescription("");
      // Recargar proveedores y transacciones
      cargarProviders();
      cargarTransactions(selectedProvider.id);
    } catch (error) {
      toast.error("Error al registrar transacción");
      console.error(error);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Formulario para registrar proveedor */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Registrar Proveedor de Capital</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={registrarProvider} className="space-y-4">
            <Input
              type="text"
              placeholder="Nombre del proveedor"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
            <Input
              type="number"
              placeholder="Capital aportado (ej. 50)"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              required
            />
            <Input
              type="number"
              placeholder="Tasa de interés (%) (ej. 7)"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              required
            />
            <Button type="submit">Registrar Proveedor</Button>
          </form>
        </CardContent>
      </Card>

      {/* Listado de Proveedores */}
      <Card>
        <CardHeader>
          <CardTitle>Proveedores de Capital</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Cargando proveedores...</p>
          ) : providers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Capital Aportado</TableHead>
                    <TableHead>Tasa (%)</TableHead>
                    <TableHead>Balance Actual</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers.map((provider) => (
                    <TableRow key={provider.id} className="hover:bg-gray-100">
                      <TableCell>{provider.nombre}</TableCell>
                      <TableCell>${provider.capitalContributed.toFixed(2)}</TableCell>
                      <TableCell>{provider.interestRate.toFixed(2)}%</TableCell>
                      <TableCell>${provider.balance.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button onClick={() => abrirModalTransactions(provider)}>
                          Ver / Agregar Transacciones
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p>No hay proveedores registrados.</p>
          )}
        </CardContent>
      </Card>

      {/* Modal de Transacciones para el proveedor seleccionado */}
      {transactionModalOpen && selectedProvider && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
            <CardHeader>
              <CardTitle>Transacciones - {selectedProvider.nombre}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Listado de transacciones */}
              <div className="overflow-x-auto mb-4">
                {transactions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Descripción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.id} className="hover:bg-gray-100">
                          <TableCell>{tx.transactionType}</TableCell>
                          <TableCell>${tx.transactionAmount.toFixed(2)}</TableCell>
                          <TableCell>{tx.transactionDate}</TableCell>
                          <TableCell>{tx.transactionDescription || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p>No hay transacciones registradas.</p>
                )}
              </div>

              {/* Formulario para agregar una transacción */}
              <form onSubmit={registrarTransaction} className="space-y-4">
                <div className="flex flex-col">
                  <label className="mb-1">Tipo de Transacción</label>
                  <select
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value)}
                    className="p-2 border rounded"
                    required
                  >
                    <option value="capital">Abono a Capital (disminuye balance)</option>
                    <option value="interés">Pago de Interés (no afecta balance)</option>
                  </select>
                </div>
                <Input
                  type="number"
                  placeholder="Monto de transacción"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                  required
                />
                <Input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  required
                />
                <Input
                  type="text"
                  placeholder="Descripción (opcional)"
                  value={transactionDescription}
                  onChange={(e) => setTransactionDescription(e.target.value)}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="submit">Registrar Transacción</Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setTransactionModalOpen(false);
                      setSelectedProvider(null);
                    }}
                  >
                    Cerrar
                  </Button>
                </div>
              </form>
            </CardContent>
          </div>
        </div>
      )}
    </div>
  );
}
