"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

// --- Helpers de fecha ---
function parseDateYMD(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function formatDateShort(dt: Date): string {
  return format(dt, "d/MM", { locale: es });
}
function quincenaStart(dt: Date): Date {
  const day = dt.getDate();
  return day <= 15
    ? new Date(dt.getFullYear(), dt.getMonth(), 1)
    : new Date(dt.getFullYear(), dt.getMonth(), 16);
}

export default function DashboardPage() {
  // Fecha y saludo
  const today = new Date();
  const todayFmt = format(today, "d 'de' MMMM 'de' yyyy", { locale: es });

  // Estados
  const [clientes, setClientes] = useState<any[]>([]);
  const [prestamos, setPrestamos] = useState<any[]>([]);
  const [pagos, setPagos]         = useState<any[]>([]);

  // Métricas
  const [totalClientes, setTotalClientes] = useState(0);
  const [activosCount, setActivosCount]   = useState(0);
  const [capitalPrestado, setCapitalPrestado] = useState(0);
  const [capitalRecuperado, setCapitalRecuperado] = useState(0);
  const [ratioRecup, setRatioRecup]       = useState(0);
  const [interesesTotal, setInteresesTotal] = useState(0);
  const [interesesNext, setInteresesNext] = useState(0);
  const [prestadoQuincena, setPrestadoQuincena] = useState(0);

  // Tendencia data
  const [tendencia, setTendencia] = useState<{ fecha: string; prest: number; recup: number }[]>([]);

  // Cliente → intereses pendientes
  const [deudaClientes, setDeudaClientes] = useState<{ nombre: string; deuda: number }[]>([]);

  useEffect(() => {
    (async () => {
      // 1) Carga raw
      const [cliSnap, preSnap, pagSnap] = await Promise.all([
        getDocs(collection(db, "clientes")),
        getDocs(collection(db, "prestamos")),
        getDocs(collection(db, "pagos")),
      ]);
      const cliArr = cliSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      const preArr = preSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      const pagArr = pagSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

      setClientes(cliArr);
      setPrestamos(preArr);
      setPagos(pagArr);

      // 2) Total clientes
      setTotalClientes(cliArr.length);

      // 3) Préstamos activos & capital prestado
      const activos = preArr.filter(p => p.estado === "activo");
      setActivosCount(activos.length);
      const sumaPrest = preArr.reduce((s, p) => s + (p.monto || 0), 0);
      setCapitalPrestado(sumaPrest);

      // 4) Capital recuperado por pagos de capital
      const sumaRecup = pagArr.reduce((s, p) => s + (p.montoCapital || 0), 0);
      setCapitalRecuperado(sumaRecup);

      // 5) Ratio
      setRatioRecup(sumaRecup / (sumaPrest || 1));

      // 6) Intereses totales acumulados (cada pagoInteres + devengados)
      //   suponemos un campo p.interesAcumulado en préstamos
      const sumaInter = preArr.reduce((s, p) => s + (p.interesAcumulado || 0), 0)
                        + pagArr.reduce((s, p) => s + (p.montoInteres || 0), 0);
      setInteresesTotal(sumaInter);

      // 7) Intereses próxima quincena (15% sobre saldo capital de cada activo)
      const intNext = activos.reduce((s, p) => s + ((p.saldoCapital||0) * 0.15), 0);
      setInteresesNext(intNext);

      // 8) Capital prestado en esta quincena
      const qStart = quincenaStart(today);
      const prestQ = preArr
        .filter(p => {
          const dt = parseDateYMD(p.fechaInicio);
          return dt >= qStart && dt <= today;
        })
        .reduce((s, p) => s + (p.monto || 0), 0);
      setPrestadoQuincena(prestQ);

      // 9) Tendencia (últimas 6 quincenas)
      const arr: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const ref = new Date(today);
        ref.setDate(ref.getDate() - i * 15);
        const start = quincenaStart(ref);
        const end = new Date(start);
        end.setDate(end.getDate() + 14);
        const label = formatDateShort(start);
        const sumPrest = preArr
          .filter(p => {
            const dt = parseDateYMD(p.fechaInicio);
            return dt >= start && dt <= end;
          })
          .reduce((s, p) => s + (p.monto||0), 0);
        const sumRec = pagArr
          .filter(p => {
            const dt = parseDateYMD(p.fechaPago);
            return dt >= start && dt <= end;
          })
          .reduce((s, p) => s + (p.montoCapital||0), 0);
        arr.push({ fecha: label, prest: sumPrest, recup: sumRec });
      }
      setTendencia(arr);

      // 10) Clientes con intereses pendientes
      const deudaMap: Record<string, number> = {};
      preArr.forEach(p => {
        if ((p.interesAcumulado||0) > 0) {
          deudaMap[p.clienteId] = (deudaMap[p.clienteId]||0) + (p.interesAcumulado||0);
        }
      });
      setDeudaClientes(
        Object.entries(deudaMap).map(([cid, d]) => ({
          nombre: cliArr.find(c=>c.id===cid)?.nombre||"–",
          deuda: d
        }))
      );
    })();
  }, []);

  return (
    <DashboardLayout>
      {/* Saludo */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">¡Hola, {/** aquí tu nombre */}!</h1>
        <span className="text-gray-500">{todayFmt}</span>
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader><CardTitle>Total Clientes</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{totalClientes}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Préstamos Activos</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{activosCount}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Capital Prestado</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">${capitalPrestado.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Capital Recuperado</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">${capitalRecuperado.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Ratio Recuperación</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{(ratioRecup*100).toFixed(1)}%</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Intereses Generados</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">${interesesTotal.toLocaleString()}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Próxima Quincena</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">${interesesNext.toFixed(0)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Prestado en Quincena</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">${prestadoQuincena.toLocaleString()}</CardContent>
        </Card>
      </div>

      {/* Tendencia */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="h-64">
          <CardHeader><CardTitle>Prestado vs Recuperado</CardTitle></CardHeader>
          <CardContent className="h-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tendencia}>
                <XAxis dataKey="fecha" />
                <YAxis />
                <Tooltip formatter={(v:any) => `$${v.toLocaleString()}`} />
                <Area dataKey="prest" name="Prestado" stroke="#4ade80" fill="#d1fae5" />
                <Area dataKey="recup" name="Recuperado" stroke="#60a5fa" fill="#dbf4ff" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Clientes con deuda */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Intereses Pendientes</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Monto Intereses</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deudaClientes.map((d, i) => (
                <TableRow key={i}>
                  <TableCell>{d.nombre}</TableCell>
                  <TableCell>${d.deuda.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
