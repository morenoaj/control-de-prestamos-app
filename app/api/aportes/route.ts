import { db } from "@/lib/firebaseConfig";
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  collection,
  getDocs
} from 'firebase/firestore';
import { NextResponse } from 'next/server';

// GET: devuelve todos los aportes, usando el campo `fecha` (string) directamente
export async function GET() {
  try {
    const snap = await getDocs(collection(db, 'aportes'));
    const aportes = snap.docs.map(d => {
      const data = d.data() as any;
      return {
        id: d.id,
        inversionistaNombre: data.inversionistaNombre || data.inversionistaId,
        monto: data.monto,
        porcentajeGanancia: data.porcentajeGanancia,
        fecha: data.fecha  // aquí es ya un string "YYYY-MM-DD"
      };
    });
    return NextResponse.json({ aportes });
  } catch (error) {
    console.error('Error fetching aportes:', error);
    return NextResponse.json({ error: 'Error fetching aportes' }, { status: 500 });
  }
}

// POST: registra un nuevo aporte, guardando la fecha como cadena
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { inversionistaId, monto, porcentajeGanancia, fecha } = body;

    if (!inversionistaId || !monto || !porcentajeGanancia || !fecha) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Validamos/formateamos la fecha recibida
    // Asegúrate de que venga en formato "YYYY-MM-DD"
    const fechaCadena = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(fecha)
      ? fecha
      : new Date().toISOString().split('T')[0];

    // Creamos el aporte con la fecha como string
    const aporteId = crypto.randomUUID();
    const aporteRef = doc(db, 'aportes', aporteId);
    await setDoc(aporteRef, {
      inversionistaId,
      monto: Number(monto),
      porcentajeGanancia: Number(porcentajeGanancia),
      fecha: fechaCadena,
      estado: 'activo'
    });

    // Actualizamos la cartera
    const carteraRef = doc(db, 'cartera', 'estado');
    const carteraSnap = await getDoc(carteraRef);
    if (!carteraSnap.exists()) {
      await setDoc(carteraRef, {
        totalDisponible: Number(monto),
        totalPrestado: 0,
        totalGananciaEstimado: 0
      });
    } else {
      await updateDoc(carteraRef, {
        totalDisponible: carteraSnap.data().totalDisponible + Number(monto)
      });
    }

    // Registramos también el movimiento, usando la misma fechaCadena
    const movRef = doc(db, 'movimientos', crypto.randomUUID());
    await setDoc(movRef, {
      tipo: 'entrada',
      monto: Number(monto),
      fecha: fechaCadena,
      origen: 'aporte',
      aporteId
    });

    return NextResponse.json({
      message: 'Aporte registrado con éxito',
      aporte: {
        id: aporteId,
        inversionistaId,
        monto: Number(monto),
        porcentajeGanancia: Number(porcentajeGanancia),
        fecha: fechaCadena,
        estado: 'activo'
      }
    });
  } catch (error) {
    console.error('Error en /api/aportes:', error);
    return NextResponse.json({ error: 'Error al registrar aporte' }, { status: 500 });
  }
}