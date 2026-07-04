# RENKAR - Base de datos para produccion

La aplicacion usa PostgreSQL en produccion cuando existe la variable `DATABASE_URL`.
Si no existe `DATABASE_URL`, usa el archivo local `server/data/db.json` solo para desarrollo.

## Recomendado

Usa PostgreSQL administrado en un proveedor como Supabase, Neon, Railway o Render.

## Ruta rapida para publicar hoy

Recomendacion simple:

1. Compra el dominio en Namecheap o Porkbun.
2. Publica la app en Render como Web Service de Node.js.
3. Crea PostgreSQL administrado en Render, Neon o Supabase.
4. Configura las variables de `.env.production.example`.
5. Ejecuta `server/schema.sql` en la base de datos.
6. Agrega el dominio al servicio web y apunta el DNS.

Render es la opcion mas sencilla si quieres tener hosting y base de datos en un solo lugar. Si esperas mucho trafico desde el primer dia, usa base PostgreSQL pagada, no gratuita.

## Variables necesarias

```env
NODE_ENV=production
DATABASE_URL=postgresql://usuario:password@host:5432/base_de_datos
JWT_SECRET=clave_larga_privada_minimo_32_caracteres_para_firmar_sesiones
CORS_ORIGINS=https://tudominio.com,https://www.tudominio.com
TELEGRAM_BOT_TOKEN=token_del_bot
TELEGRAM_CHAT_ID=id_grupo_recargas
TELEGRAM_WITHDRAWALS_CHAT_ID=id_grupo_retiros
ALLOW_PRODUCTION_RESET=false
ENABLE_JSON_BACKUPS=true
BACKUP_INTERVAL_HOURS=6
MAX_VOUCHER_MB=5
UPLOADS_DIR=/var/data/uploads
```

## Base de datos

Antes de publicar, ejecuta `server/schema.sql` en tu PostgreSQL de produccion. El backend tambien intenta crear las tablas automaticamente, pero correr el schema manualmente te permite verificar permisos, indices y restricciones antes de recibir usuarios.

## Como funciona

El backend crea automaticamente tablas reales para usuarios, planes, recargas, retiros, inversiones, movimientos, referidos, codigos de regalo, canjes, cuentas de pago, mensajes de soporte y logs administrativos.

Tambien crea indices para busquedas por usuario, estado y fecha.

Las imagenes de vouchers se guardan como archivos en `server/uploads/vouchers`; la base de datos solo guarda la ruta del archivo.

Las contrasenas nuevas se guardan cifradas con `scrypt`. Las sesiones usan token firmado tipo JWT mediante `JWT_SECRET`.

Si `ENABLE_JSON_BACKUPS=true`, la app crea respaldos JSON periodicos en `server/backups`. Aun asi, activa tambien los backups automaticos del proveedor PostgreSQL.

## Importante

No actives `ALLOW_PRODUCTION_RESET=true` en produccion. Esa opcion permite resetear datos y solo debe usarse en pruebas.

No publiques sin `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET` y `CORS_ORIGINS`. Sin esas variables, el entorno no debe considerarse listo para usuarios reales.

## Comandos de despliegue

Build command:

```bash
npm install && npm run build
```

Start command:

```bash
npm start
```

## Dominio y DNS

Cuando el hosting te entregue el dominio temporal, agrega tu dominio personalizado en el panel del proveedor. Luego en Namecheap/Porkbun configura:

- `CNAME` para `www` apuntando al host que te indique Render/Railway.
- `A` o `ALIAS/ANAME` para el dominio raiz, segun indique el proveedor.

Despues de configurar DNS, espera la propagacion. Normalmente puede tardar minutos, aunque a veces varias horas.
