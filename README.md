# Control de Asistencia (versión con servidor propio)

App de fichaje con QR fijo, PIN por empleado y panel de administrador.
A diferencia de la versión anterior, esta **no depende de Claude**: tiene su
propio servidor (Node.js + Express) que guarda los datos en un archivo
`data/db.json` en tu propio servidor.

## 1. Correrlo en tu computadora (VS Code)

Necesitás tener [Node.js](https://nodejs.org) instalado (versión 18 o
superior). Para chequear si ya lo tenés, abrí una terminal en VS Code
(`Ctrl + ñ` o menú Terminal → New Terminal) y escribí:

```bash
node -v
```

Si te muestra un número de versión, ya lo tenés. Si no, instalalo desde
nodejs.org (elegí la versión LTS).

Después, parado en esta carpeta (`control-asistencia-app`), corré:

```bash
npm install
npm start
```

Vas a ver un mensaje como:

```
Control de asistencia corriendo en http://localhost:3000
```

Abrí esa dirección en el navegador y probá la app. Mientras la dejes
corriendo así, solo vos (en tu misma computadora) podés acceder — todavía
no es un link que un celular externo pueda escanear.

## 2. Ponerlo en un hosting real (para que el QR funcione desde cualquier celular)

Para que el QR pegado en la pared funcione, necesitás que este servidor esté
corriendo en algún lugar con una dirección pública de internet (una URL
`https://...` fija). Algunas opciones simples, de más fácil a más avanzada:

### Opción recomendada: Render.com (gratis para empezar)
1. Creá una cuenta en https://render.com
2. Subí esta carpeta a un repositorio de GitHub (podés hacerlo desde VS Code
   con la pestaña de Control de código fuente).
3. En Render, creá un "New Web Service", conectalo a tu repositorio.
4. Build command: `npm install` — Start command: `npm start`
5. Render te va a dar una URL pública como `https://tu-app.onrender.com`.

**Importante sobre Render (plan gratuito):** el disco donde se guarda
`data/db.json` no es permanente en el plan free — si el servicio se reinicia
(pasa solo, por inactividad), puede perder los datos guardados. Si esto te
pasa, dos soluciones:
- Activar un "Persistent Disk" en Render (tiene costo, pero es barato).
- Migrar el guardado de `db.json` a una base de datos real (por ejemplo
  Postgres, que Render también ofrece con un plan gratuito con límite de
  tiempo). Si querés, puedo ayudarte a adaptar el código para eso.

### Otras opciones
- **Railway** (railway.app): similar a Render, con volúmenes persistentes.
- **Un VPS propio** (DigitalOcean, Hetzner, etc.): más control, pero necesitás
  configurar el servidor vos mismo (instalar Node, usar `pm2` para que el
  proceso quede corriendo, y un dominio o IP fija).

## 3. Generar el QR

Una vez que tengas la URL pública funcionando:
1. Abrí esa URL, entrá a **Administrador** (te va a pedir crear usuario y
   contraseña la primera vez).
2. Andá a la pestaña **Generar QR**, pegá esa misma URL pública y generá el
   código.
3. Descargalo o imprimilo y pegalo en la entrada.

## 4. Cómo funciona

- **Marcar**: el empleado escribe su nombre. Si es la primera vez, toca
  "Registrate acá" y elige un PIN de 4 dígitos. Los días siguientes, escribe
  su nombre y su PIN para marcar. El servidor decide solo si es entrada o
  salida.
- **Administrador**: usuario/contraseña propios (se configuran la primera
  vez que entrás). Desde ahí ves los empleados, los registros de entrada y
  salida con horas trabajadas, exportás a CSV, y generás el QR.

## 5. Seguridad

Los PIN y la contraseña de administrador se guardan con un hash SHA-256, no
en texto plano. Aun así, esto es un sistema simple pensado para uso interno
de un local o equipo chico, no un sistema de RRHH de nivel empresarial. Si
en algún momento necesitás algo más robusto (login por email, roles,
copias de seguridad automáticas), avisame y lo ampliamos.
