'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { db, auth } from "@/lib/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { obtenerRolDeUsuario } from "@/lib/auth";
import { toast } from "react-hot-toast";
import Link from "next/link";
import {
  Menu as MenuIcon,
  X,
  Home,
  Users,
  DollarSign,
  BarChart2,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import ClienteForm from "@/components/clienteform";
import PrestamoForm from "@/components/prestamoform";

interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
}

const NAV_ITEMS = [
  { href: "/",         icon: Home,        label: "Inicio"    },
  { href: "/clientes", icon: Users,       label: "Clientes"  },
  { href: "/pagos",    icon: DollarSign,  label: "Pagos"     },
  { href: "/reportes", icon: BarChart2,   label: "Reportes"  },
];

const ADMIN_ITEMS = [
  { href: "/admin/cartera",  icon: Settings,  label: "Cartera"      },
  { href: "/admin/usuarios", icon: Users,     label: "Usuarios"     },
  { href: "/devoluciones",   icon: DollarSign,label: "Devoluciones"},
];

export default function ClientesPage() {
  const router = useRouter();
  const path = usePathname();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [rol, setRol] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) {
        router.replace("/login");
        return;
      }
      const userRol = await obtenerRolDeUsuario();
      if (userRol !== "Admin" && userRol !== "Gestor") {
        router.replace("/");
        return;
      }
      setRol(userRol);
      cargarClientes();
      setAuthChecked(true);
    });
    return () => unsub();
  }, [router]);

  const cargarClientes = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, "clientes"));
      setClientes(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } catch (err) {
      toast.error("Error al obtener clientes");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  if (!authChecked || !rol) return null;

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* SIDEBAR escritorio */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r">
        <div className="h-16 flex items-center justify-center text-2xl font-bold border-b">
          Clientes
        </div>
        <nav className="p-4 flex-1 space-y-2 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition
                ${path === item.href
                  ? "bg-gray-200 text-gray-900"
                  : "text-gray-600 hover:bg-gray-100"}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
          <div className="mt-6 border-t pt-4 border-gray-200">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
              Administración
            </h3>
            {ADMIN_ITEMS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition
                  ${path === item.href
                    ? "bg-gray-200 text-gray-900"
                    : "text-gray-600 hover:bg-gray-100"}`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </aside>

      {/* CONTENEDOR principal */}
      <div className="flex-1 flex flex-col">
        {/* HEADER móvil */}
        <header className="md:hidden flex items-center justify-between h-16 px-4 bg-white border-b">
          <span className="text-lg font-bold">Clientes</span>
          <Button variant="ghost" onClick={() => setMenuOpen(v => !v)}>
            {menuOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </Button>
        </header>

        {/* DRAWER móvil */}
        {menuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/25">
            <div className="fixed top-0 left-0 bottom-0 w-64 bg-white p-4">
              <div className="flex justify-between items-center mb-6">
                <span className="text-xl font-bold">Clientes</span>
                <Button variant="ghost" onClick={() => setMenuOpen(false)}>
                  <X size={24} />
                </Button>
              </div>
              <nav className="space-y-2">
                {NAV_ITEMS.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 transition"
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}
                <div className="mt-6 border-t pt-4 border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                    Administración
                  </h3>
                  {ADMIN_ITEMS.map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 transition"
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </nav>
            </div>
          </div>
        )}

        {/* CONTENIDO PARA CLIENTES */}
        <main className="flex-1 p-4 md:p-6">
          {/* Formularios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <ClienteForm actualizarClientes={cargarClientes} />
            <PrestamoForm clientes={clientes} actualizarClientes={cargarClientes} />
          </div>

          {/* Tabla */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center">Cargando...</p>
              ) : clientes.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table className="w-full text-sm md:text-base">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Teléfono</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientes.map(c => (
                        <TableRow key={c.id}>
                          <TableCell>{c.nombre}</TableCell>
                          <TableCell>{c.telefono}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center">No hay clientes registrados</p>
              )}
            </CardContent>
          </Card>
        </main>

        {/* NAV inferior móvil */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around h-16">
          {NAV_ITEMS.map(item => {
            const active = path === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center"
              >
                <item.icon
                  size={20}
                  className={active ? "text-blue-500" : "text-gray-400"}
                />
                <span className={`text-xs ${active ? "text-blue-500" : "text-gray-400"}`}>
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
