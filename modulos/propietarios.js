// ============================================================
// propietarios.js  ·  Módulo independiente: Propietarios
// ============================================================

const ModuloPropietarios = (() => {

  const KEY = 'propietarios';
  let editandoId = null; 

  const TIPOS_DOCUMENTO = [
    { sigla: 'CC', nombre: 'Cédula de ciudadanía' },
    { sigla: 'TI', nombre: 'Tarjeta de identidad' },
    { sigla: 'RC', nombre: 'Registro civil' },
    { sigla: 'CE', nombre: 'Cédula de extranjería' },
    { sigla: 'PEP', nombre: 'Permiso especial de permanencia' },
    { sigla: 'DNI', nombre: 'Documento Nacional de identidad' },
    { sigla: 'SCR', nombre: 'Salvoconducto' },
    { sigla: 'PA', nombre: 'Pasaporte' }
  ];

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

  // ---------- Construir formulario ----------
  function construirFormulario() {
    const screen = document.getElementById('screen-propietarios');
    if (!screen) return;
    const formViejo = screen.querySelector('.form');
    if (!formViejo) return;

    formViejo.innerHTML = `
      <div class="row">
        <div class="field" style="flex:1">
          <label>Nombre</label>
          <input type="text" id="prop-nombre" placeholder="Ej: María Gómez">
        </div>
        <div class="field" style="flex:0.4">
          <label>Tipo Doc.</label>
          <select id="prop-tipo-doc">
            ${TIPOS_DOCUMENTO.map(t => `<option value="${t.sigla}">${t.sigla} - ${t.nombre}</option>`).join('')}
          </select>
        </div>
        <div class="field" style="flex:0.6">
          <label>Documento</label>
          <input type="text" id="prop-documento" placeholder="Número de documento">
        </div>
      </div>

      <div class="field">
        <label>Teléfonos</label>
        <div id="prop-lista-telefonos" style="display:flex; flex-direction:column; gap:8px;"></div>
        <button type="button" class="btn" style="align-self:flex-start; margin-top:5px;" data-add-tel>+ Agregar teléfono</button>
      </div>

      <div class="field">
        <label>Correos electrónicos</label>
        <div id="prop-lista-correos" style="display:flex; flex-direction:column; gap:8px;"></div>
        <button type="button" class="btn" style="align-self:flex-start; margin-top:5px;" data-add-correo>+ Agregar correo electrónico</button>
      </div>

      <div class="row">
        <div class="field" style="flex:1">
          <label>Banco</label>
          <input type="text" id="prop-banco" placeholder="Ej: Bancolombia">
        </div>
        <div class="field" style="flex:1">
          <label>Cuenta</label>
          <input type="text" id="prop-cuenta" placeholder="Número de cuenta">
        </div>
        <div class="field" style="flex:1">
          <label>Tipo de cuenta</label>
          <select id="prop-tipo-cuenta">
            <option>Ahorros</option>
            <option>Corriente</option>
          </select>
        </div>
      </div>

      <div class="field">
        <label>Forma de pago</label>
        <div class="row">
          <label class="chk"><input type="radio" name="formaPago" value="unico" checked> Pago único</label>
          <label class="chk"><input type="radio" name="formaPago" value="dividido"> Pago dividido</label>
        </div>
      </div>

      <div class="actions mt">
        <button type="button" class="btn primary" id="btn-guardar-prop">Guardar propietario</button>
      </div>
    `;
  }

  function agregarTelefono(valor = '') {
    const contenedor = document.getElementById('prop-lista-telefonos');
    if (!contenedor) return;
    const div = document.createElement('div');
    div.className = 'row';
    div.innerHTML = `
      <input type="tel" class="prop-tel" placeholder="Ej: 300 123 4567" value="${escapeHtml(valor)}" style="flex:1">
      <button type="button" class="btn" data-remove>Quitar</button>
    `;
    contenedor.appendChild(div);
  }

  function agregarCorreo(valor = '') {
    const contenedor = document.getElementById('prop-lista-correos');
    if (!contenedor) return;
    const div = document.createElement('div');
    div.className = 'row';
    div.innerHTML = `
      <input type="email" class="prop-correo" placeholder="Ej: correo@ejemplo.com" value="${escapeHtml(valor)}" style="flex:1">
      <button type="button" class="btn" data-remove>Quitar</button>
    `;
    contenedor.appendChild(div);
  }

  // ---------- Pintar tabla (y corregir encabezados) ----------
  function renderTabla() {
    const screen = document.getElementById('screen-propietarios');
    if (!screen) return;

    // 1. Corregir los encabezados de la tabla (<thead>)
    const theadRow = screen.querySelector('table thead tr');
    if (theadRow) {
      theadRow.innerHTML = `
        <th>Propietario / Doc.</th>
        <th>Teléfonos</th>
        <th>Correos</th>
        <th>Cuenta Bancaria</th>
        <th>Pago</th>
        <th>Acciones</th>
      `;
    }

    // 2. Pintar los datos (<tbody>)
    const tbody = screen.querySelector('table tbody');
    if (!tbody) return;

    const lista = cargar();

    if (lista.length === 0) {
      tbody.innerHTML = '<tr class="empty"><td colspan="6">Sin propietarios registrados aún.</td></tr>';
      return;
    }

    tbody.innerHTML = lista.map(p => {
      const tels = (p.telefonos || []).join('<br>');
      const correos = (p.correos || []).join('<br>');
      return `
      <tr>
        <td>
          <strong>${escapeHtml(p.nombre)}</strong><br>
          <small style="color:#667085">${escapeHtml(p.tipoDocumento || 'CC')} ${escapeHtml(p.documento)}</small>
        </td>
        <td>
          <small>${tels || '—'}</small>
        </td>
        <td>
          <small>${correos || '—'}</small>
        </td>
        <td>
          ${escapeHtml(p.banco || '—')}<br>
          <small style="color:#667085">${escapeHtml(p.tipoCuenta)} · ${escapeHtml(p.cuenta)}</small>
        </td>
        <td>${p.formaPago === 'dividido' ? 'Dividido' : 'Único'}</td>
        <td>
          <button class="btn" data-editar="${p.id}">Editar</button>
          <button class="btn" data-eliminar="${p.id}">Eliminar</button>
        </td>
      </tr>
    `}).join('');
  }

  function limpiarFormulario() {
    editandoId = null;
    document.getElementById('prop-nombre').value = '';
    document.getElementById('prop-tipo-doc').value = 'CC';
    document.getElementById('prop-documento').value = '';
    document.getElementById('prop-banco').value = '';
    document.getElementById('prop-cuenta').value = '';
    document.getElementById('prop-tipo-cuenta').value = 'Ahorros';
    
    document.querySelector('input[name="formaPago"][value="unico"]').checked = true;

    document.getElementById('prop-lista-telefonos').innerHTML = '';
    document.getElementById('prop-lista-correos').innerHTML = '';
    
    agregarTelefono(); 
    agregarCorreo();   

    document.getElementById('btn-guardar-prop').textContent = 'Guardar propietario';
  }

  function onGuardar() {
    const nombre = document.getElementById('prop-nombre').value.trim();
    const documento = document.getElementById('prop-documento').value.trim();
    
    if (!nombre || !documento) {
      alert('El nombre y el documento son obligatorios.');
      return;
    }

    const tels = Array.from(document.querySelectorAll('.prop-tel'))
      .map(i => i.value.trim()).filter(Boolean);
    const correos = Array.from(document.querySelectorAll('.prop-correo'))
      .map(i => i.value.trim()).filter(Boolean);

    const datos = {
      nombre,
      documento,
      tipoDocumento: document.getElementById('prop-tipo-doc').value,
      banco: document.getElementById('prop-banco').value.trim(),
      cuenta: document.getElementById('prop-cuenta').value.trim(),
      tipoCuenta: document.getElementById('prop-tipo-cuenta').value,
      formaPago: document.querySelector('input[name="formaPago"]:checked').value,
      telefonos: tels,
      correos: correos
    };

    const lista = cargar();

    if (editandoId) {
      const idx = lista.findIndex(p => p.id === editandoId);
      if (idx >= 0) lista[idx] = { ...lista[idx], ...datos, actualizado: new Date().toISOString() };
    } else {
      lista.push({ id: Store.uid(), ...datos, creado: new Date().toISOString() });
    }

    if (guardarLista(lista)) {
      limpiarFormulario();
      renderTabla();
      alert('Propietario guardado correctamente.');
    }
  }

  function onEditar(id) {
    const lista = cargar();
    const p = lista.find(x => x.id === id);
    if (!p) return;

    editandoId = id;
    document.getElementById('prop-nombre').value = p.nombre || '';
    document.getElementById('prop-tipo-doc').value = p.tipoDocumento || 'CC';
    document.getElementById('prop-documento').value = p.documento || '';
    document.getElementById('prop-banco').value = p.banco || '';
    document.getElementById('prop-cuenta').value = p.cuenta || '';
    document.getElementById('prop-tipo-cuenta').value = p.tipoCuenta || 'Ahorros';
    
    document.querySelector(`input[name="formaPago"][value="${p.formaPago}"]`).checked = true;

    document.getElementById('prop-lista-telefonos').innerHTML = '';
    document.getElementById('prop-lista-correos').innerHTML = '';
    
    if (p.telefonos && p.telefonos.length > 0) {
      p.telefonos.forEach(t => agregarTelefono(t));
    } else {
      agregarTelefono();
    }

    if (p.correos && p.correos.length > 0) {
      p.correos.forEach(c => agregarCorreo(c));
    } else {
      agregarCorreo();
    }

    document.getElementById('btn-guardar-prop').textContent = 'Actualizar propietario';
    document.getElementById('screen-propietarios').scrollIntoView({ behavior: 'smooth' });
  }

  function onEliminar(id) {
    const lista = cargar();
    const p = lista.find(x => x.id === id);
    if (!p || !confirm(`¿Eliminar a "${p.nombre}"?`)) return;
    
    if (guardarLista(lista.filter(x => x.id !== id))) {
      if (editandoId === id) limpiarFormulario();
      renderTabla();
    }
  }

  function init() {
    const screen = document.getElementById('screen-propietarios');
    if (!screen) return;

    construirFormulario();
    limpiarFormulario();

    document.getElementById('btn-guardar-prop').addEventListener('click', onGuardar);
    document.querySelector('[data-add-tel]').addEventListener('click', () => agregarTelefono());
    document.querySelector('[data-add-correo]').addEventListener('click', () => agregarCorreo());

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