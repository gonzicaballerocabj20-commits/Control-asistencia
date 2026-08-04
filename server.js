const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- almacenamiento en archivo JSON ----------
function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = { empleados: [], registros: [], admin: null };
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}
function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}
function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function todayStr(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function checkAdmin(req) {
  const db = loadDB();
  if (!db.admin) return false;
  const user = req.headers['x-admin-user'];
  const pass = req.headers['x-admin-pass'];
  if (!user || !pass) return false;
  return user === db.admin.user && hash(pass) === db.admin.passHash;
}

// ================= RUTAS PÚBLICAS (pantalla Marcar) =================

// Registrar un empleado nuevo y marcar su entrada
app.post('/api/registro', (req, res) => {
  const { nombre, pin } = req.body || {};
  if (!nombre || !/^\d{4}$/.test(pin || '')) {
    return res.status(400).json({ error: 'Nombre o PIN inválido (el PIN debe ser de 4 números).' });
  }
  const db = loadDB();
  if (db.empleados.some(e => e.nombre.toLowerCase() === nombre.toLowerCase())) {
    return res.status(409).json({ error: 'Ya existe un empleado con ese nombre.' });
  }
  const max = db.empleados.reduce((m, e) => Math.max(m, parseInt(e.codigo || '0', 10) || 0), 0);
  const emp = { id: uid(), nombre, codigo: String(max + 1).padStart(4, '0'), pinHash: hash(pin) };
  db.empleados.push(emp);
  const now = new Date();
  db.registros.push({ id: uid(), empleadoId: emp.id, nombre: emp.nombre, fecha: todayStr(now), entrada: now.toISOString(), salida: null });
  saveDB(db);
  res.json({ ok: true, accion: 'entrada', hora: now.toISOString(), nombre: emp.nombre });
});

// Marcar entrada o salida (el servidor decide cuál corresponde)
app.post('/api/marcar', (req, res) => {
  const { nombre, pin } = req.body || {};
  const db = loadDB();
  const emp = db.empleados.find(e => e.nombre.toLowerCase() === (nombre || '').toLowerCase());
  if (!emp || hash(pin || '') !== emp.pinHash) {
    return res.status(401).json({ error: 'Nombre o PIN incorrecto.' });
  }
  const now = new Date();
  const abierto = db.registros
    .filter(r => r.empleadoId === emp.id && !r.salida)
    .sort((a, b) => new Date(b.entrada) - new Date(a.entrada))[0];
  let accion;
  if (abierto) {
    abierto.salida = now.toISOString();
    accion = 'salida';
  } else {
    db.registros.push({ id: uid(), empleadoId: emp.id, nombre: emp.nombre, fecha: todayStr(now), entrada: now.toISOString(), salida: null });
    accion = 'entrada';
  }
  saveDB(db);
  res.json({ ok: true, accion, hora: now.toISOString(), nombre: emp.nombre });
});

// Lista de nombres para el autocompletado (sin datos sensibles)
app.get('/api/empleados-publico', (req, res) => {
  const db = loadDB();
  res.json(db.empleados.map(e => ({ nombre: e.nombre })));
});

// Quiénes están presentes ahora (entrada sin salida, de hoy)
app.get('/api/presentes', (req, res) => {
  const db = loadDB();
  const hoy = todayStr();
  const abiertos = db.registros.filter(r => !r.salida && r.fecha === hoy);
  res.json(abiertos.map(r => ({ nombre: r.nombre, entrada: r.entrada })));
});

// ================= RUTAS DE ADMINISTRADOR =================

app.post('/api/admin/login', (req, res) => {
  const { user, pass } = req.body || {};
  if (!user || !pass) return res.status(400).json({ error: 'Completá usuario y contraseña.' });
  const db = loadDB();
  if (!db.admin) {
    db.admin = { user, passHash: hash(pass) };
    saveDB(db);
    return res.json({ ok: true, created: true });
  }
  if (user === db.admin.user && hash(pass) === db.admin.passHash) {
    return res.json({ ok: true, created: false });
  }
  res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
});

app.get('/api/admin/empleados', (req, res) => {
  if (!checkAdmin(req)) return res.status(401).json({ error: 'No autorizado.' });
  const db = loadDB();
  res.json(db.empleados.map(e => ({ id: e.id, nombre: e.nombre, codigo: e.codigo })));
});

app.delete('/api/admin/empleados/:id', (req, res) => {
  if (!checkAdmin(req)) return res.status(401).json({ error: 'No autorizado.' });
  const db = loadDB();
  db.empleados = db.empleados.filter(e => e.id !== req.params.id);
  saveDB(db);
  res.json({ ok: true });
});

app.get('/api/admin/registros', (req, res) => {
  if (!checkAdmin(req)) return res.status(401).json({ error: 'No autorizado.' });
  const db = loadDB();
  res.json(db.registros);
});

app.listen(PORT, () => {
  console.log('Control de asistencia corriendo en http://localhost:' + PORT);
});
