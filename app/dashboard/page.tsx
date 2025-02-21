"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Menu, X } from "lucide-react"; // Íconos para el menú
import Link from "next/link";

export default function DashboardPage() {
  const [menuOpen, setMenuOpen] = useState(false); // Estado para el menú hamburguesa

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Menú responsive */}
      <div className="bg-gray-800 text-white p-4 flex justify-between items-center md:hidden">
        <span className="text-lg font-semibold">Dashboard</span>
        <button onClick={() => setMenuOpen(!menuOpen)} className="focus:outline-none">
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Menú hamburguesa en móviles */}
      {menuOpen && (
        <div className="bg-gray-800 text-white flex flex-col p-4 space-y-2 md:hidden">
           <Link href="/" className="py-2 px-4 hover:bg-gray-700 rounded">Inicio</Link>
          <Link href="/clientes" className="py-2 px-4 hover:bg-gray-700 rounded">Clientes</Link>
          <Link href="/pagos" className="py-2 px-4 hover:bg-gray-700 rounded">Pagos</Link>
          <Link href="/reportes" className="py-2 px-4 hover:bg-gray-700 rounded">Reportes</Link>
        </div>
      )}

      {/* Menú en escritorio */}
      <div className="hidden md:flex justify-between bg-gray-800 text-white p-4 rounded-lg">
        <span className="text-lg font-semibold">Dashboard</span>
        <div className="flex space-x-4">
          <Link href="/" className="py-2 px-4 hover:bg-gray-700 rounded">Inicio</Link>
          <Link href="/clientes" className="py-2 px-4 hover:bg-gray-700 rounded">Clientes</Link>
          <Link href="/pagos" className="py-2 px-4 hover:bg-gray-700 rounded">Pagos</Link>
          <Link href="/reportes" className="py-2 px-4 hover:bg-gray-700 rounded">Reportes</Link>
        </div>
      </div>

      {/* Contenido del Dashboard */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center">Bienvenido al Dashboard</p>
        </CardContent>
      </Card>
    </div>
  );
}
