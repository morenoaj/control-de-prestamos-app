'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, DollarSign, TrendingUp, BarChart2 } from 'lucide-react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  ColumnDef,
} from '@tanstack/react-table';
import ReactPaginate from 'react-paginate';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Aporte {
  id: string;
  inversionistaId: string;
  inversionistaNombre: string;
  monto: number;
  porcentajeGanancia: number;
  fecha: string;
}

interface CarteraEstado {
  totalDisponible: number;
  totalPrestado: number;
  totalGananciaEstimado: number;
}

export default function AportesPage() {
  const [form, setForm] = useState({ inversionistaId: '', monto: '', porcentajeGanancia: '', fecha: new Date().toISOString().split('T')[0] });
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aportes, setAportes] = useState<Aporte[]>([]);
  const [cartera, setCartera] = useState<CarteraEstado>({ totalDisponible: 0, totalPrestado: 0, totalGananciaEstimado: 0 });
  const [globalFilter, setGlobalFilter] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [resC, resA] = await Promise.all([fetch('/api/cartera'), fetch('/api/aportes')]);
        const carteraJson = await resC.json();
        const aportesJson = await resA.json();
        setCartera(carteraJson);
        setAportes(
          (aportesJson.aportes || []).map((a: any) => {
            const dateVal = typeof a.fecha === 'string' ? a.fecha : new Date().toISOString();
            return {
              ...a,
              fecha: dateVal,
              inversionistaNombre: a.inversionistaNombre || a.inversionistaId,
            };
          })
        );
      } catch (err) {
        console.error(err);
      }
    }
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setMensaje(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/aportes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const { aporte, message, error } = await res.json();
      if (error) throw new Error(error);
      setMensaje(message || 'Aporte registrado');
      if (aporte) {
        setAportes(prev => [{ ...aporte, inversionistaNombre: aporte.inversionistaNombre || aporte.inversionistaId }, ...prev]);
        setForm(prev => ({ ...prev, inversionistaId: '', monto: '', porcentajeGanancia: '' }));
      }
    } catch (err: any) {
      setMensaje(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    aportes.forEach(({ fecha, monto }) => {
      const [day] = fecha.split('T');
      map[day] = (map[day] || 0) + monto;
    });
    return Object.entries(map)
      .map(([fecha, monto]) => ({ fecha, monto }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [aportes]);

  const data = useMemo(() => aportes, [aportes]);
  const columnHelper = createColumnHelper<Aporte>();
  const columns = useMemo<ColumnDef<Aporte, any>[]>(
    () => [
      columnHelper.accessor('fecha', {
        header: 'Fecha',
        cell: info => {
          const raw = String(info.getValue()).split('T')[0];
          const [year, month, day] = raw.split('-').map(Number);
          const dt = new Date(year, month - 1, day);
          return new Intl.DateTimeFormat('es-PA', { day: 'numeric', month: 'long', year: 'numeric' }).format(dt);
        },
      }),
      columnHelper.accessor('inversionistaNombre', { header: 'Inversionista' }),
      columnHelper.accessor('monto', {
        header: 'Monto',
        cell: info => `$${(info.getValue() ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      }),
      columnHelper.accessor('porcentajeGanancia', {
        header: '% Ganancia',
        cell: info => `${info.getValue() ?? 0}%`,
      }),
      columnHelper.accessor(row => (row.monto * row.porcentajeGanancia) / 100, {
        id: 'ganancia',
        header: 'Ganancia',
        cell: info => `$${((info.getValue() as number) ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      }),
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow rounded-lg p-4 text-center text-sm">
          <CardHeader className="flex flex-col items-center space-y-1">
            <DollarSign className="w-5 h-5 text-green-500" />
            <CardTitle className="text-base">Total Disponible</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mt-1 text-xl font-bold">${(cartera.totalDisponible ?? 0).toLocaleString(undefined,{minimumFractionDigits:2})}</p>
          </CardContent>
        </Card>
        <Card className="shadow rounded-lg p-4 text-center text-sm">
          <CardHeader className="flex flex-col items-center space-y-1">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <CardTitle className="text-base">Total Prestado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mt-1 text-xl font-bold">${(cartera.totalPrestado ?? 0).toLocaleString(undefined,{minimumFractionDigits:2})}</p>
          </CardContent>
        </Card>
        <Card className="shadow rounded-lg p-4 text-center text-sm">
          <CardHeader className="flex flex-col items-center space-y-1">
            <BarChart2 className="w-5 h-5 text-purple-500" />
            <CardTitle className="text-base">Ganancia Estimada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mt-1 text-xl font-bold">${(cartera.totalGananciaEstimado ?? 0).toLocaleString(undefined,{minimumFractionDigits:2})}</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico */}
      <Card className="h-48 p-2">
        <CardHeader><CardTitle className="text-sm">Tendencia de Aportes</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={val => `$${((val as number) ?? 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`} wrapperStyle={{ fontSize: '0.75rem' }} />
              <Line type="monotone" dataKey="monto" stroke="#4ade80" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Formulario y Tabla */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Form */}
        <Card className="shadow rounded-lg p-4 text-sm">
          <CardHeader><CardTitle className="text-base">Registro de Aporte</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-2">
              <Input type="date" name="fecha" value={form.fecha} onChange={handleChange} className="text-sm p-1" required />
              <Input name="inversionistaId" placeholder="INV-12345" value={form.inversionistaId} onChange={handleChange} className="text-sm p-1" required />
              <Input type="number" name="monto" placeholder="Monto" value={form.monto} onChange={handleChange} className="text-sm p-1" required />
              <Input type="number" name="porcentajeGanancia" placeholder="% Ganancia" value={form.porcentajeGanancia} onChange={handleChange} className="text-sm p-1" required />
              {mensaje && <p className="text-xs text-red-600">{mensaje}</p>}
              <Button type="submit" className="w-full mt-2 text-sm py-1" disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : 'Registrar'}</Button>
            </form>
          </CardContent>
        </Card>
        {/* Tabla */}
        <div className="lg:col-span-2 space-y-2 text-sm">
          <Input placeholder="Buscar..." value={globalFilter} onChange={e => setGlobalFilter(e.target.value)} className="max-w-xs text-sm p-1" />
          <div className="overflow-x-auto text-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0">
                {table.getHeaderGroups().map(hg => (
                  <tr key={hg.id}>
                    {hg.headers.map(header => (
                      <th key={header.id} className="py-1 px-2 text-left text-sm font-medium" onClick={header.column.getToggleSortingHandler()}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span>{header.column.getIsSorted() ? (header.column.getIsSorted() === 'desc' ? ' 🔽' : ' 🔼') : ''}</span>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y">
                {table.getPaginationRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-100">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="py-1 px-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {table.getPageCount() > 1 && (
            <ReactPaginate
              previousLabel="◀"
              nextLabel="▶"
              pageCount={table.getPageCount()}
              forcePage={table.getState().pagination.pageIndex}
              onPageChange={({ selected }) => table.setPageIndex(selected)}
              containerClassName="flex space-x-1 justify-center mt-2"
              pageClassName="px-1"
              activeClassName="font-bold"
              nextClassName="px-1"
              previousClassName="px-1"
            />
          )}
        </div>
      </div>
    </div>
  );
}
