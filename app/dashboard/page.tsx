"use client";

import Menu from "@/components/menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-6">
      <Menu /> {/* Menú Modular */}

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
