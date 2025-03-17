"use client";

import { useState, useEffect } from "react";
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc,
  query,
  where,
  orderBy 
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "react-hot-toast";

export default function LoanAssignmentAdmin() {
  // Estados para proveedores
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalFund, setGlobalFund] = useState(0);

  // Estados para asignación de préstamo
  const [loanAmount, setLoanAmount] = useState("");
  // assignments: objeto donde la clave es el providerId y el valor el monto asignado
  const [assignments, setAssignments] = useState({});

  // Estados para registrar y ver el historial de asignaciones
  const [loanAssignments, setLoanAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  // Función para cargar proveedores de la colección "capitalProviders"
  const cargarProviders = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "capitalProviders"));
      const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProviders(data);
      const total = data.reduce((sum, provider) => sum + (provider.balance || 0), 0);
      setGlobalFund(total);
    } catch (error) {
      toast.error("Error al cargar proveedores");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar asignaciones de préstamo (historial) de la colección "loanAssignments"
  const cargarLoanAssignments = async () => {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, "loanAssignments"), orderBy("createdAt", "desc"))
      );
      const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setLoanAssignments(data);
    } catch (error) {
      toast.error("Error al cargar asignaciones de préstamo");
      console.error(error);
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    cargarProviders();
    cargarLoanAssignments();
  }, []);

  // Manejar cambio en la asignación de fondos para cada proveedor
  const handleAssignmentChange = (providerId, value) => {
    const amt = parseFloat(value);
    setAssignments((prev) => ({ ...prev, [providerId]: isNaN(amt) ? 0 : amt }));
  };

  // Sumar el total asignado
  const totalAssigned = Object.values(assignments).reduce((sum, amt) => sum + amt, 0);

  // Función para registrar la asignación de un préstamo
  const registrarLoanAssignment = async (e) => {
    e.preventDefault();
    const loanAmt = parseFloat(loanAmount);
    if (totalAssigned !== loanAmt) {
      toast.error("La suma de las asignaciones debe ser igual al monto del préstamo.");
      return;
    }
    if (loanAmt > globalFund) {
      toast.error("No hay suficientes fondos disponibles para este préstamo.");
      return;
    }
    try {
      // Crear el registro en "loanAssignments"
      const newAssignment = {
        loanAmount: loanAmt,
        assignments, // Objeto: providerId => monto asignado
        createdAt: new Date()
        // Aquí se pueden agregar campos adicionales: por ejemplo, loanId, borrowerId, etc.
      };
      await addDoc(collection(db, "loanAssignments"), newAssignment);
      // Actualizar el balance de cada proveedor según lo asignado
      for (const provider of providers) {
        const assignedAmt = assignments[provider.id] || 0;
        if (assignedAmt > 0) {
          const providerRef = doc(db, "capitalProviders", provider.id);
          const newBalance = provider.balance - assignedAmt;
          await updateDoc(providerRef, { balance: newBalance });
        }
      }
      toast.success("Préstamo asignado correctamente");
      // Reiniciar campos
      setLoanAmount("");
      setAssignments({});
      cargarProviders();
      cargarLoanAssignments();
    } catch (error) {
      toast.error("Error al registrar la asignación del préstamo");
      console.error(error);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Resumen del Fondo Global */}
      <Card>
        <CardHeader>
          <CardTitle>Fondo Global Disponible: ${globalFund.toFixed(2)}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            Este es el total de capital disponible para prestar. Si no hay fondos, no se podrán generar nuevos préstamos.
          </p>
        </CardContent>
      </Card>

      {/* Formulario para Asignar un Préstamo */}
      <Card>
        <CardHeader>
          <CardTitle>Asignar Préstamo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={registrarLoanAssignment} className="space-y-4">
            <div>
              <label className="block text-gray-700">Monto del Préstamo</label>
              <Input
                type="number"
                placeholder="Monto del préstamo"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <p className="text-gray-700 mb-2">Asignar fondos de cada proveedor:</p>
              {providers.map((provider) => (
                <div key={provider.id} className="flex items-center space-x-2 mb-2">
                  <span className="w-1/3">
                    {provider.nombre} (Disponible: ${provider.balance.toFixed(2)})
                  </span>
                  <Input
                    type="number"
                    placeholder="Monto a asignar"
                    value={assignments[provider.id] || ""}
                    onChange={(e) => handleAssignmentChange(provider.id, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div>
              <p className="text-gray-700">
                Total asignado: ${totalAssigned.toFixed(2)}{" "}
                {loanAmount &&
                  totalAssigned !== parseFloat(loanAmount) && (
                    <span className="text-red-500">(Debe ser igual al monto del préstamo)</span>
                  )}
              </p>
            </div>
            <Button type="submit" disabled={totalAssigned !== parseFloat(loanAmount)}>
              Asignar Préstamo
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Historial de Asignaciones de Préstamos */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Asignaciones de Préstamos</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAssignments ? (
            <p>Cargando asignaciones...</p>
          ) : loanAssignments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Monto del Préstamo</TableHead>
                    <TableHead>Asignaciones</TableHead>
                    <TableHead>Fecha de Asignación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loanAssignments.map((assignment) => (
                    <TableRow key={assignment.id} className="hover:bg-gray-100">
                      <TableCell>${assignment.loanAmount.toFixed(2)}</TableCell>
                      <TableCell>
                        {Object.entries(assignment.assignments)
                          .map(([providerId, amt]) => {
                            const prov = providers.find((p) => p.id === providerId);
                            return prov ? `${prov.nombre}: $${parseFloat(amt).toFixed(2)}` : "";
                          })
                          .join(" | ")}
                      </TableCell>
                      <TableCell>
                        {new Date(assignment.createdAt.seconds * 1000).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p>No hay asignaciones registradas.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
