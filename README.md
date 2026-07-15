# AgendaBot — Panel (admin + profesional)

Frontend en React (Vite) para el panel administrativo y el panel del profesional
de AgendaBot. Consume la API ya desplegada en Render (`agendabot-backend`).

## Qué incluye esta primera versión

- Login contra `POST /auth/login`, con validación de sesión contra `GET /auth/me`
- Sesión persistida en `localStorage` (token JWT + datos del usuario)
- Enrutamiento protegido por rol:
  - `ADMIN` / `RECEPCION` → `/admin` (dashboard, agenda del día, chats en vivo, lista de espera)
  - `PROFESIONAL` → `/profesional` (mi agenda, mi disponibilidad)
- Layout compartido (sidebar + cierre de sesión) para ambos paneles
- Las secciones internas son **placeholders** por ahora — se construyen en el
  siguiente paso, una vez que el backend tenga los endpoints de datos
  (citas, lista de espera, conversaciones, disponibilidad).

## Desarrollo local

```bash
npm install
cp .env.example .env   # ajusta VITE_API_URL si tu backend corre en otro lado
npm run dev
```

## Crear un usuario para probar el login

Desde el repo del backend (`agendabot-backend`):

```bash
node scripts/crear-usuario.js <empresaId> "Tu Nombre" tu@email.cl "unaClaveSegura" ADMIN
```

Para un profesional, agrega el `recursoAgendableId` al final del comando.

## Desplegar en Render (Static Site)

1. Sube este proyecto a un repo de GitHub (ej. `agendabot-panel`).
2. En Render: **New → Static Site**, conecta el repo.
3. Build command: `npm install && npm run build`
4. Publish directory: `dist`
5. Variable de entorno: `VITE_API_URL` = URL del backend
   (`https://agendabot-backend-bbw5.onrender.com`)
6. Una vez desplegado, copia la URL del Static Site (ej.
   `https://agendabot-panel.onrender.com`) y agrégala como
   `PANEL_FRONTEND_URL` en las variables de entorno del **backend**
   en Render, para que el CORS deje pasar las peticiones del panel.

## Próximo paso

Construir los endpoints de datos en el backend (agenda del día, lista de
espera, conversaciones, disponibilidad/bloqueos del profesional) y conectar
cada placeholder a su endpoint real.
