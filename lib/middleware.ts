import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/firebaseConfig";

/**
 * Middleware para proteger rutas de usuarios no autenticados.
 */
export async function middleware(request: NextRequest) {
  const user = auth.currentUser;

  const rutaProtegida = request.nextUrl.pathname.startsWith("/admin") ||
                        request.nextUrl.pathname.startsWith("/clientes") ||
                        request.nextUrl.pathname.startsWith("/prestamos") ||
                        request.nextUrl.pathname.startsWith("/reportes");

  if (rutaProtegida && !user) {
    return NextResponse.redirect(new URL("/login", request.url)); // Redirigir a login si no está autenticado
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/clientes/:path*", "/prestamos/:path*", "/reportes/:path*"],
};
