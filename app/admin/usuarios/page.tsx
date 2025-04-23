'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { Menu as MenuIcon, X, Home, Users, DollarSign, BarChart2, Settings } from 'lucide-react';
import { auth, db } from '@/lib/firebaseConfig';
import { obtenerRolDeUsuario } from '@/lib/auth';
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
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import { toast } from 'react-hot-toast';

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: 'Admin' | 'Gestor' | 'Usuario';
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

export default function UsuariosPage() {
  const router = useRouter();
  const path = usePathname();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [rol, setRol] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async user => {
      if (!user) {
        router.replace('/login');
      } else {
        const userRol = await obtenerRolDeUsuario();
        if (userRol !== 'Admin') {
          router.replace('/');
        } else {
          setRol(userRol);
          cargarUsuarios();
        }
      }
      setAuthChecked(true);
    });
  }, [router]);

  const cargarUsuarios = async () => {
    try {
      const snap = await getDocs(collection(db, 'usuarios'));
      console.log('🔥 usuarios encontrados:', snap.size);
      const lista = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Usuario));
      console.log(lista);
      setUsuarios(lista);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const cambiarRol = async (id: string, nuevoRol: Usuario['rol']) => {
    try {
      await updateDoc(doc(db, 'usuarios', id), { rol: nuevoRol });
      toast.success('Rol actualizado');
      cargarUsuarios();
    } catch (err) {
      console.error('Error al actualizar rol:', err);
      toast.error('Error al actualizar rol');
    }
  };

  const eliminarUsuario = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'usuarios', id));
      toast.success('Usuario eliminado');
      setUsuarios(u => u.filter(x => x.id !== id));
    } catch (err) {
      console.error('Error al eliminar usuario:', err);
      toast.error('Error al eliminar usuario');
    }
  };

  if (!authChecked) return null;
  if (!rol) return null;

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar desktop */}
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

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        {/* Header móvil */}
        <header className="md:hidden flex items-center justify-between h-16 px-4 bg-white border-b">
          <span className="font-bold">Gestión de Usuarios</span>
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
              <CardTitle>Gestión de Usuarios</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center">Cargando usuarios...</p>
              ) : usuarios.length === 0 ? (
                <p className="text-center">No hay usuarios registrados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usuarios.map(u => (
                        <TableRow key={u.id}>
                          <TableCell>{u.nombre}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>
                            <Select
                              defaultValue={u.rol}
                              onValueChange={v => cambiarRol(u.id, v as Usuario['rol'])}
                            >
                              <SelectTrigger>{u.rol}</SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Admin">Admin</SelectItem>
                                <SelectItem value="Gestor">Gestor</SelectItem>
                                <SelectItem value="Usuario">Usuario</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              onClick={() => eliminarUsuario(u.id)}
                            >
                              Eliminar
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
