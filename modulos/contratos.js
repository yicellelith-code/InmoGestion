// ============================================================
// contratos.js  ·  Módulo independiente: Contratos
// Llave propia: "contratos"
// ============================================================

const ModuloContratos = (() => {

  const KEY = 'contratos';
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

  function formatearMoneda(input) {
    let valor = input.value.replace(/\D/g, '');
    if (!valor) {
      input.value = '';
      return;
    }
    input.value = '$ ' + parseInt(valor, 10).toLocaleString('es-CO');
  }

  function limpiarMoneda(valor) {
    if (!valor) return 0;
    return Number(String(valor).replace(/[^0-9]/g, '')) || 0;
  }

  function construirFormulario() {
    const screen = document.getElementById('screen-contratos');
    if (!screen) return;
    
    const cardViejo = Array.from(screen.querySelectorAll('.card')).find(c => c.textContent.includes('Acceso a la estructura'));
    
    if (cardViejo) {
      cardViejo.innerHTML = `
        <h3>Nuevo / Editar Contrato</h3>
        <div class="form mt">
          <div class="row">
            <div class="field" style="flex:1">
              <label>Número del Contrato</label>
              <input type="text" id="con-codigo" placeholder="Ej: CONT-2026-001">
            </div>
            <div class="field" style="flex:2">
              <label>Inmueble</label>
              <select id="con-inmueble"></select>
            </div>
            <div class="field" style="flex:2">
              <label>Arrendatario</label>
              <select id="con-arrendatario"></select>
            </div>
          </div>

          <div class="field mt">
            <label>Tipo de Arrendamiento</label>
            <select id="con-tipo" style="max-width: 300px;">
              <option value="Apartamento">Apartamento</option>
              <option value="Casa">Casa</option>
              <option value="Local">Local</option>
              <option value="Oficina">Oficina</option>
              <option value="Parqueadero">Parqueadero</option>
            </select>
          </div>

          <div class="row mt">
            <div class="field" style="flex:1">
              <label>Fecha de Inicio</label>
              <input type="date" id="con-fecha-inicio">
            </div>
            <div class="field" style="flex:1">
              <label>Fecha de Terminación</label>
              <input type="date" id="con-fecha-fin">
            </div>
            <div class="field" style="flex:1">
              <label>Aseguradora</label>
              <input type="text" id="con-aseguradora" placeholder="Ej: Sura">
            </div>
          </div>

          <div class="row mt">
            <div class="field" style="flex:1">
              <label>Canon Mensual (COP)</label>
              <input type="text" id="con-canon" placeholder="$ 0">
            </div>
            <div class="field" style="flex:1">
              <label>Depósito / Garantía (COP)</label>
              <input type="text" id="con-deposito" placeholder="$ 0">
            </div>
            <div class="field" style="flex:1">
              <label>Periodicidad de Pago</label>
              <select id="con-periodicidad">
                <option>Mensual</option>
                <option>Bimestral</option>
                <option>Trimestral</option>
              </select>
            </div>
            <div class="field" style="flex:1">
              <label>Día Límite de Pago</label>
              <select id="con-dia-pago">
                ${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}" ${i + 1 === 5 ? 'selected' : ''}>Día ${i + 1}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="row mt">
            <div class="field" style="flex:1">
              <label>IVA (%)</label>
              <input type="number" id="con-iva" value="19" min="0" max="100">
            </div>
            <div class="field" style="flex:1">
              <label>Retención (%)</label>
              <input type="number" id="con-retencion" value="0" min="0" max="100">
            </div>
            <div class="field" style="flex:1">
              <label>Incremento Anual (%)</label>
              <input type="number" id="con-incremento" value="0" min="0" max="100" step="0.01">
            </div>
          </div>

          <div class="field mt" id="con-prorrogas-wrap" style="display:none; background:#f0fdf4; padding:10px; border-radius:8px; border:1px solid #bbf7d0;">
            <label style="color:#166534">Historial de Prórrogas</label>
            <ul id="con-prorrogas-lista" style="margin:5px 0 0 15px; padding:0; font-size:13px; color:#166534;"></ul>
          </div>

          <div class="actions mt">
            <button type="button" class="btn primary" id="btn-guardar-con">Guardar contrato</button>
            <button type="button" class="btn" id="btn-cancelar-con" style="display:none;">Cancelar edición</button>
          </div>
        </div>
      `;

      document.getElementById('con-canon').addEventListener('input', function() { formatearMoneda(this); });
      document.getElementById('con-deposito').addEventListener('input', function() { formatearMoneda(this); });
    }
  }

  function cargarSelects(idInmueble = '', idArrendatario = '') {
    const selInm = document.getElementById('con-inmueble');
    const selArr = document.getElementById('con-arrendatario');
    if (!selInm || !selArr) return;

    const inmuebles = ModuloInmuebles.listar();
    let htmlInm = '<option value="">— Seleccionar —</option>';
    htmlInm += inmuebles.map(i => 
      `<option value="${i.id}" ${i.id === idInmueble ? 'selected' : ''}>${escapeHtml(i.codigo)} (${escapeHtml(i.tipo)})</option>`
    ).join('');
    selInm.innerHTML = htmlInm;

    const arrendatarios = ModuloArrendatarios.listar();
    let htmlArr = '<option value="">— Seleccionar —</option>';
    htmlArr += arrendatarios.map(a => 
      `<option value="${a.id}" ${a.id === idArrendatario ? 'selected' : ''}>${escapeHtml(a.nombre)} (${escapeHtml(a.documento)})</option>`
    ).join('');
    selArr.innerHTML = htmlArr;
  }

  function renderTabla() {
    const screen = document.getElementById('screen-contratos');
    if (!screen) return;

    const cardTabla = screen.querySelector('.card');
    if (!cardTabla) return;

    const theadRow = cardTabla.querySelector('table thead tr');
    if (theadRow) {
      theadRow.innerHTML = `
        <th>Código / Fechas</th>
        <th>Inmueble</th>
        <th>Arrendatario</th>
        <th>Economía</th>
        <th>Acciones</th>
      `;
    }

    const tbody = cardTabla.querySelector('table tbody');
    if (!tbody) return;

    const lista = cargar();
    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    if (lista.length === 0) {
      tbody.innerHTML = '<tr class="empty"><td colspan="5">Sin contratos registrados aún.</td></tr>';
      return;
    }

    const inmuebles = ModuloInmuebles.listar();
    const arrendatarios = ModuloArrendatarios.listar();

    tbody.innerHTML = lista.map(c => {
      const inm = inmuebles.find(x => x.id === c.inmuebleId);
      const arr = arrendatarios.find(x => x.id === c.arrendatarioId);

      const textoInm = inm ? `${escapeHtml(inm.codigo)} (${escapeHtml(inm.tipo)})` : 'Inmueble borrado';
      const textoArr = arr ? `${escapeHtml(arr.nombre)}` : 'Arrendatario borrado';

      let fechaFinStr = escapeHtml(c.fechaFin);
      let alertaBadge = '';
      if (c.fechaFin) {
        const fFin = new Date(c.fechaFin + 'T00:00:00');
        if (fFin < hoy) {
          alertaBadge = '<br><span class="badge" style="background:#fee2e2;color:#991b1b;margin-top:4px;">Vencido</span>';
        } else {
          const diffDias = Math.ceil((fFin - hoy) / (1000 * 60 * 60 * 24));
          if (diffDias <= 30) {
            alertaBadge = '<br><span class="badge" style="background:#fef3c7;color:#92400e;margin-top:4px;">Por vencer ('+diffDias+' días)</span>';
          }
        }
      }

      return `
      <tr>
        <td>
          <strong>${escapeHtml(c.codigo)}</strong><br>
          <small style="color:#667085">${escapeHtml(c.fechaInicio)} al ${fechaFinStr}</small>
          ${alertaBadge}
        </td>
        <td>${textoInm}</td>
        <td>${textoArr}</td>
        <td>
          <small style="color:#667085">Canon: $ ${Number(c.canon || 0).toLocaleString('es-CO')}<br>IVA: ${c.iva}% | Ret: ${c.retencion}%</small>
        </td>
        <td>
          <button class="btn" data-editar="${c.id}">Editar</button>
          <button class="btn" data-prorroga="${c.id}" style="background:#e0f2fe;color:#0369a1;border-color:#bae6fd;">Prórroga</button>
          <button class="btn" data-cobros="${c.id}" style="background:#ecfdf5;color:#047857;border-color:#a7f3d0;">Cobros</button>
          <button class="btn" data-eliminar="${c.id}">Eliminar</button>
        </td>
      </tr>
    `}).join('');
  }

  function limpiarFormulario() {
    editandoId = null;
    document.getElementById('con-codigo').value = '';
    document.getElementById('con-fecha-inicio').value = '';
    document.getElementById('con-fecha-fin').value = '';
    document.getElementById('con-aseguradora').value = '';
    document.getElementById('con-canon').value = '';
    document.getElementById('con-deposito').value = '';
    document.getElementById('con-iva').value = 19;
    document.getElementById('con-retencion').value = 0;
    document.getElementById('con-incremento').value = 0;
    
    document.getElementById('con-tipo').value = 'Apartamento';
    document.getElementById('con-dia-pago').value = '5';
    
    document.getElementById('con-prorrogas-wrap').style.display = 'none';
    cargarSelects();
    
    document.getElementById('btn-guardar-con').textContent = 'Guardar contrato';
    document.getElementById('btn-cancelar-con').style.display = 'none';
  }

  function onGuardar() {
    const codigo = document.getElementById('con-codigo').value.trim();
    const inmuebleId = document.getElementById('con-inmueble').value;
    const arrendatarioId = document.getElementById('con-arrendatario').value;
    const fechaInicio = document.getElementById('con-fecha-inicio').value;
    const fechaFin = document.getElementById('con-fecha-fin').value;

    if (!codigo || !inmuebleId || !arrendatarioId || !fechaInicio || !fechaFin) {
      alert('El código, el inmueble, el arrendatario y las fechas son obligatorios.');
      return;
    }

    const tipoArr = document.getElementById('con-tipo').value;

    const datos = {
      codigo,
      inmuebleId,
      arrendatarioId,
      tipoArrendamiento: tipoArr,
      fechaInicio,
      fechaFin,
      aseguradora: document.getElementById('con-aseguradora').value.trim(),
      canon: limpiarMoneda(document.getElementById('con-canon').value),
      deposito: limpiarMoneda(document.getElementById('con-deposito').value),
      periodicidad: document.getElementById('con-periodicidad').value,
      diaPago: document.getElementById('con-dia-pago').value,
      iva: Number(document.getElementById('con-iva').value) || 0,
      retencion: Number(document.getElementById('con-retencion').value) || 0,
      incremento: Number(document.getElementById('con-incremento').value) || 0
    };

    const lista = cargar();

    if (editandoId) {
      const idx = lista.findIndex(c => c.id === editandoId);
      if (idx >= 0) {
        lista[idx] = { ...lista[idx], ...datos, actualizado: new Date().toISOString() };
      }
    } else {
      lista.push({ id: Store.uid(), ...datos, prorrogas: [], creado: new Date().toISOString() });
    }

    if (guardarLista(lista)) {
      verificarEstadosInmuebles();
      limpiarFormulario();
      renderTabla();
      alert('Contrato guardado correctamente.');
    }
  }

  function onEditar(id) {
    const lista = cargar();
    const c = lista.find(x => x.id === id);
    if (!c) return;

    editandoId = id;
    document.getElementById('con-codigo').value = c.codigo || '';
    document.getElementById('con-fecha-inicio').value = c.fechaInicio || '';
    document.getElementById('con-fecha-fin').value = c.fechaFin || '';
    document.getElementById('con-aseguradora').value = c.aseguradora || '';
    
    document.getElementById('con-canon').value = c.canon ? '$ ' + Number(c.canon).toLocaleString('es-CO') : '';
    document.getElementById('con-deposito').value = c.deposito ? '$ ' + Number(c.deposito).toLocaleString('es-CO') : '';
    
    document.getElementById('con-periodicidad').value = c.periodicidad || 'Mensual';
    document.getElementById('con-dia-pago').value = c.diaPago || '5';
    document.getElementById('con-iva').value = c.iva || 0;
    document.getElementById('con-retencion').value = c.retencion || 0;
    document.getElementById('con-incremento').value = c.incremento || 0;
    document.getElementById('con-tipo').value = c.tipoArrendamiento || 'Apartamento';

    const wrap = document.getElementById('con-prorrogas-wrap');
    const listaLi = document.getElementById('con-prorrogas-lista');
    if (c.prorrogas && c.prorrogas.length > 0) {
      wrap.style.display = 'block';
      listaLi.innerHTML = c.prorrogas.map(p => `<li>Fecha anterior: ${escapeHtml(p.fechaAnterior)} → Nueva fecha: <strong>${escapeHtml(p.fechaNueva)}</strong></li>`).join('');
    } else {
      wrap.style.display = 'none';
      listaLi.innerHTML = '';
    }
    
    cargarSelects(c.inmuebleId, c.arrendatarioId);

    document.getElementById('btn-guardar-con').textContent = 'Actualizar contrato';
    document.getElementById('btn-cancelar-con').style.display = 'inline-block';
    document.getElementById('screen-contratos').scrollIntoView({ behavior: 'smooth' });
  }

  function onProrroga(id) {
    const lista = cargar();
    const c = lista.find(x => x.id === id);
    if (!c) return;

    const modal = document.createElement('div');
    modal.style = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
    modal.innerHTML = `
      <div class="card" style="width:100%;max-width:400px;margin:20px;">
        <h3>Registrar Prórroga</h3>
        <p class="hint">Contrato: <strong>${escapeHtml(c.codigo)}</strong><br>Fecha actual de fin: ${escapeHtml(c.fechaFin)}</p>
        <div class="field mt">
          <label>Nueva Fecha de Terminación</label>
          <input type="date" id="modal-nueva-fecha" min="${c.fechaFin}" style="width:100%;">
        </div>
        <div class="actions mt" style="justify-content:flex-end;">
          <button type="button" class="btn" id="modal-btn-cancelar">Cancelar</button>
          <button type="button" class="btn primary" id="modal-btn-aceptar">Guardar Prórroga</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const inputFecha = document.getElementById('modal-nueva-fecha');
    
    document.getElementById('modal-btn-cancelar').addEventListener('click', () => modal.remove());

    document.getElementById('modal-btn-aceptar').addEventListener('click', () => {
      const nuevaFecha = inputFecha.value;
      if (!nuevaFecha) {
        alert('Debes seleccionar una fecha.');
        return;
      }

      if (!c.prorrogas) c.prorrogas = [];
      c.prorrogas.push({
        fechaAnterior: c.fechaFin,
        fechaNueva: nuevaFecha,
        registrada: new Date().toISOString()
      });

      c.fechaFin = nuevaFecha;
      c.actualizado = new Date().toISOString();

      if (guardarLista(lista)) {
        verificarEstadosInmuebles();
        renderTabla();
        modal.remove();
        alert('Prórroga registrada. El contrato ahora vence el ' + nuevaFecha + '.');
      }
    });
  }

  function onEliminar(id) {
    if (!confirm('¿Eliminar este contrato?')) return;
    if (guardarLista(cargar().filter(x => x.id !== id))) {
      if (editandoId === id) limpiarFormulario();
      verificarEstadosInmuebles();
      renderTabla();
    }
  }

  function verificarEstadosInmuebles() {
    const contratos = cargar();
    const inmuebles = ModuloInmuebles.listar();
    const hoy = new Date();
    hoy.setHours(0,0,0,0);

    let huboCambios = false;

    inmuebles.forEach(inm => {
      const contratoVigente = contratos.find(c => 
        c.inmuebleId === inm.id && 
        new Date(c.fechaFin + 'T00:00:00') >= hoy
      );

      if (contratoVigente && inm.estado !== 'Arrendado') {
        inm.estado = 'Arrendado';
        huboCambios = true;
      } else if (!contratoVigente && inm.estado === 'Arrendado') {
        inm.estado = 'Disponible';
        huboCambios = true;
      }
    });

    if (huboCambios) {
      Store.set('inmuebles', inmuebles);
    }
  }

  function init() {
    const screen = document.getElementById('screen-contratos');
    if (!screen) return;

    construirFormulario();
    limpiarFormulario();

    document.getElementById('btn-guardar-con').addEventListener('click', onGuardar);
    document.getElementById('btn-cancelar-con').addEventListener('click', () => limpiarFormulario());

    screen.addEventListener('click', (e) => {
      const editar = e.target.closest('[data-editar]');
      if (editar) { onEditar(editar.dataset.editar); return; }

      const prorroga = e.target.closest('[data-prorroga]');
      if (prorroga) { onProrroga(prorroga.dataset.prorroga); return; }

      // ESTA ES LA LÍNEA QUE ABRE COBROS
      const cobros = e.target.closest('[data-cobros]');
      if (cobros) { 
        if (typeof ModuloCobros !== 'undefined') {
          ModuloCobroPantalla.abrirContrato(cobros.dataset.cobros);
        } else {
          alert('Error: El módulo de cobros no está cargado. Revisa el index.html');
        }
        return; 
      }
      
      const eliminar = e.target.closest('[data-eliminar]');
      if (eliminar) { onEliminar(eliminar.dataset.eliminar); return; }
    });

    document.addEventListener('click', (e) => {
      const nav = e.target.closest('[data-screen="contratos"]');
      if (nav && document.getElementById('con-inmueble')) {
        if (!editandoId) cargarSelects();
      }
    });

    renderTabla();
    verificarEstadosInmuebles();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { 
    listar: cargar,
    verificarEstados: verificarEstadosInmuebles
  };
})();