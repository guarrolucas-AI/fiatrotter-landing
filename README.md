# Rotter — Digital Campaigns Performance Dashboard

Dashboard de campañas digitales (Meta Ads + Google Ads) desplegado en Vercel.

---

## Setup en 4 pasos

### 1. Instalar dependencias

```bash
cd rotter-dashboard
npm install
```

### 2. Configurar variables de entorno

Copiá el archivo de ejemplo:

```bash
cp .env.local.example .env.local
```

Editá `.env.local` y completá:

```
META_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxx   ← tu token de larga duración
META_AD_ACCOUNT_ID=act_1234567890      ← ID de tu cuenta de anuncios
```

**¿Cómo obtengo el token de Meta?**
1. Ir a https://developers.facebook.com/tools/explorer/
2. Seleccionar tu app (o crear una nueva)
3. Agregar el permiso `ads_read`
4. Generar token y convertirlo a long-lived token (dura 60 días)
   → https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived

**¿Cómo encuentro el Ad Account ID?**
1. Ir a Meta Business Manager → Cuentas de anuncio
2. El ID tiene el formato `1234567890123456`
3. Agregá el prefijo `act_`: `act_1234567890123456`

### 3. Probar en local

```bash
npm run dev
```

Abrí http://localhost:3000

### 4. Deploy en Vercel

**Opción A — GitHub (recomendado)**
1. Subí este proyecto a un repositorio GitHub
2. Ir a https://vercel.com/new
3. Importar el repositorio
4. En "Environment Variables", agregar:
   - `META_ACCESS_TOKEN` = tu token
   - `META_AD_ACCOUNT_ID` = act_XXXXXXXXX
5. Click en **Deploy**

**Opción B — Vercel CLI**
```bash
npm i -g vercel
vercel --prod
# El CLI te pedirá las variables de entorno
```

---

## Actualización de datos

Los datos se actualizan **automáticamente cada hora** gracias al cache de Next.js (`revalidate: 3600`). No necesitás hacer nada extra — cada vez que alguien visita el dashboard, si pasó más de 1 hora, Vercel regenera la página con datos frescos de la API.

Para forzar una actualización inmediata: redeploy en Vercel (desde el dashboard o `vercel --prod`).

---

## Configuración Google Ads (opcional)

La integración con Google Ads requiere algunos pasos adicionales:

1. Solicitar un **Developer Token** en Google Ads API Center
2. Crear credenciales OAuth2 en Google Cloud Console
3. Generar un **Refresh Token** usando OAuth2 Playground

Una vez tengas las credenciales, agregá estas variables en Vercel:

```
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_REFRESH_TOKEN=
GOOGLE_ADS_CUSTOMER_ID=
```

---

## Renovar el token de Meta cada 60 días

Los tokens de larga duración de Meta expiran a los 60 días. Para renovarlos:

1. Ir a https://developers.facebook.com/tools/explorer/
2. Generar nuevo token con `ads_read`
3. Actualizar la variable `META_ACCESS_TOKEN` en Vercel → Settings → Environment Variables
4. Hacer redeploy

---

## Estructura del proyecto

```
rotter-dashboard/
├── app/
│   ├── layout.jsx        # Layout base
│   ├── page.jsx          # Página principal (server component)
│   └── globals.css       # Estilos globales
├── components/
│   └── Dashboard.jsx     # UI del dashboard (client component)
├── lib/
│   └── meta.js           # Integración Meta Ads API
├── .env.local.example    # Template de variables de entorno
└── README.md             # Este archivo
```
