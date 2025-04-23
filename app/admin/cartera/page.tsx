'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu as MenuIcon, X, Home, Users, DollarSign, BarChart2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FormularioAporte from '@/components/formulario-aporte';

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

export default function PanelAdministracion() {
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* SIDEBAR desktop */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r">
        <div className="h-16 flex items-center justify-center font-bold border-b">
          Administración
        </div>
        <nav className="p-4 flex-1 space-y-2 overflow-y-auto">
          {NAV_ITEMS.map(it => (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition 
                ${path === it.href
                  ? 'bg-gray-200 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <it.icon className="w-5 h-5" />
              <span>{it.label}</span>
            </Link>
          ))}
          <div className="mt-6 border-t pt-4 border-gray-200">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Administración</h3>
            {ADMIN_ITEMS.map(it => (
              <Link
                key={it.href}
                href={it.href}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition 
                  ${path === it.href
                    ? 'bg-gray-200 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <it.icon className="w-5 h-5" />
                <span>{it.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        {/* HEADER mobile */}
        <header className="md:hidden flex items-center justify-between h-16 px-4 bg-white border-b">
          <span className="font-bold">Administración</span>
          <Button variant="ghost" onClick={() => setMenuOpen(v => !v)}>
            {menuOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </Button>
        </header>

        {/* DRAWER mobile */}
        {menuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/25">
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
                  <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Administración</h3>
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

        {/* MAIN */}
        <main className="flex-1 p-4 md:p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Panel de Administración</CardTitle>
            </CardHeader>
            <CardContent>
              <FormularioAporte />
            </CardContent>
          </Card>
        </main>

        {/* bottom nav móvil */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t flex justify-around h-16">
          {NAV_ITEMS.map(it => {
            const active = path === it.href;
            return (
              <Link key={it.href} href={it.href} className="flex flex-col items-center justify-center">
                <it.icon size={20} className={active ? 'text-blue-500' : 'text-gray-400'} />
                <span className={`text-xs ${active ? 'text-blue-500' : 'text-gray-400'}`}>{it.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
