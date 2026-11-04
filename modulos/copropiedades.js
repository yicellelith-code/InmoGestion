// ============================================================
// copropiedades.js  ·  Módulo independiente: Copropiedades
// Llave propia: "copropiedades"
// ============================================================

const ModuloCopropiedades = (() => {

  const KEY = 'copropiedades';
  let editandoId = null;

  function cargar() {
    const lista = Store.get(KEY, []);
    return Array.isArray(lista) ? lista : [];
  }

  function guardarLista(lista) {
    return Store.set(KEY, lista);
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // ---------- Construir el Formulario HTML ----------
  function construirFormulario() {
    const screen = document.getElementById('screen-copropiedades');
    if (!screen) return;
    const formViejo = screen.querySelector('.form');
    if (!formViejo) return;

    formViejo.innerHTML = `
      <div class="row">
        <div class="field" style="flex:1">
          <label>Nombre de la Copropiedad</label>
          <input type="text" id="cop-nombre" placeholder="Ej: Conjunto Residencial Los Pinos">
        </div>
        <div class="field" style="flex:1">
          <label>Administrador</label>
          <input type="text" id="cop-admin" placeholder="Nombre del administrador">
        </div>
      </div>

      <div class="row mt">
        <div class="field" style="flex:1">
          <label>Correo Administrador</label>
          <input type="email" id="cop-correo-admin" placeholder="admin@conjunto.com">
        </div>
        <div class="field" style="flex:1">
          <label>Correo Contadora</label>
          <input type="email" id="cop-correo-contadora" placeholder="contadora@conjunto.com">
        </div>
      </div>

      <div class="field mt">
        <label>Teléfonos</label>
        <div id="cop-lista-telefonos" style="display:flex; flex-direction:column; gap:8px;"></div>
        <button type="button" class="btn" style="align-self:flex-start; margin-top:5px;" data-add-tel>+ Agregar teléfono</button>
      </div>

      <div class="actions mt">
        <button type="button" class="btn primary" id="btn-guardar-cop">Guardar copropiedad</button>
      </div>
    `;
  }

  function agregarTelefono(valor = '') {
    const contenedor = document.getElementById('cop-lista-telefonos');
    if (!contenedor) return;
    const div = document.createElement('div');
    div.className = 'row';
    div.innerHTML = `
      <input type="tel" class="cop-tel" placeholder="Ej: 601 123 4567" value="${escapeHtml(valor)}" style="flex:1">
      <button type="button" class="btn" data-remove>Quitar</button>
    `;
    contenedor.appendChild(div);
  }

  // ---------- Pintar tabla ----------
  function renderTabla() {
    const screen = document.getElementById('screen-copropiedades');
    if (!screen) return;

    const theadRow = screen.querySelector('table thead tr');
    if (theadRow) {
      theadRow.innerHTML = `
        <th>Copropiedad / Admin</th>
        <th>Correos</th>
        <th>Teléfonos</th>
        <th>Acciones</th>
      `;
    }

    const tbody = screen.querySelector('table tbody');
    if (!tbody) return;

    const lista = cargar();

    if (lista.length === 0) {
      tbody.innerHTML = '<tr class="empty"><td colspan="4">Sin copropiedades registradas aún.</td></tr>';
      return;
    }

    tbody.innerHTML = lista.map(c => {
      const tels = (c.telefonos || []).join('<br>');
      
      let correos = [];
      if (c.correoAdmin) correos.push(`<strong>Admin:</strong> ${escapeHtml(c.correoAdmin)}`);
      if (c.correoContadora) correos.push(`<strong>Contadora:</strong> ${escapeHtml(c.correoContadora)}`);

      return `
      <tr>
        <td>
          <strong>${escapeHtml(c.nombre)}</strong><br>
          <small style="color:#667085">${escapeHtml(c.administrador)}</small>
        </td>
        <td><small>${correos.join('<br>') || '—'}</small></td>
        <td><small>${tels || '—'}</small></td>
        <td>
          <button class="btn" data-editar="${c.id}">Editar</button>
          <button class="btn" data-eliminar="${c.id}">Eliminar</button>
        </td>
      </tr>
    `}).join('');
  }

  // ---------- Limpiar ----------
  function limpiarFormulario() {
    editandoId = null;
    document.getElementById('cop-nombre').value = '';
    document.getElementById('cop-admin').value = '';
    document.getElementById('cop-correo-admin').value = '';
    document.getElementById('cop-correo-contadora').value = '';
    
    document.getElementById('cop-lista-telefonos').innerHTML = '';
    agregarTelefono(); // Deja uno listo

    document.getElementById('btn-guardar-cop').textContent = 'Guardar copropiedad';
  }

  // ---------- Guardar ----------
  function onGuardar() {
    const nombre = document.getElementById('cop-nombre').value.trim();
    if (!nombre) {
      alert('El nombre de la copropiedad es obligatorio.');
      return;
    }

    const tels = Array.from(document.querySelectorAll('.cop-tel'))
      .map(i => i.value.trim()).filter(Boolean);

    const datos = {
      nombre,
      administrador: document.getElementById('cop-admin').value.trim(),
      correoAdmin: document.getElementById('cop-correo-admin').value.trim(),
      correoContadora: document.getElementById('cop-correo-contadora').value.trim(),
      telefonos: tels
    };

    const lista = cargar();

    if (editandoId) {
      const idx = lista.findIndex(c => c.id === editandoId);
      if (idx >= 0) lista[idx] = { ...lista[idx], ...datos, actualizado: new Date().toISOString() };
    } else {
      lista.push({ id: Store.uid(), ...datos, creado: new Date().toISOString() });
    }

    if (guardarLista(lista)) {
      limpiarFormulario();
      renderTabla();
      alert('Copropiedad guardada correctamente.');
    }
  }

  // ---------- Editar ----------
  function onEditar(id) {
    const lista = cargar();
    const c = lista.find(x => x.id === id);
    if (!c) return;

    editandoId = id;
    document.getElementById('cop-nombre').value = c.nombre || '';
    document.getElementById('cop-admin').value = c.administrador || '';
    document.getElementById('cop-correo-admin').value = c.correoAdmin || '';
    document.getElementById('cop-correo-contadora').value = c.correoContadora || '';
    
    document.getElementById('cop-lista-telefonos').innerHTML = '';
    if (c.telefonos && c.telefonos.length > 0) {
      c.telefonos.forEach(t => agregarTelefono(t));
    } else {
      agregarTelefono();
    }

    document.getElementById('btn-guardar-cop').textContent = 'Actualizar copropiedad';
    document.getElementById('screen-copropiedades').scrollIntoView({ behavior: 'smooth' });
  }

  // ---------- Eliminar ----------
  function onEliminar(id) {
    if (!confirm('¿Eliminar esta copropiedad?')) return;
    if (guardarLista(cargar().filter(x => x.id !== id))) {
      if (editandoId === id) limpiarFormulario();
      renderTabla();
    }
  }

  // ---------- Init ----------
  function init() {
    const screen = document.getElementById('screen-copropiedades');
    if (!screen) return;

    construirFormulario();
    limpiarFormulario();

    document.getElementById('btn-guardar-cop').addEventListener('click', onGuardar);
    document.querySelector('[data-add-tel]').addEventListener('click', () => agregarTelefono());

    screen.addEventListener('click', (e) => {
      if (e.target.matches('[data-remove]')) {
        e.target.parentElement.remove();
        return;
      }
      const editar = e.target.closest('[data-editar]');
      if (editar) { onEditar(editar.dataset.editar); return; }
      
      const eliminar = e.target.closest('[data-eliminar]');
      if (eliminar) { onEliminar(eliminar.dataset.eliminar); return; }
    });

    renderTabla();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { listar: cargar };
})();