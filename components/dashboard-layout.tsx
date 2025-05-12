'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  DollarSign,
  BarChart2,
  Settings,
  Menu as MenuIcon,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { href: '/',         icon: Home,        label: 'Inicio'       },
  { href: '/clientes', icon: Users,       label: 'Clientes'     },
  { href: '/pagos',    icon: DollarSign,  label: 'Pagos'        },
  { href: '/reportes', icon: BarChart2,   label: 'Reportes'     },
];

const ADMIN_ITEMS = [
  { href: '/admin/cartera',  icon: Settings,   label: 'Cartera'      },
  { href: '/admin/usuarios', icon: Users,      label: 'Usuarios'     },
  { href: '/devoluciones',   icon: DollarSign, label: 'Devoluciones' },
];

type Props = {
  title?: string;
  children: React.ReactNode;
};

export default function DashboardLayout({ title = 'Préstamos App', children }: Props) {
  const [mobileMenu, setMobileMenu] = useState(false);
  const path = usePathname();

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* SIDEBAR desktop */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r">
        <div className="h-16 flex items-center justify-center text-2xl font-bold border-b">
          {title}
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition
                ${path === item.href
                  ? 'bg-gray-200 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-100'}`}
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
          <span className="text-lg font-bold">{title}</span>
          <Button variant="ghost" onClick={() => setMobileMenu(v => !v)}>
            <MenuIcon size={24} />
          </Button>
        </header>

        {/* MENÚ móvil */}
        {mobileMenu && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/25">
            <div className="fixed top-0 left-0 bottom-0 w-64 bg-white p-4">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xl font-bold">{title}</span>
                <Button variant="ghost" onClick={() => setMobileMenu(false)}>
                  <X size={24} />
                </Button>
              </div>
              <nav className="space-y-2">
                {NAV_ITEMS.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenu(false)}
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
                      onClick={() => setMobileMenu(false)}
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

        {/* CONTENIDO */}
        <main className="flex-1 p-4 md:p-6">{children}</main>

        {/* NAV INFERIOR móvil */}
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
