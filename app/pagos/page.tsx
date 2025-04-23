'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu as MenuIcon, X, Home, Users, DollarSign, BarChart2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { db } from '@/lib/firebaseConfig';
import { onSnapshot, collection, query, where, orderBy, getDocs } from 'firebase/firestore';

// ----- ICON & NAV CONFIG -----
const NAV_ITEMS = [
  { href: '/',         icon: Home,       label: 'Inicio'    },
  { href: '/clientes', icon: Users,      label: 'Clientes'  },
  { href: '/pagos',    icon: DollarSign, label: 'Pagos'     },
  { href: '/reportes', icon: BarChart2,  label: 'Reportes'  },
];
const ADMIN_ITEMS = [
  { href: '/admin/cartera',  icon: Settings, label: 'Cartera'      },
  { href: '/admin/usuarios', icon: Users,    label: 'Usuarios'     },
  { href: '/devoluciones',   icon: DollarSign,label: 'Devoluciones'},
];

// ----- TYPES & HELPERS -----
type Cliente = { id: string; nombre: string; };
type Prestamo = {
  id: string;
  clienteId: string;
  fechaInicio: string;
  saldoCapital: number;
  monto: number;
  interesesAcumulados?: number;
  ultimaFechaPago?: string;
};
type Pago = {
  id: string;
  prestamoId: string;
  montoCapital: number;
  montoInteres: number;
  fechaPago: string;
};

const parseDate = (s: string) => {
  const parts = s.split('-').map(Number);
  if (parts[0] > 31) {
    const [year, month, day] = parts;
    return new Date(year, month - 1, day);
  }
  const [day, month, year] = parts;
  return new Date(year, month - 1, day);
};

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

const formatDateDisplay = (s: string) => {
  const dt = parseDate(s);
  return new Intl.DateTimeFormat('es-PA',{ day:'numeric', month:'long', year:'numeric' }).format(dt);
};

// ----- COMPONENT -----
export default function PagosPage() {
  const router = useRouter();
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>('');
  const [prestamosFiltrados, setPrestamosFiltrados] = useState<Prestamo[]>([]);
  const [prestamoSeleccionado, setPrestamoSeleccionado] = useState<Prestamo | null>(null);
  const [montoCapital, setMontoCapital] = useState<string>('');
  const [montoInteres, setMontoInteres] = useState<string>('');
  const [fechaPago, setFechaPago] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [pagosPrestamo, setPagosPrestamo] = useState<Pago[]>([]);

  // Cargar clientes y préstamos
  useEffect(() => {
    const unsubCli = onSnapshot(collection(db,'clientes'), snap =>
      setClientes(snap.docs.map(d=>({ id:d.id, ...(d.data() as any) } as Cliente)))
    );

    const unsubPre = onSnapshot(collection(db,'prestamos'), async snap => {
      const arr = await Promise.all(snap.docs.map(async d => {
        const p = d.data() as any;
        const base: Prestamo = {
          id: d.id,
          clienteId: p.clienteId,
          fechaInicio: p.fechaInicio,
          monto: p.monto,
          saldoCapital: 0,
        };
        // obtener pagos
        const pagosSnap = await getDocs(
          query(collection(db,'pagos'),
                where('prestamoId','==', base.id),
                orderBy('fechaPago','desc'))
        );
        let totalCap = 0;
        let lastIntDate = parseDate(base.fechaInicio);
        pagosSnap.docs.forEach(doc => {
          const pd = doc.data() as any;
          totalCap += pd.montoCapital||0;
          if(pd.montoInteres>0 && parseDate(pd.fechaPago)>lastIntDate)
            lastIntDate = parseDate(pd.fechaPago);
        });
        base.saldoCapital = base.monto - totalCap;
        const q = countQuincenasDesde(lastIntDate, new Date());
        base.interesesAcumulados = +(q * (base.saldoCapital * 0.15)).toFixed(2);
        base.ultimaFechaPago = pagosSnap.docs.length>0
          ? (pagosSnap.docs[0].data() as any).fechaPago
          : 'N/A';
        return base;
      }));
      setPrestamos(arr);
    });

    return () => { unsubCli(); unsubPre(); };
  }, []);

  // Filtrar préstamos al cambiar cliente
  useEffect(() => {
    setPrestamosFiltrados(
      clienteSeleccionado
        ? prestamos.filter(p=>p.clienteId===clienteSeleccionado)
        : []
    );
  }, [clienteSeleccionado, prestamos]);

  // Cargar pagos para el modal
  useEffect(() => {
    if (!prestamoSeleccionado) {
      setPagosPrestamo([]);
      return;
    }
    const unsub = onSnapshot(
      query(
        collection(db,'pagos'),
        where('prestamoId','==',prestamoSeleccionado.id),
        orderBy('fechaPago','desc')
      ),
      snap => setPagosPrestamo(snap.docs.map(d=>({ id:d.id, ...(d.data() as any) } as Pago)))
    );
    return () => unsub();
  }, [prestamoSeleccionado]);

  // Registrar pago
  const registrarPago = async () => {
    if (!prestamoSeleccionado) return;
    const fechaISO = new Date(fechaPago).toISOString().split('T')[0];
    const res = await fetch('/api/pagos',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        prestamoId: prestamoSeleccionado.id,
        montoCapital: parseFloat(montoCapital)||0,
        montoInteres: parseFloat(montoInteres)||0,
        fechaPago: fechaISO
      })
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error||'Error al registrar');
    toast.success(data.message||'Pago registrado');
    setMontoCapital(''); setMontoInteres(''); setFechaPago('');
    setPrestamoSeleccionado(null); setModalOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* SIDEBAR desktop */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r">
        <div className="h-16 flex items-center justify-center text-2xl font-bold border-b">
          Pagos
        </div>
        <nav className="p-4 flex-1 space-y-2 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition
                ${path===item.href
                  ? 'bg-gray-200 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
          <div className="mt-6 border-t pt-4 border-gray-200">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Administración</h3>
            {ADMIN_ITEMS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition
                  ${path===item.href
                    ? 'bg-gray-200 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col">
        {/* HEADER móvil */}
        <header className="md:hidden flex items-center justify-between h-16 px-4 bg-white border-b">
          <span className="text-lg font-bold">Pagos</span>
          <Button variant="ghost" onClick={()=>setMenuOpen(v=>!v)}>
            {menuOpen ? <X size={24}/> : <MenuIcon size={24}/> }
          </Button>
        </header>

        {/* DRAWER móvil */}
        {menuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/25">
            <div className="fixed top-0 left-0 bottom-0 w-64 bg-white p-4">
              <div className="flex justify-between items-center mb-6">
                <span className="text-xl font-bold">Pagos</span>
                <Button variant="ghost" onClick={()=>setMenuOpen(false)}>
                  <X size={24}/>
                </Button>
              </div>
              <nav className="space-y-2">
                {NAV_ITEMS.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={()=>setMenuOpen(false)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 transition"
                  >
                    <item.icon className="w-5 h-5"/>
                    <span>{item.label}</span>
                  </Link>
                ))}
                <div className="mt-6 border-t pt-4 border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Administración</h3>
                  {ADMIN_ITEMS.map(item=>(
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={()=>setMenuOpen(false)}
                      className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 transition"
                    >
                      <item.icon className="w-5 h-5"/>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </nav>
            </div>
          </div>
        )}

        {/* CONTENIDO Pagos */}
        <main className="flex-1 p-4 md:p-6">
          <Card>
            <CardHeader>
              <CardTitle>Registro de Pagos</CardTitle>
            </CardHeader>
            <CardContent>
              <Label>Cliente</Label>
              <Select onValueChange={setClienteSeleccionado}>
                <SelectTrigger>
                  {clientes.find(c=>c.id===clienteSeleccionado)?.nombre||'Selecciona un cliente'}
                </SelectTrigger>
                <SelectContent>
                  {clientes.map(c=>(
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {prestamosFiltrados.length>0 && (
                <div className="overflow-x-auto mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Monto</TableHead>
                        <TableHead>Saldo Capital</TableHead>
                        <TableHead>Interés Acumulado</TableHead>
                        <TableHead>Inicio</TableHead>
                        <TableHead>Último Pago</TableHead>
                        <TableHead>Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prestamosFiltrados.map(p=>(
                        <TableRow key={p.id} className="text-center">
                          <TableCell>${p.monto.toFixed(2)}</TableCell>
                          <TableCell>${p.saldoCapital.toFixed(2)}</TableCell>
                          <TableCell>${p.interesesAcumulados?.toFixed(2)}</TableCell>
                          <TableCell>{formatDateDisplay(p.fechaInicio)}</TableCell>
                          <TableCell>
                            {p.ultimaFechaPago!=='N/A' 
                              ? formatDateDisplay(p.ultimaFechaPago!) 
                              : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Button onClick={()=>{
                              setPrestamoSeleccionado(p);
                              setModalOpen(true);
                            }}>
                              Seleccionar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modal manual */}
          {modalOpen && prestamoSeleccionado && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg w-full max-w-md">
                <CardHeader>
                  <CardTitle>Registrar Pago</CardTitle>
                </CardHeader>
                <CardContent>
                  {pagosPrestamo.length>0 ? (
                    <Table className="w-full table-auto mb-4">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Capital</TableHead>
                          <TableHead>Interés</TableHead>
                          <TableHead>Fecha</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagosPrestamo.map(pg=>(
                          <TableRow key={pg.id} className="text-center">
                            <TableCell>${pg.montoCapital.toFixed(2)}</TableCell>
                            <TableCell>${pg.montoInteres.toFixed(2)}</TableCell>
                            <TableCell>{formatDateDisplay(pg.fechaPago)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p>No hay pagos registrados.</p>
                  )}

                  <div className="space-y-2">
                    <Label>Pago a Capital</Label>
                    <Input
                      type="number"
                      value={montoCapital}
                      onChange={e=>setMontoCapital(e.target.value)}
                    />
                    <Label>Pago a Interés</Label>
                    <Input
                      type="number"
                      value={montoInteres}
                      onChange={e=>setMontoInteres(e.target.value)}
                    />
                    <Label>Fecha de Pago</Label>
                    <Input
                      type="date"
                      value={fechaPago}
                      onChange={e=>setFechaPago(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end space-x-2 mt-4">
                    <Button onClick={registrarPago}>Registrar Pago</Button>
                    <Button variant="destructive" onClick={()=>{
                      setModalOpen(false);
                      setPrestamoSeleccionado(null);
                    }}>
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </div>
            </div>
          )}
        </main>

        {/* NAV inferior móvil */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around h-16">
          {NAV_ITEMS.map(item => {
            const active = path===item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center"
              >
                <item.icon
                  size={20}
                  className={active ? 'text-blue-500' : 'text-gray-400'}
                />
                <span className={`text-xs ${active ? 'text-blue-500' : 'text-gray-400'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
