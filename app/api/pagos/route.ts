import { db } from "@/lib/firebaseConfig";
import { doc, getDoc, updateDoc, setDoc, Timestamp, collection } from "firebase/firestore";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prestamoId, montoCapital, montoInteres, fechaPago } = await req.json();

    const pagoId = crypto.randomUUID();

    // 1. Guardar el pago
    await setDoc(doc(db, "pagos", pagoId), {
      prestamoId,
      montoCapital,
      montoInteres,
      fechaPago,
      createdAt: Timestamp.now()
    });

    // 2. Actualizar la cartera
    const carteraRef = doc(db, "cartera", "estado");
    const carteraSnap = await getDoc(carteraRef);
    if (carteraSnap.exists()) {
      const data = carteraSnap.data();
      await updateDoc(carteraRef, {
        totalDisponible: data.totalDisponible + montoCapital,
        totalGananciaEstimado: data.totalGananciaEstimado + montoInteres
      });
    }

    // 3. Registrar movimiento de entrada
    await setDoc(doc(db, "movimientos", crypto.randomUUID()), {
      tipo: "entrada",
      fecha: Timestamp.now(),
      origen: "pago",
      prestamoId,
      montoCapital,
      montoInteres
    });

    return NextResponse.json({ message: "Pago registrado correctamente" });
  } catch (error) {
    console.error("Error al registrar el pago:", error);
    return NextResponse.json({ error: "Error al registrar el pago" }, { status: 500 });
  }
}
