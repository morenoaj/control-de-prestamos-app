import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Users, FileText, CreditCard } from "lucide-react";

const menuItems = [
  { href: "/clientes", label: "Gestión de Clientes", icon: <Users /> },
  { href: "/pagos", label: "Registro de Pagos", icon: <CreditCard /> },
  { href: "/reportes", label: "Reportes", icon: <FileText /> },
  { href: "/dashboard", label: "Dashboard", icon: <Home /> }
];

export default function Menu() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Menú</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {menuItems.map(({ href, label, icon }) => (
            <Link key={href} href={href}>
              <Button className="w-full flex items-center gap-2">
                {icon} {label}
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
