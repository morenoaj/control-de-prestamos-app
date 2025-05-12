'use client';

import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import FormularioAporte from '@/components/formulario-aporte';

export default function PanelAdministracionPage() {
  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle>Panel de Administración</CardTitle>
        </CardHeader>
        <CardContent>
          <FormularioAporte />
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
