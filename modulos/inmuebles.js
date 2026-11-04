// ============================================================
// inmuebles.js  ·  Módulo independiente: Inmuebles
// Llave propia: "inmuebles"
// ============================================================

const ModuloInmuebles = (() => {

  const KEY = 'inmuebles';
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
    const screen = document.getElementById('screen-inmuebles');
    if (!screen) return;
    const formViejo = screen.querySelector('.form');
    if (!formViejo) return;

    formViejo.innerHTML = `
      <div class="row">
        <div class="field" style="flex:1">
          <label>Código / Identificador</label>
          <input type="text" id="inm-codigo" placeholder="Ej: APT-101">
        </div>
        <div class="field" style="flex:1">
          <label>Tipo</label>
          <select id="inm-tipo">
            <option>Apartamento</option>
            <option>Casa</option>
            <option>Local</option>
            <option>Oficina</option>
            <option>Parqueadero</option>
          </select>
        </div>
        <div class="field" style="flex:1">
          <label>Estado</label>
          <select id="inm-estado">
            <option>Disponible</option>
            <option>Arrendado</option>
            <option>En mantenimiento</option>
            <option>Inactivo</option>
          </select>
        </div>
      </div>

      <div class="field mt">
        <label>Copropiedad</label>
        <select id="inm-copropiedad">
          <option value="">— Ninguna / No aplica —</option>
          <!-- Se llena dinámicamente desde ModuloCopropiedades -->
        </select>
      </div>

      <div class="field mt" style="background:#fafbfd; padding:12px; border-radius:8px; border:1px solid #e3e8ef;">
        <label>Propietarios y Porcentaje</label>
        <div id="inm-lista-propietarios" style="display:flex; flex-direction:column; gap:8px;"></div>
        <button type="button" class="btn" style="align-self:flex-start; margin-top:5px;" data-add-prop>+ Agregar propietario</button>
      </div>

      <div class="field mt">
        <label>Servicios y Lecturas</label>
        <div class="row">
          <div class="field" style="flex:1">
            <label class="chk"><input type="checkbox" id="inm-serv-energia"> Energía</label>
            <input type="number" id="inm-lect-energia" placeholder="Lectura inicial">
          </div>
          <div class="field" style="flex:1">
            <label class="chk"><input type="checkbox" id="inm-serv-acueducto"> Acueducto</label>
            <input type="number" id="inm-lect-acueducto" placeholder="Lectura inicial">
          </div>
          <div class="field" style="flex:1">
            <label class="chk"><input type="checkbox" id="inm-serv-gas"> Gas</label>
            <input type="number" id="inm-lect-gas" placeholder="Lectura inicial">
          </div>
        </div>
      </div>

      <div class="actions mt">
        <button type="button" class="btn primary" id="btn-guardar-inm">Guardar inmueble</button>
      </div>
    `;
  }

  // ---------- Llenar el Select de Copropiedades ----------
  function cargarSelectCopropiedades(idSeleccionado = '') {
    const select = document.getElementById('inm-copropiedad');
    if (!select) return;

    // Obtenemos las copropiedades desde su módulo
    const copropiedades = ModuloCopropiedades.listar();
    
    // Mantenemos la opción por defecto
    let opciones = '<option value="">— Ninguna / No aplica —</option>';
    
    // Agregamos las copropiedades
    opciones += copropiedades.map(c => 
      `<option value="${c.id}" ${c.id === idSeleccionado ? 'selected' : ''}>${escapeHtml(c.nombre)}</option>`
    ).join('');

    select.innerHTML = opciones;
  }

  // ---------- Agregar Propietario Dinámico ----------
  function agregarPropietario(idProp = '', porcentaje = '') {
    const contenedor = document.getElementById('inm-lista-propietarios');
    if (!contenedor) return;

    const propietarios = ModuloPropietarios.listar();
    
    if (propietarios.length === 0) {
      alert('Primero debes registrar al menos un propietario.');
      return;
    }

    const opciones = propietarios.map(p => 
      `<option value="${p.id}" ${p.id === idProp ? 'selected' : ''}>${escapeHtml(p.nombre)} (${escapeHtml(p.documento)})</option>`
    ).join('');

    const div = document.createElement('div');
    div.className = 'row inm-prop-row';
    div.innerHTML = `
      <select class="inm-prop-id" style="flex:2">
        <option value="">— Seleccionar propietario —</option>
        ${opciones}
      </select>
      <input type="number" class="inm-prop-porcentaje" placeholder="%" style="flex:1" value="${porcentaje}" min="0" max="100">
      <button type="button" class="btn" data-remove>Quitar</button>
    `;
    contenedor.appendChild(div);
  }

  // ---------- Tabla ----------
  function renderTabla() {
    const screen = document.getElementById('screen-inmuebles');
    if (!screen) return;

    const theadRow = screen.querySelector('table thead tr');
    if (theadRow) {
      theadRow.innerHTML = `
        <th>Código / Tipo</th>
        <th>Estado</th>
        <th>Copropiedad</th>
        <th>Propietarios (%)</th>
        <th>Servicios</th>
        <th>Acciones</th>
      `;
    }

    const tbody = screen.querySelector('table tbody');
    if (!tbody) return;

    const lista = cargar();

    if (lista.length === 0) {
      tbody.innerHTML = '<tr class="empty"><td colspan="6">Sin inmuebles registrados aún.</td></tr>';
      return;
    }

    const todosProps = ModuloPropietarios.listar();
    const todasCopros = ModuloCopropiedades.listar();

    tbody.innerHTML = lista.map(i => {
      // Formatear propietarios
      const propsTexto = (i.propietarios || []).map(p => {
        const pr = todosProps.find(x => x.id === p.id);
        return pr ? `${escapeHtml(pr.nombre)} (${p.porcentaje}%)` : 'Desconocido';
      }).join('<br>');

      // Buscar nombre de copropiedad (guardamos el ID en i.copropiedad)
      let nombreCopro = '—';
      if (i.copropiedad) {
        const c = todasCopros.find(x => x.id === i.copropiedad);
        if (c) nombreCopro = escapeHtml(c.nombre);
      }

      // Formatear servicios
      let servs = [];
      if (i.servicios?.energia?.activo) servs.push(`Energía (L: ${i.servicios.energia.lectura})`);
      if (i.servicios?.acueducto?.activo) servs.push(`Acueducto (L: ${i.servicios.acueducto.lectura})`);
      if (i.servicios?.gas?.activo) servs.push(`Gas (L: ${i.servicios.gas.lectura})`);

      return `
      <tr>
        <td>
          <strong>${escapeHtml(i.codigo)}</strong><br>
          <small style="color:#667085">${escapeHtml(i.tipo)}</small>
        </td>
        <td>${escapeHtml(i.estado)}</td>
        <td>${nombreCopro}</td>
        <td><small>${propsTexto || '—'}</small></td>
        <td><small>${servs.join('<br>') || '—'}</small></td>
        <td>
          <button class="btn" data-editar="${i.id}">Editar</button>
          <button class="btn" data-eliminar="${i.id}">Eliminar</button>
        </td>
      </tr>
    `}).join('');
  }

  // ---------- Limpiar ----------
  function limpiarFormulario() {
    editandoId = null;
    document.getElementById('inm-codigo').value = '';
    document.getElementById('inm-tipo').value = 'Apartamento';
    document.getElementById('inm-estado').value = 'Disponible';
    
    // Limpiar select de copropiedad
    cargarSelectCopropiedades();

    document.getElementById('inm-lista-propietarios').innerHTML = '';
    
    document.getElementById('inm-serv-energia').checked = false;
    document.getElementById('inm-lect-energia').value = '';
    document.getElementById('inm-serv-acueducto').checked = false;
    document.getElementById('inm-lect-acueducto').value = '';
    document.getElementById('inm-serv-gas').checked = false;
    document.getElementById('inm-lect-gas').value = '';

    document.getElementById('btn-guardar-inm').textContent = 'Guardar inmueble';
  }

  // ---------- Guardar ----------
  function onGuardar() {
    const codigo = document.getElementById('inm-codigo').value.trim();
    if (!codigo) {
      alert('El código del inmueble es obligatorio.');
      return;
    }

    // Recolectar propietarios
    const propsInputs = document.querySelectorAll('.inm-prop-row');
    const propietarios = [];
    let sumaPorcentajes = 0;

    propsInputs.forEach(row => {
      const id = row.querySelector('.inm-prop-id').value;
      const pct = Number(row.querySelector('.inm-prop-porcentaje').value);
      if (id && pct > 0) {
        propietarios.push({ id, porcentaje: pct });
        sumaPorcentajes += pct;
      }
    });

    if (propietarios.length > 0 && sumaPorcentajes !== 100) {
      alert(`Los porcentajes de los propietarios suman ${sumaPorcentajes}%. Deben sumar exactamente 100%.`);
      return;
    }

    const datos = {
      codigo,
      tipo: document.getElementById('inm-tipo').value,
      estado: document.getElementById('inm-estado').value,
      copropiedad: document.getElementById('inm-copropiedad').value, // Guardamos el ID
      propietarios,
      servicios: {
        energia: { activo: document.getElementById('inm-serv-energia').checked, lectura: document.getElementById('inm-lect-energia').value },
        acueducto: { activo: document.getElementById('inm-serv-acueducto').checked, lectura: document.getElementById('inm-lect-acueducto').value },
        gas: { activo: document.getElementById('inm-serv-gas').checked, lectura: document.getElementById('inm-lect-gas').value }
      }
    };

    const lista = cargar();

    if (editandoId) {
      const idx = lista.findIndex(i => i.id === editandoId);
      if (idx >= 0) lista[idx] = { ...lista[idx], ...datos, actualizado: new Date().toISOString() };
    } else {
      lista.push({ id: Store.uid(), ...datos, creado: new Date().toISOString() });
    }

    if (guardarLista(lista)) {
      limpiarFormulario();
      renderTabla();
      alert('Inmueble guardado correctamente.');
    }
  }

  // ---------- Editar ----------
  function onEditar(id) {
    const lista = cargar();
    const i = lista.find(x => x.id === id);
    if (!i) return;

    editandoId = id;
    document.getElementById('inm-codigo').value = i.codigo || '';
    document.getElementById('inm-tipo').value = i.tipo || 'Apartamento';
    document.getElementById('inm-estado').value = i.estado || 'Disponible';
    
    // Cargar el select de copropiedad y seleccionar el guardado
    cargarSelectCopropiedades(i.copropiedad || '');
    
    document.getElementById('inm-lista-propietarios').innerHTML = '';
    if (i.propietarios && i.propietarios.length > 0) {
      i.propietarios.forEach(p => agregarPropietario(p.id, p.porcentaje));
    }

    // Cargar servicios
    const s = i.servicios || {};
    document.getElementById('inm-serv-energia').checked = !!s.energia?.activo;
    document.getElementById('inm-lect-energia').value = s.energia?.lectura || '';
    document.getElementById('inm-serv-acueducto').checked = !!s.acueducto?.activo;
    document.getElementById('inm-lect-acueducto').value = s.acueducto?.lectura || '';
    document.getElementById('inm-serv-gas').checked = !!s.gas?.activo;
    document.getElementById('inm-lect-gas').value = s.gas?.lectura || '';

    document.getElementById('btn-guardar-inm').textContent = 'Actualizar inmueble';
    document.getElementById('screen-inmuebles').scrollIntoView({ behavior: 'smooth' });
  }

  // ---------- Eliminar ----------
  function onEliminar(id) {
    if (!confirm('¿Eliminar este inmueble?')) return;
    if (guardarLista(cargar().filter(x => x.id !== id))) {
      if (editandoId === id) limpiarFormulario();
      renderTabla();
    }
  }

  // ---------- Init ----------
  function init() {
    const screen = document.getElementById('screen-inmuebles');
    if (!screen) return;

    construirFormulario();
    limpiarFormulario();

    document.getElementById('btn-guardar-inm').addEventListener('click', onGuardar);
    document.querySelector('[data-add-prop]').addEventListener('click', () => agregarPropietario());

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

  // Escuchar cuando se cambie de pestaña para actualizar el listado
  // Por si el usuario creó una copropiedad nueva y viene a Inmuebles
  document.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-screen="inmuebles"]');
    if (nav && document.getElementById('inm-copropiedad')) {
      cargarSelectCopropiedades(document.getElementById('inm-copropiedad').value);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { listar: cargar };
})();