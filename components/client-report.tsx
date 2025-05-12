"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ClientReportProps {
  clienteId: string;
  clienteNombre: string;
  clienteTelefono: string;
}

interface Prestamo {
  id: string;
  monto: number;
  fechaInicio: string;
  saldoCapital: number;
  interesesAcumulados: number;
  ultimaFechaPago: string;
}

interface Pago {
  montoCapital: number;
  montoInteres: number;
  fechaPago: string;
}

const parseDate = (s: string) => {
  const parts = s.split("-").map(Number);
  // YYYY-MM-DD
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

// Cuenta cuántas quincenas (15 y final de mes) han pasado desde `start`
const countQuincenasDesde = (start: Date, end: Date) => {
  let c = 0;
  let d = new Date(start);
  d.setDate(d.getDate() + 1);
  while (d <= end) {
    const day = d.getDate(),
      mon = d.getMonth(),
      year = d.getFullYear(),
      ld = new Date(year, mon + 1, 0).getDate();
    if (day === 15 || day === (mon === 1 ? ld : 30)) c++;
    d.setDate(d.getDate() + 1);
  }
  return c;
};

export default function ClientReport({
  clienteId,
  clienteNombre,
  clienteTelefono,
}: ClientReportProps) {
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      // 1) Traer todos los préstamos de este cliente
      const snap = await getDocs(
        query(
          collection(db, "prestamos"),
          where("clienteId", "==", clienteId)
        )
      );
      const raw = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      // 2) Para cada préstamo, traer sus pagos y calcular saldo e intereses acumulados
      const enriched: Prestamo[] = await Promise.all(
        raw.map(async (p: any) => {
          // pagos ordenados por fecha descendente
          const pagosSnap = await getDocs(
            query(
              collection(db, "pagos"),
              where("prestamoId", "==", p.id),
              orderBy("fechaPago", "desc")
            )
          );
          let totalCap = 0;
          let lastDate = parseDate(p.fechaInicio);
          pagosSnap.docs.forEach((doc) => {
            const pd = doc.data() as any;
            totalCap += pd.montoCapital || 0;
            if (
              pd.montoInteres > 0 &&
              parseDate(pd.fechaPago) > lastDate
            ) {
              lastDate = parseDate(pd.fechaPago);
            }
          });
          const saldo = p.monto - totalCap;
          const quincenas = countQuincenasDesde(
            lastDate,
            new Date()
          );
          const intereses = +(quincenas * (saldo * 0.15)).toFixed(2);
          const ultimaFechaPago =
            pagosSnap.docs[0]?.data().fechaPago || p.fechaInicio;

          return {
            id: p.id,
            monto: p.monto,
            fechaInicio: p.fechaInicio,
            saldoCapital: saldo,
            interesesAcumulados: intereses,
            ultimaFechaPago,
          };
        })
      );

      // 3) Ordenar por fechaInicio descendente
      enriched.sort(
        (a, b) =>
          new Date(b.fechaInicio).getTime() -
          new Date(a.fechaInicio).getTime()
      );

      setPrestamos(enriched);
      setLoading(false);
    }

    load();
  }, [clienteId]);

  // Agregar KPI de totales
  const totalPrestamos = prestamos.length;
  const totalSaldo = prestamos.reduce(
    (acc, p) => acc + p.saldoCapital,
    0
  );
  const totalIntereses = prestamos.reduce(
    (acc, p) => acc + p.interesesAcumulados,
    0
  );

  if (loading) return <p>Cargando reporte…</p>;
  if (prestamos.length === 0)
    return <p>Este cliente no tiene préstamos.</p>;

  return (
    <div className="space-y-6">
      {/* Datos del cliente */}
      <div className="flex space-x-8">
        <div>
          <h3 className="text-lg font-semibold">Cliente:</h3>
          <p>{clienteNombre}</p>
          <p className="text-sm text-gray-500">{clienteTelefono}</p>
        </div>
        <div className="flex space-x-4">
          <Card className="text-center">
            <CardContent>
              <p className="text-2xl font-bold">{totalPrestamos}</p>
              <p>Préstamos</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent>
              <p className="text-2xl font-bold">
                ${totalSaldo.toFixed(2)}
              </p>
              <p>Saldo Pendiente</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent>
              <p className="text-2xl font-bold">
                ${totalIntereses.toFixed(2)}
              </p>
              <p>Intereses Acumulados</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabla de préstamos */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Préstamos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Intereses</TableHead>
                  <TableHead>Último Pago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prestamos.map((p) => (
                  <TableRow key={p.id} className="hover:bg-gray-100">
                    <TableCell>
                      {format(
                        parseDate(p.fechaInicio),
                        "d 'de' MMM yyyy",
                        { locale: es }
                      )}
                    </TableCell>
                    <TableCell>${p.monto.toFixed(2)}</TableCell>
                    <TableCell>${p.saldoCapital.toFixed(2)}</TableCell>
                    <TableCell>
                      ${p.interesesAcumulados.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {format(
                        parseDate(p.ultimaFechaPago),
                        "d 'de' MMM yyyy",
                        { locale: es }
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
