import { db } from '@/lib/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const carteraRef = doc(db, 'cartera', 'estado');
    const snap = await getDoc(carteraRef);
    if (!snap.exists()) {
      return NextResponse.json({ totalDisponible: 0 }); // Este campo es clave
    }
    return NextResponse.json(snap.data());
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener la cartera' }, { status: 500 });
  }
}
