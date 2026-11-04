// ============================================================
// arrendatarios.js  ·  Módulo independiente: Arrendatarios
// Llave propia: "arrendatarios"
// ============================================================

const ModuloArrendatarios = (() => {

  const KEY = 'arrendatarios';
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

  function getOpcionesTipoDoc(seleccionado = 'CC') {
    return TIPOS_DOCUMENTO.map(t => 
      `<option value="${t.sigla}" ${t.sigla === seleccionado ? 'selected' : ''}>${t.sigla}</option>`
    ).join('');
  }

  // ---------- Construir Formulario ----------
  function construirFormulario() {
    const screen = document.getElementById('screen-arrendatarios');
    if (!screen) return;
    const formViejo = screen.querySelector('.form');
    if (!formViejo) return;

    formViejo.innerHTML = `
      <div class="row">
        <div class="field" style="flex:1">
          <label>Nombre Completo</label>
          <input type="text" id="arr-nombre" placeholder="Ej: Juan Pérez">
        </div>
        <div class="field" style="flex:0.4">
          <label>Tipo Doc.</label>
          <select id="arr-tipo-doc">
            ${getOpcionesTipoDoc('CC')}
          </select>
        </div>
        <div class="field" style="flex:0.6">
          <label>Documento</label>
          <input type="text" id="arr-documento" placeholder="Número">
        </div>
      </div>

      <div class="row mt">
        <div class="field" style="flex:1">
          <label>Teléfono</label>
          <input type="tel" id="arr-telefono" placeholder="Ej: 300 123 4567">
        </div>
        <div class="field" style="flex:1">
          <label>Correo Electrónico</label>
          <input type="email" id="arr-correo" placeholder="Ej: juan@correo.com">
        </div>
      </div>

      <div class="field mt" style="background:#fafbfd; padding:12px; border-radius:8px; border:1px solid #e3e8ef;">
        <label>Codeudores (Opcional)</label>
        <div id="arr-lista-codeudores" style="display:flex; flex-direction:column; gap:8px;"></div>
        <button type="button" class="btn" style="align-self:flex-start; margin-top:5px;" data-add-codeudor>+ Agregar codeudor</button>
      </div>

      <div class="field mt">
        <label>Encargado de Pago (Opcional)</label>
        <div style="margin-bottom: 8px;">
          <label class="chk"><input type="checkbox" id="arr-enc-mismo"> El arrendatario es el mismo encargado de pago</label>
        </div>
        <div class="row" id="arr-enc-campos">
          <input type="text" id="arr-enc-nombre" placeholder="Nombre completo" style="flex:2">
          <input type="tel" id="arr-enc-telefono" placeholder="Teléfono" style="flex:1">
        </div>
      </div>

      <div class="actions mt">
        <button type="button" class="btn primary" id="btn-guardar-arr">Guardar arrendatario</button>
      </div>
    `;
  }

  // ---------- Agregar Codeudor Dinámico ----------
  function agregarCodeudor(nombre = '', tipoDoc = 'CC', doc = '', tel = '') {
    const contenedor = document.getElementById('arr-lista-codeudores');
    if (!contenedor) return;

    const div = document.createElement('div');
    div.className = 'row arr-codeudor-row';
    div.innerHTML = `
      <input type="text" class="arr-cod-nombre" placeholder="Nombre completo" value="${escapeHtml(nombre)}" style="flex:2">
      <select class="arr-cod-tipo-doc" style="flex:0.5">
        ${getOpcionesTipoDoc(tipoDoc)}
      </select>
      <input type="text" class="arr-cod-doc" placeholder="Documento" value="${escapeHtml(doc)}" style="flex:1">
      <input type="tel" class="arr-cod-tel" placeholder="Teléfono" value="${escapeHtml(tel)}" style="flex:1">
      <button type="button" class="btn" data-remove>Quitar</button>
    `;
    contenedor.appendChild(div);
  }

  // ---------- Tabla ----------
  function renderTabla() {
    const screen = document.getElementById('screen-arrendatarios');
    if (!screen) return;

    const theadRow = screen.querySelector('table thead tr');
    if (theadRow) {
      theadRow.innerHTML = `
        <th>Arrendatario / Doc.</th>
        <th>Contacto</th>
        <th>Codeudores</th>
        <th>Encargado de Pago</th>
        <th>Acciones</th>
      `;
    }

    const tbody = screen.querySelector('table tbody');
    if (!tbody) return;

    const lista = cargar();

    if (lista.length === 0) {
      tbody.innerHTML = '<tr class="empty"><td colspan="5">Sin arrendatarios registrados aún.</td></tr>';
      return;
    }

    tbody.innerHTML = lista.map(a => {
      const codeudoresTexto = (a.codeudores || []).map(c => 
        `<strong>${escapeHtml(c.nombre)}</strong><br>
         <small style="color:#667085">${escapeHtml(c.tipoDocumento || 'CC')} ${escapeHtml(c.doc)} · ${escapeHtml(c.telefono || 'Sin tel')}</small>`
      ).join('<br><br>');
      
      const contacto = `
        ${escapeHtml(a.telefono || '—')}<br>
        <small style="color:#667085">${escapeHtml(a.correo || '—')}</small>
      `;

      let encargadoTexto = '—';
      if (a.encargadoPago?.esMismo) {
        encargadoTexto = '<span class="badge">El mismo arrendatario</span>';
      } else if (a.encargadoPago?.nombre || a.encargadoPago?.telefono) {
        encargadoTexto = `
          <strong>${escapeHtml(a.encargadoPago.nombre || '')}</strong><br>
          <small style="color:#667085">${escapeHtml(a.encargadoPago.telefono || 'Sin tel')}</small>
        `;
      }

      return `
      <tr>
        <td>
          <strong>${escapeHtml(a.nombre)}</strong><br>
          <small style="color:#667085">${escapeHtml(a.tipoDocumento || 'CC')} ${escapeHtml(a.documento)}</small>
        </td>
        <td><small>${contacto}</small></td>
        <td><small>${codeudoresTexto || '—'}</small></td>
        <td><small>${encargadoTexto}</small></td>
        <td>
          <button class="btn" data-editar="${a.id}">Editar</button>
          <button class="btn" data-eliminar="${a.id}">Eliminar</button>
        </td>
      </tr>
    `}).join('');
  }

  // ---------- Lógica de la casilla "Mismo Encargado" ----------
  function toggleEncargado(esMismo) {
    const campos = document.getElementById('arr-enc-campos');
    if (!campos) return;
    
    if (esMismo) {
      campos.style.display = 'none';
      // Llenar con los datos actuales por si acaso
      document.getElementById('arr-enc-nombre').value = document.getElementById('arr-nombre').value;
      document.getElementById('arr-enc-telefono').value = document.getElementById('arr-telefono').value;
    } else {
      campos.style.display = 'flex';
    }
  }

  // ---------- Limpiar ----------
  function limpiarFormulario() {
    editandoId = null;
    document.getElementById('arr-nombre').value = '';
    document.getElementById('arr-tipo-doc').value = 'CC';
    document.getElementById('arr-documento').value = '';
    document.getElementById('arr-telefono').value = '';
    document.getElementById('arr-correo').value = '';
    
    document.getElementById('arr-enc-mismo').checked = false;
    document.getElementById('arr-enc-nombre').value = '';
    document.getElementById('arr-enc-telefono').value = '';
    toggleEncargado(false);

    document.getElementById('arr-lista-codeudores').innerHTML = '';
    document.getElementById('btn-guardar-arr').textContent = 'Guardar arrendatario';
  }

  // ---------- Guardar ----------
  function onGuardar() {
    const nombre = document.getElementById('arr-nombre').value.trim();
    const documento = document.getElementById('arr-documento').value.trim();
    
    if (!nombre || !documento) {
      alert('El nombre y el documento son obligatorios.');
      return;
    }

    const esMismoEncargado = document.getElementById('arr-enc-mismo').checked;
    let encNombre = document.getElementById('arr-enc-nombre').value.trim();
    let encTel = document.getElementById('arr-enc-telefono').value.trim();

    // Si es el mismo, tomamos los datos principales
    if (esMismoEncargado) {
      encNombre = nombre;
      encTel = document.getElementById('arr-telefono').value.trim();
    }

    // Recolectar codeudores
    const codeudores = [];
    document.querySelectorAll('.arr-codeudor-row').forEach(row => {
      const nom = row.querySelector('.arr-cod-nombre').value.trim();
      const tDoc = row.querySelector('.arr-cod-tipo-doc').value;
      const doc = row.querySelector('.arr-cod-doc').value.trim();
      const tel = row.querySelector('.arr-cod-tel').value.trim();
      
      if (nom || doc) {
        codeudores.push({ nombre: nom, tipoDocumento: tDoc, doc, telefono: tel });
      }
    });

    const datos = {
      nombre,
      documento,
      tipoDocumento: document.getElementById('arr-tipo-doc').value,
      telefono: document.getElementById('arr-telefono').value.trim(),
      correo: document.getElementById('arr-correo').value.trim(),
      codeudores,
      encargadoPago: {
        esMismo: esMismoEncargado,
        nombre: encNombre,
        telefono: encTel
      }
    };

    const lista = cargar();

    if (editandoId) {
      const idx = lista.findIndex(a => a.id === editandoId);
      if (idx >= 0) lista[idx] = { ...lista[idx], ...datos, actualizado: new Date().toISOString() };
    } else {
      lista.push({ id: Store.uid(), ...datos, creado: new Date().toISOString() });
    }

    if (guardarLista(lista)) {
      limpiarFormulario();
      renderTabla();
      alert('Arrendatario guardado correctamente.');
    }
  }

  // ---------- Editar ----------
  function onEditar(id) {
    const lista = cargar();
    const a = lista.find(x => x.id === id);
    if (!a) return;

    editandoId = id;
    document.getElementById('arr-nombre').value = a.nombre || '';
    document.getElementById('arr-tipo-doc').value = a.tipoDocumento || 'CC';
    document.getElementById('arr-documento').value = a.documento || '';
    document.getElementById('arr-telefono').value = a.telefono || '';
    document.getElementById('arr-correo').value = a.correo || '';

    // Cargar encargado
    const esMismo = !!a.encargadoPago?.esMismo;
    document.getElementById('arr-enc-mismo').checked = esMismo;
    document.getElementById('arr-enc-nombre').value = a.encargadoPago?.nombre || '';
    document.getElementById('arr-enc-telefono').value = a.encargadoPago?.telefono || '';
    toggleEncargado(esMismo);

    document.getElementById('arr-lista-codeudores').innerHTML = '';
    if (a.codeudores && a.codeudores.length > 0) {
      a.codeudores.forEach(c => agregarCodeudor(c.nombre, c.tipoDocumento, c.doc, c.telefono));
    }

    document.getElementById('btn-guardar-arr').textContent = 'Actualizar arrendatario';
    document.getElementById('screen-arrendatarios').scrollIntoView({ behavior: 'smooth' });
  }

  // ---------- Eliminar ----------
  function onEliminar(id) {
    if (!confirm('¿Eliminar este arrendatario?')) return;
    if (guardarLista(cargar().filter(x => x.id !== id))) {
      if (editandoId === id) limpiarFormulario();
      renderTabla();
    }
  }

  // ---------- Init ----------
  function init() {
    const screen = document.getElementById('screen-arrendatarios');
    if (!screen) return;

    construirFormulario();
    limpiarFormulario();

    document.getElementById('btn-guardar-arr').addEventListener('click', onGuardar);
    document.querySelector('[data-add-codeudor]').addEventListener('click', () => agregarCodeudor());
    
    // Evento para la casilla de "Mismo encargado"
    document.getElementById('arr-enc-mismo').addEventListener('change', (e) => {
      toggleEncargado(e.target.checked);
    });

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