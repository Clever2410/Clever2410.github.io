const DB_NAME = "ElBuenPaladarDB";
const DB_VERSION = 1;
let db;

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("usuarios")) {
        db.createObjectStore("usuarios", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("pedidos")) {
        const pedidos = db.createObjectStore("pedidos", { keyPath: "id", autoIncrement: true });
        pedidos.createIndex("usuarioId", "usuarioId", { unique: false });
      }
    };

    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };

    request.onerror = (e) => reject(e.target.error);
  });
}

function tx(name, mode = "readonly") {
  if (!db) throw new Error("DB no inicializada aún");
  return db.transaction(name, mode).objectStore(name);
}

async function addUsuario(nombre, descripcion) {
  return new Promise((resolve, reject) => {
    const store = tx("usuarios", "readwrite");
    const req = store.add({ nombre, descripcion });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function updateUsuario(id, nombre, descripcion) {
  return new Promise((resolve, reject) => {
    const store = tx("usuarios", "readwrite");
    const reqGet = store.get(id);
    reqGet.onsuccess = () => {
      const data = reqGet.result;
      data.nombre = nombre;
      data.descripcion = descripcion;
      const reqPut = store.put(data);
      reqPut.onsuccess = resolve;
      reqPut.onerror = () => reject(reqPut.error);
    };
  });
}

async function getUsuarios() {
  return new Promise((resolve, reject) => {
    const req = tx("usuarios").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function deleteUsuario(id) {
  return new Promise((resolve, reject) => {
    const store = tx("usuarios", "readwrite");
    const req = store.delete(id);
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
}

async function addPedido(plato, descripcion, usuarioId) {
  return new Promise((resolve, reject) => {
    const store = tx("pedidos", "readwrite");
    const req = store.add({ plato, descripcion, usuarioId });
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
}

async function updatePedido(id, plato, descripcion, usuarioId) {
  return new Promise((resolve, reject) => {
    const store = tx("pedidos", "readwrite");
    const reqGet = store.get(id);
    reqGet.onsuccess = () => {
      const data = reqGet.result;
      data.plato = plato;
      data.descripcion = descripcion;
      data.usuarioId = usuarioId;
      const reqPut = store.put(data);
      reqPut.onsuccess = resolve;
      reqPut.onerror = () => reject(reqPut.error);
    };
  });
}

async function getPedidos() {
  return new Promise((resolve, reject) => {
    const req = tx("pedidos").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function deletePedido(id) {
  return new Promise((resolve, reject) => {
    const store = tx("pedidos", "readwrite");
    const req = store.delete(id);
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
}

let usuarioEditId = null;
let pedidoEditId = null;

async function renderUsuarios() {
  const lista = document.getElementById("lista-usuarios");
  const select = document.getElementById("pedido-usuario");
  lista.innerHTML = "";
  select.innerHTML = '<option value="">Seleccionar Usuario</option>';

  const usuarios = await getUsuarios();

  if (usuarios.length === 0) {
    lista.innerHTML = "<p>No hay usuarios registrados</p>";
    return;
  }

  usuarios.forEach((u) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <b>${u.nombre}</b> - ${u.descripcion}
      <div class="item-actions">
        <button class="btn small" onclick="startEditUsuario(${u.id}, '${u.nombre}', '${u.descripcion}')">✏️</button>
        <button class="btn small" onclick="deleteUsuario(${u.id}).then(loadData)">🗑️</button>
      </div>
    `;
    lista.appendChild(div);

    const opt = document.createElement("option");
    opt.value = u.id;
    opt.textContent = u.nombre;
    select.appendChild(opt);
  });
}

async function renderPedidos() {
  const lista = document.getElementById("lista-pedidos");
  lista.innerHTML = "";
  const pedidos = await getPedidos();
  const usuarios = await getUsuarios();

  if (pedidos.length === 0) {
    lista.innerHTML = "<p>No hay pedidos registrados</p>";
    return;
  }

  pedidos.forEach((p) => {
    const usuario = usuarios.find((u) => u.id === p.usuarioId);
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <b>${p.plato}</b> - ${p.descripcion}
      <small>(${usuario ? usuario.nombre : "Sin usuario"})</small>
      <div class="item-actions">
        <button class="btn small" onclick="startEditPedido(${p.id}, '${p.plato}', '${p.descripcion}', ${p.usuarioId || 0})">✏️</button>
        <button class="btn small" onclick="deletePedido(${p.id}).then(loadData)">🗑️</button>
      </div>
    `;
    lista.appendChild(div);
  });
}

function startEditUsuario(id, nombre, descripcion) {
  usuarioEditId = id;
  document.getElementById("usuario-nombre").value = nombre;
  document.getElementById("usuario-descripcion").value = descripcion;
  document.getElementById("usuario-guardar").style.display = "inline-block";
}

function startEditPedido(id, plato, descripcion, usuarioId) {
  pedidoEditId = id;
  document.getElementById("pedido-plato").value = plato;
  document.getElementById("pedido-descripcion").value = descripcion;
  document.getElementById("pedido-usuario").value = usuarioId;
  document.getElementById("pedido-agregar").textContent = "GUARDAR CAMBIOS";
}

async function loadData() {
  await renderUsuarios();
  await renderPedidos();
}

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("acc-btn")) {
    const panel = e.target.nextElementSibling;
    const open = panel.style.display === "block";
    document.querySelectorAll(".acc-panel").forEach((p) => (p.style.display = "none"));
    if (!open) panel.style.display = "block";
  }
});

openDB().then(() => {
  const guardarBtn = document.getElementById("usuario-guardar");
  guardarBtn.style.display = "none";

  document.getElementById("usuario-agregar").onclick = async () => {
    const n = document.getElementById("usuario-nombre").value.trim();
    const d = document.getElementById("usuario-descripcion").value.trim();
    if (!n) return alert("⚠️ Nombre requerido");
    if (usuarioEditId) {
      await updateUsuario(usuarioEditId, n, d);
      usuarioEditId = null;
      guardarBtn.style.display = "none";
    } else {
      await addUsuario(n, d);
    }
    document.getElementById("usuario-nombre").value = "";
    document.getElementById("usuario-descripcion").value = "";
    await loadData();
  };

  document.getElementById("pedido-agregar").onclick = async () => {
    const p = document.getElementById("pedido-plato").value.trim();
    const d = document.getElementById("pedido-descripcion").value.trim();
    const u = Number(document.getElementById("pedido-usuario").value);
    if (!p) return alert("⚠️ Plato requerido");

    if (pedidoEditId) {
      await updatePedido(pedidoEditId, p, d, u);
      pedidoEditId = null;
      document.getElementById("pedido-agregar").textContent = "AGREGAR";
    } else {
      await addPedido(p, d, u);
    }

    document.getElementById("pedido-plato").value = "";
    document.getElementById("pedido-descripcion").value = "";
    document.getElementById("pedido-usuario").value = "";
    await loadData();
  };

  loadData();
});
