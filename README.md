# Control de Préstamos App

> Plataforma web para la gestión integral de préstamos personales, pagos e inversiones.

![Image](https://github.com/user-attachments/assets/3c5c761a-190e-4e04-9b7c-b249770d61eb)


---

## 📌 Descripción

Control de Préstamos App, desarrollado con Next.js y TypeScript, ofrece:

- Autenticación segura con Google o email/contraseña.  
- Gestión de clientes y préstamos.  
- Registro y aplicación de pagos a capital e intereses.  
- Control de aportes y devoluciones a inversionistas.  
- Reportes exportables en Excel y PDF.  

---

## 🚀 Módulos

### 🔒 Login  
![Image](https://github.com/user-attachments/assets/30b542f7-76e4-4f1f-911d-bcb5b7230f9e)
Inicia sesión con Google o email/contraseña y restablece tu clave si es necesario.

### 📊 Inicio (Dashboard)  
![Image](https://github.com/user-attachments/assets/3c5c761a-190e-4e04-9b7c-b249770d61eb)
Visión general con métricas clave: clientes, préstamos activos, capital prestado y recuperado, intereses generados, ratio de recuperación y tendencias.

### 👥 Clientes - 💰 Préstamos
![Image](https://github.com/user-attachments/assets/4501feb6-3532-49f1-b4dd-f22b55fc40e3) 
👥 Registro, edición y búsqueda de clientes. Incluye reporte detallado de préstamos e intereses por cliente.<br>💰 Alta de nuevos préstamos, selección de cliente, fecha, monto y método de pago. Muestra saldo disponible en cartera.

### 💵 Pagos  
![Image](https://github.com/user-attachments/assets/b108ee92-814c-4569-92e6-01903ae241fd)
Registro de pagos a capital e intereses, asignación a préstamos existentes y actualización de saldos.

### 📋 Reportes  
![Image](https://github.com/user-attachments/assets/5e1b35b4-3cbf-4ab0-92ba-cf6b5ed67300) 
Resumen global de préstamos activos, saldos, intereses y exportación de datos en Excel o PDF.

### 📂 Cartera  
![Image](https://github.com/user-attachments/assets/4bc4d201-b81c-4862-8aa4-d63983b2f45d)  
Control de aportes de inversionistas: tendencia, registro de nuevos aportes y visualización de ganancias estimadas.

### 👤 Usuarios  
![Image](https://github.com/user-attachments/assets/527d6de5-9e7c-4303-a942-1a4e350317da) 
Gestión de cuentas y roles (Admin/Usuario). Permite crear, asignar roles y eliminar usuarios.

### 🔄 Devoluciones  
![Image](https://github.com/user-attachments/assets/129daad2-5aae-41d8-a5ea-52d90f47b712)
Proceso de devolución de capital e intereses a inversionistas y seguimiento histórico de transacciones.

---

## ⚙️ Instalación y uso

1. Clona el repositorio:

```bash
git clone https://github.com/tu-usuario/control-de-prestamos-app.git
cd control-de-prestamos-app
```

2. Instala dependencias:

```bash
npm install
# o yarn install
# o pnpm install
```

3. Ejecuta en modo desarrollo:

```bash
npm run dev
```

4. Abre tu navegador en:

```
http://localhost:3000
```

---

## 🗂 Estructura del proyecto

```
control-de-prestamos-app/
├─ app/                  # Rutas, layouts y pages de Next.js
├─ components/           # Componentes reutilizables
├─ context/              # Firebase, Auth y contexto global
├─ hooks/                # Hooks personalizados
├─ public/               # Imágenes y assets estáticos
└─ styles/               # Tailwind CSS y módulos de estilo
```

---

## 📚 Tecnologías

- Next.js 14  
- TypeScript  
- Firebase (Auth, Firestore)  
- Tailwind CSS  
- React Context  
- Recharts para gráficos  

---

## 🤝 Cómo contribuir

1. Haz fork del repositorio.  
2. Crea una rama:
```bash
git checkout -b feature/tu-funcionalidad
```
3. Realiza cambios y haz commit:
```bash
git commit -m "feat: descripción breve"
```
4. Empuja tu rama y abre un Pull Request.

---

## 📝 Licencia

Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más información.

---

## 📫 Contacto

- **Autor:** Alex Moreno  
- **Email:** [morenoaj1@outlook.com](mailto:morenoaj1@outlook.com)  
- **LinkedIn:** [morenoaj1](https://linkedin.com/in/morenoaj1)  
- **Instagram:** [@morenoaj.dev](https://instagram.com/morenoaj.dev)
- **Web:** [morenoaj.github.io](https://morenoaj.github.io/)

---

¡Gracias por usar Control de Préstamos App! 🚀
