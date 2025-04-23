'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu as MenuIcon, X, Home, Users, DollarSign, BarChart2, Settings } from 'lucide-react';
import { auth, db } from '@/lib/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface Inversionista { id: string; nombre: string; }
interface AporteRaw {
  inversionistaId: string;
  monto: number;
  porcentajeGanancia: number;
  fechaAporte?: Timestamp;
  fecha?: string;
  estado: 'activo' | 'devuelto';
  fechaDevolucion?: Timestamp;
}
interface Aporte extends AporteRaw {
  id: string;
  inversionistaNombre: string;
}
interface Movimiento {
  id: string;
  tipo: string;
  origen: string;
  fecha: Timestamp;
  inversionistaId: string;
  aporteId: string;
  monto: number;
  detalle: { capital: number; ganancia: number };
}

// Navegación principal
const NAV_ITEMS = [
  { href: '/',         icon: Home,       label: 'Inicio'    },
  { href: '/clientes', icon: Users,      label: 'Clientes'  },
  { href: '/pagos',    icon: DollarSign, label: 'Pagos'     },
  { href: '/reportes', icon: BarChart2,  label: 'Reportes'  },
];
// Submenú de administración
const ADMIN_ITEMS = [
  { href: '/admin/cartera',  icon: Settings,    label: 'Cartera'      },
  { href: '/admin/usuarios', icon: Users,       label: 'Usuarios'     },
  { href: '/devoluciones',   icon: DollarSign,  label: 'Devoluciones' },
];

// Formatea Timestamp o ISO-date a texto largo en español
const formatDate = (value?: Timestamp | string) => {
  if (!value) return '-';
  let dt: Date;
  if (typeof value === 'string') {
    const [y, m, d] = value.split('-').map(Number);
    dt = new Date(Date.UTC(y, m - 1, d));
  } else {
    dt = new Date(value.seconds * 1000);
  }
  return new Intl.DateTimeFormat('es-PA', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  }).format(dt);
};

export default function DevolucionesPage() {
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [inversionistas, setInversionistas] = useState<Inversionista[]>([]);
  const [aportes, setAportes] = useState<Aporte[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);

  // diálogo
  const [open, setOpen] = useState(false);
  const [seleccionado, setSeleccionado] = useState<Aporte | null>(null);
  const [capitalDevolver, setCapitalDevolver] = useState(0);
  const [gananciaDevolver, setGananciaDevolver] = useState(0);

  // auth + carga datos
  useEffect(() => {
    onAuthStateChanged(auth, user => {
      if (!user) return;
      // no hay restricción de rol aquí
      cargarDatos();
    });
  }, []);

  async function cargarDatos() {
    setLoading(true);
    try {
      const [invSnap, apSnap, movSnap] = await Promise.all([
        getDocs(collection(db, 'inversionistas')),
        getDocs(collection(db, 'aportes')),
        getDocs(collection(db, 'movimientos')),
      ]);
      const invList = invSnap.docs.map(d => ({
        id: d.id,
        nombre: (d.data() as any).nombre || d.id
      }));
      const invMap = Object.fromEntries(invList.map(i => [i.id, i.nombre]));
      setInversionistas(invList);

      setAportes(apSnap.docs.map(d => {
        const data = d.data() as AporteRaw;
        return {
          id: d.id,
          ...data,
          inversionistaNombre: invMap[data.inversionistaId] || data.inversionistaId
        };
      }));
      setMovimientos(movSnap.docs.map(d => ({
        id: d.id,
        ...(d.data() as any)
      })));
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }

  function abrirModal(a: Aporte) {
    setSeleccionado(a);
    setCapitalDevolver(a.monto);
    setGananciaDevolver((a.monto * a.porcentajeGanancia) / 100);
    setOpen(true);
  }

  async function confirmarDevolucion() {
    if (!seleccionado) return;
    const total = capitalDevolver + gananciaDevolver;
    const fecha = Timestamp.now();
    try {
      // actualiza aporte
      const refA = doc(db, 'aportes', seleccionado.id);
      const snapA = await getDoc(refA);
      const data = snapA.data() as AporteRaw;
      const nuevoCap = data.monto - capitalDevolver;
      const upd: any = { monto: nuevoCap };
      if (nuevoCap <= 0) {
        upd.estado = 'devuelto';
        upd.fechaDevolucion = fecha;
      }
      await updateDoc(refA, upd);

      // actualiza cartera
      const refC = doc(db, 'cartera', 'estado');
      const snapC = await getDoc(refC);
      const totalDisp = (snapC.data() as any).totalDisponible;
      if (totalDisp < total) {
        toast.error('Fondos insuficientes');
        return;
      }
      await updateDoc(refC, { totalDisponible: totalDisp - total });

      // registra movimiento
      const movRef = doc(collection(db, 'movimientos'));
      const mv: Movimiento = {
        id: movRef.id,
        tipo: 'salida',
        origen: 'devolucion',
        fecha,
        inversionistaId: seleccionado.inversionistaId,
        aporteId: seleccionado.id,
        monto: total,
        detalle: { capital: capitalDevolver, ganancia: gananciaDevolver }
      };
      await setDoc(movRef, mv);

      toast.success('Devolución registrada');
      // refresca UI
      setAportes(aList =>
        aList.map(a => a.id === seleccionado.id ? { ...a, ...upd } : a)
      );
      setMovimientos(mvList => [mv, ...mvList]);
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Error en devolución');
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar escritorio */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r">
        <div className="h-16 flex items-center justify-center font-bold border-b">
          Administración
        </div>
        <nav className="p-4 flex-1 space-y-2 overflow-y-auto">
          {NAV_ITEMS.map(it => (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition ${
                path === it.href
                  ? 'bg-gray-200 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <it.icon className="w-5 h-5" />
              <span>{it.label}</span>
            </Link>
          ))}
          <div className="mt-6 border-t pt-4 border-gray-200">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
              Administración
            </h3>
            {ADMIN_ITEMS.map(it => (
              <Link
                key={it.href}
                href={it.href}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition ${
                  path === it.href
                    ? 'bg-gray-200 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <it.icon className="w-5 h-5" />
                <span>{it.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </aside>

      {/* Área principal */}
      <div className="flex-1 flex flex-col">
        {/* Header móvil */}
        <header className="md:hidden flex items-center justify-between h-16 px-4 bg-white border-b">
          <span className="font-bold">Devoluciones</span>
          <Button variant="ghost" onClick={() => setMenuOpen(v => !v)}>
            {menuOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </Button>
        </header>

        {/* Drawer móvil */}
        {menuOpen && (
          <div className="md:hidden fixed inset-0 z-30 bg-black/25">
            <div className="fixed top-0 left-0 bottom-0 w-64 bg-white p-4">
              <div className="flex justify-between items-center mb-6">
                <span className="font-bold text-xl">Administración</span>
                <Button variant="ghost" onClick={() => setMenuOpen(false)}>
                  <X size={24} />
                </Button>
              </div>
              <nav className="space-y-2">
                {NAV_ITEMS.map(it => (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100"
                  >
                    <it.icon className="w-5 h-5" />
                    <span>{it.label}</span>
                  </Link>
                ))}
                <div className="mt-6 border-t pt-4 border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                    Administración
                  </h3>
                  {ADMIN_ITEMS.map(it => (
                    <Link
                      key={it.href}
                      href={it.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100"
                    >
                      <it.icon className="w-5 h-5" />
                      <span>{it.label}</span>
                    </Link>
                  ))}
                </div>
              </nav>
            </div>
          </div>
        )}

        {/* Contenido */}
        <main className="flex-1 p-4 md:p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Devoluciones a Inversionistas</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Cargando...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Inversionista</TableHead>
                      <TableHead>Capital</TableHead>
                      <TableHead>% Ganancia</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha Aporte</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aportes.map(a => (
                      <TableRow key={a.id}>
                        <TableCell>{a.inversionistaNombre}</TableCell>
                        <TableCell>${a.monto.toFixed(2)}</TableCell>
                        <TableCell>{a.porcentajeGanancia}%</TableCell>
                        <TableCell>{a.estado}</TableCell>
                        <TableCell>{formatDate(a.fechaAporte ?? a.fecha)}</TableCell>
                        <TableCell>
                          <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                              <Button
                                onClick={() => abrirModal(a)}
                                disabled={a.estado !== 'activo'}
                              >
                                Devolver
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Devolución Parcial</DialogTitle>
                                <DialogDescription>
                                  Ajusta los montos y confirma.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Capital a devolver</Label>
                                  <Input
                                    type="number"
                                    value={capitalDevolver}
                                    onChange={e =>
                                      setCapitalDevolver(Number(e.target.value))
                                    }
                                  />
                                </div>
                                <div>
                                  <Label>Interés a devolver</Label>
                                  <Input
                                    type="number"
                                    value={gananciaDevolver}
                                    onChange={e =>
                                      setGananciaDevolver(Number(e.target.value))
                                    }
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button onClick={confirmarDevolucion}>
                                  Confirmar
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historial de Devoluciones</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Inversionista</TableHead>
                    <TableHead>Capital</TableHead>
                    <TableHead>Interés</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientos
                    .filter(m => m.origen === 'devolucion')
                    .map(m => (
                      <TableRow key={m.id}>
                        <TableCell>{formatDate(m.fecha)}</TableCell>
                        <TableCell>
                          {inversionistas.find(i => i.id === m.inversionistaId)
                            ?.nombre || m.inversionistaId}
                        </TableCell>
                        <TableCell>${m.detalle.capital.toFixed(2)}</TableCell>
                        <TableCell>${m.detalle.ganancia.toFixed(2)}</TableCell>
                        <TableCell>
                          ${(m.detalle.capital + m.detalle.ganancia).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>

        {/* Bottom nav móvil */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t flex justify-around h-16">
          {NAV_ITEMS.map(it => {
            const active = path === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                className="flex flex-col items-center justify-center"
              >
                <it.icon
                  size={20}
                  className={active ? 'text-blue-500' : 'text-gray-400'}
                />
                <span className={`text-xs ${active ? 'text-blue-500' : 'text-gray-400'}`}>
                  {it.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}