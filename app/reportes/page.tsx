'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Menu as MenuIcon,
  X,
  Home,
  Users,
  DollarSign,
  BarChart2,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import { db } from '@/lib/firebaseConfig';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';
import { obtenerRolDeUsuario } from '@/lib/auth';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ---- NAV ITEMS ----
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

// ---- TYPES & HELPERS ----
interface Cliente { id: string; nombre: string; }
interface Prestamo {
  id: string;
  monto: number;
  fechaInicio: string;
  clienteId: string;
  saldoCapital?: number;
  interesesAcumulados?: number;
}
type PagoResumen = Record<string,{ capital:number; interes:number }>;

const parseDate = (s: string) => {
  const [year, month, day] = s.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const countQuincenasDesde = (start: Date, end: Date) => {
  let c = 0, d = new Date(start);
  d.setDate(d.getDate()+1);
  while(d<=end){
    const day=d.getDate(), m=d.getMonth(), y=d.getFullYear(),
          ld=new Date(y,m+1,0).getDate();
    if(day===15 || day===(m===1?ld:30)) c++;
    d.setDate(d.getDate()+1);
  }
  return c;
};
const formatDateDisplay = (s: string) => {
  const dt = parseDate(s);
  return new Intl.DateTimeFormat('es-PA',{
    day:'numeric', month:'long', year:'numeric'
  }).format(dt);
};

const calcularValoresPrestamo = async (p: Prestamo): Promise<Prestamo> => {
  const pagosSnap = await getDocs(
    query(
      collection(db,'pagos'),
      where('prestamoId','==',p.id),
      orderBy('fechaPago','desc')
    )
  );
  let totalCap = 0;
  let lastDate = parseDate(p.fechaInicio);
  pagosSnap.docs.forEach(d=>{
    const pd = d.data() as any;
    totalCap += pd.montoCapital||0;
    if(pd.montoInteres>0 && parseDate(pd.fechaPago)>lastDate) {
      lastDate = parseDate(pd.fechaPago);
    }
  });
  const saldo = p.monto - totalCap;
  const quincenas = countQuincenasDesde(lastDate, new Date());
  return {
    ...p,
    saldoCapital: saldo,
    interesesAcumulados: +(quincenas * (saldo * 0.15)).toFixed(2)
  };
};

const obtenerPagosAgrupados = async (): Promise<PagoResumen> => {
  const snap = await getDocs(collection(db,'pagos'));
  const res: PagoResumen = {};
  snap.docs.forEach(d=>{
    const pd = d.data() as any;
    res[pd.prestamoId] ??= { capital:0, interes:0 };
    res[pd.prestamoId].capital += pd.montoCapital||0;
    res[pd.prestamoId].interes  += pd.montoInteres||0;
  });
  return res;
};

// ---- COMPONENT ----
export default function ReportesPage(){
  const router = useRouter();
  const path   = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const [clientes, setClientes]           = useState<Cliente[]>([]);
  const [prestamos, setPrestamos]         = useState<Prestamo[]>([]);
  const [resumenPagos, setResumenPagos]   = useState<PagoResumen>({});
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [loading, setLoading]             = useState(true);
  const [authChecked, setAuthChecked]     = useState(false);
  const [rol, setRol]                     = useState<string|null>(null);

  // pagination
  const [pagina, setPagina] = useState(1);
  const porPagina = 10;

  // ACTIVOS: saldo > 0
  const prestamosFiltrados = prestamos
    .filter(p=>{
      const cli = clientes.find(c=>c.id===p.clienteId);
      return (p.saldoCapital ?? 0) > 0
          && cli?.nombre.toLowerCase().includes(busquedaCliente.toLowerCase());
    })
    .sort((a,b)=>
      parseDate(b.fechaInicio).getTime()
      - parseDate(a.fechaInicio).getTime()
    );

  // FINALIZADOS: saldo = 0
  const prestamosFinalizados = prestamos
    .filter(p=>{
      const cli = clientes.find(c=>c.id===p.clienteId);
      return (p.saldoCapital ?? 0) === 0
          && cli?.nombre.toLowerCase().includes(busquedaCliente.toLowerCase());
    })
    .sort((a,b)=>
      parseDate(b.fechaInicio).getTime()
      - parseDate(a.fechaInicio).getTime()
    );

  const totalPaginas = Math.ceil(prestamosFiltrados.length/porPagina);
  const pagPrev = ()=> pagina>1 && setPagina(pagina-1);
  const pagNext = ()=> pagina<totalPaginas && setPagina(pagina+1);

  // AUTH + DATA LOAD
  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, async user=>{
      if(!user) return router.replace('/login');
      const r = await obtenerRolDeUsuario();
      if(r && !['Admin','Gestor'].includes(r)) return router.replace('/');
      setRol(r);
      cargarDatos();
      setAuthChecked(true);
    });
    return ()=> unsub();
  },[]);

  const cargarDatos = useCallback(async ()=>{
    try{
      const [cliSnap, preSnap, resu] = await Promise.all([
        getDocs(collection(db,'clientes')),
        getDocs(collection(db,'prestamos')),
        obtenerPagosAgrupados()
      ]);
      setClientes(cliSnap.docs.map(d=>({ id:d.id, ...(d.data() as any) })));
      const prs = await Promise.all(
        preSnap.docs.map(d=>calcularValoresPrestamo({ id:d.id, ...(d.data() as any) }))
      );
      setPrestamos(prs);
      setResumenPagos(resu);
    }catch(e){
      console.error(e);
      toast.error('Error al cargar datos');
    }finally{
      setLoading(false);
    }
  },[]);

  // EXPORT
  const exportarExcel = ()=>{
    const ws = XLSX.utils.json_to_sheet(prestamosFiltrados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'Reportes');
    XLSX.writeFile(wb,'reportes_prestamos.xlsx');
  };
  const exportarPDF = ()=>{
    const doc = new jsPDF();
    doc.text('Reporte de Préstamos',20,10);
    autoTable(doc,{ html:'#tablaReportes' });
    doc.save('reportes_prestamos.pdf');
  };

  if(!authChecked||!rol) return null;

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* SIDEBAR desktop */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r">
        <div className="h-16 flex items-center justify-center font-bold border-b">
          Reportes
        </div>
        <nav className="p-4 flex-1 space-y-2 overflow-y-auto">
          {NAV_ITEMS.map(it=>(
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition
                ${path===it.href
                  ? 'bg-gray-200 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <it.icon className="w-5 h-5"/>
              <span>{it.label}</span>
            </Link>
          ))}
          <div className="mt-6 border-t pt-4 border-gray-200">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
              Administración
            </h3>
            {ADMIN_ITEMS.map(it=>(
              <Link
                key={it.href}
                href={it.href}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition
                  ${path===it.href
                    ? 'bg-gray-200 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <it.icon className="w-5 h-5"/>
                <span>{it.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        {/* HEADER mobile */}
        <header className="md:hidden flex items-center justify-between h-16 px-4 bg-white border-b">
          <span className="font-bold">Reportes</span>
          <Button variant="ghost" onClick={()=>setMenuOpen(v=>!v)}>
            {menuOpen ? <X size={24}/> : <MenuIcon size={24}/>}
          </Button>
        </header>

        {/* DRAWER mobile */}
        {menuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/25">
            <div className="fixed top-0 left-0 bottom-0 w-64 bg-white p-4">
              <div className="flex justify-between items-center mb-6">
                <span className="font-bold text-xl">Reportes</span>
                <Button variant="ghost" onClick={()=>setMenuOpen(false)}>
                  <X size={24}/>
                </Button>
              </div>
              <nav className="space-y-2">
                {NAV_ITEMS.map(it=>(
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={()=>setMenuOpen(false)}
                    className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 transition"
                  >
                    <it.icon className="w-5 h-5"/>
                    <span>{it.label}</span>
                  </Link>
                ))}
                <div className="mt-6 border-t pt-4 border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                    Administración
                  </h3>
                  {ADMIN_ITEMS.map(it=>(
                    <Link
                      key={it.href}
                      href={it.href}
                      onClick={()=>setMenuOpen(false)}
                      className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 transition"
                    >
                      <it.icon className="w-5 h-5"/>
                      <span>{it.label}</span>
                    </Link>
                  ))}
                </div>
              </nav>
            </div>
          </div>
        )}

        {/* MAIN */}
        <main className="flex-1 p-4 md:p-6 space-y-6">
  {/* Resumen cards: ahora 4 columnas en md+ */}
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    <Card className="bg-green-100 text-center">
      <CardContent>
        <h3 className="text-2xl font-bold">
          {prestamosFiltrados.length}
        </h3>
        <p>Préstamos Activos</p>
      </CardContent>
    </Card>
    <Card className="bg-blue-100 text-center">
      <CardContent>
        <h3 className="text-2xl font-bold">
          ${prestamosFiltrados
            .reduce((acc, p) => acc + (p.saldoCapital || 0), 0)
            .toFixed(2)}
        </h3>
        <p>Total Saldo Capital</p>
      </CardContent>
    </Card>
    <Card className="bg-yellow-100 text-center">
      <CardContent>
        <h3 className="text-2xl font-bold">
          ${prestamosFiltrados
            .reduce((acc, p) => acc + (p.interesesAcumulados || 0), 0)
            .toFixed(2)}
        </h3>
        <p>Total Intereses Acumulados</p>
      </CardContent>
    </Card>
    {/* Nueva tarjeta: suma de todos los intereses efectivamente pagados */}
    <Card className="bg-purple-100 text-center">
      <CardContent>
        <h3 className="text-2xl font-bold">
          ${Object.values(resumenPagos)
            .reduce((acc, r) => acc + r.interes, 0)
            .toFixed(2)}
        </h3>
        <p>Total Intereses Pagados</p>
      </CardContent>
    </Card>
  </div>
          {/* Filtro + export */}
          <Card>
            <CardContent className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
              <Input
                placeholder="Buscar Cliente"
                value={busquedaCliente}
                onChange={e=>setBusquedaCliente(e.target.value)}
                className="w-full md:w-1/3"
              />
              <div className="flex space-x-2">
                <Button onClick={exportarExcel}>Excel</Button>
                <Button onClick={exportarPDF}>PDF</Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de préstamos activos */}
          <Card>
            <CardHeader>
              <CardTitle>Préstamos Activos</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Cargando datos…</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table id="tablaReportes">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Saldo Capital</TableHead>
                        <TableHead>Intereses</TableHead>
                        <TableHead>Inicio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prestamosFiltrados
                        .slice((pagina-1)*porPagina, pagina*porPagina)
                        .map(p=>{
                          const cli = clientes.find(c=>c.id===p.clienteId);
                          return (
                            <TableRow key={p.id} className="hover:bg-gray-100">
                              <TableCell>{cli?.nombre||'–'}</TableCell>
                              <TableCell>${(p.saldoCapital||0).toFixed(2)}</TableCell>
                              <TableCell>${(p.interesesAcumulados||0).toFixed(2)}</TableCell>
                              <TableCell>{formatDateDisplay(p.fechaInicio)}</TableCell>
                            </TableRow>
                          );
                        })
                      }
                    </TableBody>
                  </Table>
                  <div className="flex justify-center items-center space-x-4 mt-4">
                    <Button onClick={pagPrev} disabled={pagina===1}>Anterior</Button>
                    <span>Página {pagina} de {totalPaginas}</span>
                    <Button onClick={pagNext} disabled={pagina===totalPaginas}>Siguiente</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resumen de ganancias */}
          <Card>
            <CardHeader>
              <CardTitle>Ganancias por Préstamo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Capital Pagado</TableHead>
                      <TableHead>Interés Pagado</TableHead>
                      <TableHead>Total Pagado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prestamosFiltrados.map(p=>{
                      const cli = clientes.find(c=>c.id===p.clienteId);
                      const r = resumenPagos[p.id]||{ capital:0, interes:0 };
                      return (
                        <TableRow key={p.id} className="hover:bg-gray-100">
                          <TableCell>{cli?.nombre||'–'}</TableCell>
                          <TableCell>${p.monto.toFixed(2)}</TableCell>
                          <TableCell>${r.capital.toFixed(2)}</TableCell>
                          <TableCell>${r.interes.toFixed(2)}</TableCell>
                          <TableCell>${(r.capital+r.interes).toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de préstamos finalizados */}
          <Card>
            <CardHeader>
              <CardTitle>Préstamos Finalizados</CardTitle>
            </CardHeader>
            <CardContent>
              {prestamosFinalizados.length === 0 ? (
                <p className="text-center">No hay préstamos finalizados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Inicio</TableHead>
                        <TableHead>Interés Pagado</TableHead>
                        <TableHead>Total Pagado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {prestamosFinalizados.map(p=>{
                        const cli = clientes.find(c=>c.id===p.clienteId);
                        const r = resumenPagos[p.id]||{ capital:0, interes:0 };
                        return (
                          <TableRow key={p.id} className="hover:bg-gray-100">
                            <TableCell>{cli?.nombre||'–'}</TableCell>
                            <TableCell>${p.monto.toFixed(2)}</TableCell>
                            <TableCell>{formatDateDisplay(p.fechaInicio)}</TableCell>
                            <TableCell>${r.interes.toFixed(2)}</TableCell>
                            <TableCell>${(r.capital+r.interes).toFixed(2)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        {/* bottom nav móvil */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t flex justify-around h-16">
          {NAV_ITEMS.map(it=>{
            const active = path===it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                className="flex flex-col items-center justify-center"
              >
                <it.icon size={20} className={active?'text-blue-500':'text-gray-400'} />
                <span className={`text-xs ${active?'text-blue-500':'text-gray-400'}`}>
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
