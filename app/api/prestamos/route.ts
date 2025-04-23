import { db } from '@/lib/firebaseConfig';
import { doc, getDoc, updateDoc, addDoc, collection, Timestamp, setDoc } from 'firebase/firestore';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { clienteId, fechaInicio, monto, metodoPago } = await req.json();
    const montoFloat = parseFloat(monto);

    if (!clienteId || !fechaInicio || !montoFloat || !metodoPago) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios' }, { status: 400 });
    }

    // 1. Verificar saldo en la cartera
    const carteraRef = doc(db, 'cartera', 'estado');
    const carteraSnap = await getDoc(carteraRef);

    if (!carteraSnap.exists()) {
      return NextResponse.json({ error: 'No se ha inicializado la cartera' }, { status: 404 });
    }

    const carteraData = carteraSnap.data();
    if (carteraData.totalDisponible < montoFloat) {
      return NextResponse.json({ error: 'Fondos insuficientes en la cartera' }, { status: 400 });
    }

    // 2. Registrar el préstamo
    const nuevoPrestamo = {
      clienteId,
      fechaInicio,
      monto: montoFloat,
      metodoPago,
      tasaInteres: 0.15, // ejemplo
      estado: 'activo',
      creadoEn: Timestamp.now()
    };
    const prestamoRef = await addDoc(collection(db, 'prestamos'), nuevoPrestamo);

    // 3. Actualizar la cartera
    await updateDoc(carteraRef, {
      totalDisponible: carteraData.totalDisponible - montoFloat,
      totalPrestado: carteraData.totalPrestado + montoFloat
    });

    // 4. Registrar el movimiento
    const movRef = doc(db, 'movimientos', crypto.randomUUID());
    await setDoc(movRef, {
      tipo: 'salida',
      monto: montoFloat,
      fecha: Timestamp.now(),
      origen: 'prestamo',
      prestamoId: prestamoRef.id
    });

    return NextResponse.json({ message: 'Préstamo registrado correctamente' });
  } catch (error) {
    console.error('Error al registrar préstamo:', error);
    return NextResponse.json({ error: 'Error interno al registrar préstamo' }, { status: 500 });
  }
}
