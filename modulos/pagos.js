// ============================================================
// pagos.js  ·  Módulo independiente: Pagos Globales
// ============================================================

const ModuloPagos = (() => {
  const KEY = 'cobros'; 

  function cargar() { return Store.get(KEY, []); }
  function guardarLista(lista) { return Store.set(KEY, lista); }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function formatearMoneda(num) { return '$ ' + Number(num || 0).toLocaleString('es-CO'); }
  function limpiarMoneda(val) { return Number(String(val).replace(/[^0-9]/g, '')) || 0; }

  function renderizar() {
    const screen = document.getElementById('screen-pagos');
    if (!screen) return;

    const cardTabla = screen.querySelector('.card');
    const cardForm = screen.querySelectorAll('.card')[1];

    // 1. Construir la interfaz si no existe
    if (cardTabla && !cardTabla.dataset.built) {
      cardTabla.dataset.built = 'true';
      
      // Tabla
      cardTabla.innerHTML = `
        <div class="actions mb" style="justify-content: space-between;">
          <h3 class="mt" style="margin:0;">Historial Global de Pagos</h3>
          <select id="pago-filtro-contrato" style="min-width: 450px; max-width: 100%;">
            <option value="">— Todos los contratos —</option>
          </select>
        </div>
        <div style="overflow-x:auto;">
          <table>
            <thead>
              <tr><th>Fecha</th><th>Tipo</th><th>Contrato</th><th>Tercero</th><th>Valor</th><th>Método</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody id="pagos-tbody"></tbody>
          </table>
        </div>
      `;

      // Formulario
      if (cardForm) {
        cardForm.innerHTML = `
          <h3>Registrar Nuevo Movimiento de Dinero</h3>
          <p class="hint">Selecciona si es un dinero que ingresa (Arrendatario) o sale (Propietario).</p>
          <div class="form mt">
            <div class="field">
              <label>Tipo de Movimiento</label>
              <select id="pago-tipo" style="font-weight:bold; background:#f4f6f9;">
                <option value="pago">🟢 Pago Recibido (Abono del Arrendatario)</option>
                <option value="pago-propietario">🔴 Pago Realizado (Consignación al Propietario)</option>
              </select>
            </div>
            <div class="field">
              <label>Contrato</label>
              <select id="pago-nuevo-contrato">
                <option value="">— Seleccionar contrato —</option>
              </select>
            </div>
            <div class="row">
              <div class="field" style="flex:1">
                <label>Mes que corresponde (Selecciona cualquier día de ese mes)</label>
                <input type="date" id="pago-mes">
              </div>
              <div class="field" style="flex:1">
                <label>Fecha en que movió el dinero</label>
                <input type="date" id="pago-fecha">
              </div>
            </div>
            <div class="row">
              <div class="field" style="flex:1"><label>Monto</label><input type="text" id="pago-monto" class="input-money" placeholder="$ 0"></div>
              <div class="field" style="flex:1"><label>Método</label>
                <select id="pago-metodo">
                  <option>Transferencia</option><option>Nequi</option><option>PSE</option><option>Efectivo</option>
                </select>
              </div>
            </div>
            <div class="actions mt">
              <button class="btn primary" id="btn-guardar-pago">Guardar Movimiento</button>
            </div>
          </div>
        `;
      }

      // Formateador de moneda
      document.getElementById('pago-monto').addEventListener('input', function() {
        let val = this.value.replace(/\D/g, '');
        this.value = val ? '$ ' + parseInt(val, 10).toLocaleString('es-CO') : '';
      });

      // Eventos
      document.getElementById('pago-filtro-contrato').addEventListener('change', renderizarTabla);
      document.getElementById('btn-guardar-pago').addEventListener('click', guardarPago);
    }

    // 2. Llenar los selectores de contratos CON TEXTO DESCRIPTIVO
    const contratos = ModuloContratos.listar();
    const inmuebles = ModuloInmuebles.listar();
    const copropiedades = ModuloCopropiedades.listar();
    const arrendatarios = ModuloArrendatarios.listar();

    let opciones = '<option value="">— Seleccionar contrato —</option>';
    opciones += contratos.map(c => {
      const inm = inmuebles.find(x => x.id === c.inmuebleId);
      const arr = arrendatarios.find(x => x.id === c.arrendatarioId);
      
      let texto = c.codigo;
      if (inm) {
        texto += ` | ${escapeHtml(inm.tipo)}: ${escapeHtml(inm.codigo)}`;
        if (inm.copropiedad) {
          const cop = copropiedades.find(x => x.id === inm.copropiedad);
          if (cop) texto += ` (${escapeHtml(cop.nombre)})`;
        }
      }
      if (arr) texto += ` | Arrendatario: ${escapeHtml(arr.nombre)}`;
      
      return `<option value="${c.id}">${texto}</option>`;
    }).join('');

    const selFiltro = document.getElementById('pago-filtro-contrato');
    const selNuevo = document.getElementById('pago-nuevo-contrato');
    
    if (selFiltro) {
      const valActual = selFiltro.value;
      selFiltro.innerHTML = '<option value="">— Todos los contratos —</option>' + opciones.replace('<option value="">— Seleccionar contrato —</option>', '');
      selFiltro.value = valActual;
    }
    if (selNuevo) {
      selNuevo.innerHTML = opciones;
    }

    renderizarTabla();
  }

  function renderizarTabla() {
    const tbody = document.getElementById('pagos-tbody');
    if (!tbody) return;

    const filtroId = document.getElementById('pago-filtro-contrato')?.value || '';
    
    let movs = cargar().filter(m => m.tipo === 'pago' || m.tipo === 'pago-propietario');
    if (filtroId) {
      movs = movs.filter(m => m.contratoId === filtroId);
    }

    const contratos = ModuloContratos.listar();
    const arrendatarios = ModuloArrendatarios.listar();
    const propietarios = ModuloPropietarios.listar();
    const inmuebles = ModuloInmuebles.listar();

    if (movs.length === 0) {
      tbody.innerHTML = '<tr class="empty"><td colspan="8">No hay movimientos registrados.</td></tr>';
      return;
    }

    movs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    let totalRecibido = 0;
    let totalRealizado = 0;

    tbody.innerHTML = movs.map(p => {
      const c = contratos.find(x => x.id === p.contratoId);
      let terceroNombre = '—';
      
      if (c) {
        if (p.tipo === 'pago') {
          const arr = arrendatarios.find(a => a.id === c.arrendatarioId);
          terceroNombre = arr ? arr.nombre : 'Arrendatario no encontrado';
        } else if (p.tipo === 'pago-propietario') {
          const inm = inmuebles.find(i => i.id === c.inmuebleId);
          const propId = inm && inm.propietarios && inm.propietarios.length > 0 ? inm.propietarios[0].id : null;
          const prop = propietarios.find(pr => pr.id === propId);
          terceroNombre = prop ? prop.nombre : 'Propietario no encontrado';
        }
      }

      const esIngreso = p.tipo === 'pago';
      if (esIngreso) totalRecibido += p.monto;
      else totalRealizado += p.monto;
      
      const validado = p.detalle.includes('[Validado]');
      const badgeEstado = validado 
        ? '<span class="badge" style="background:#dcfce7;color:#166534;">Validado</span>'
        : '<span class="badge" style="background:#fef3c7;color:#92400e;">Por Validar</span>';

      const metodoLimpio = p.detalle.replace(' [Validado]', '').replace('Pago vía ', '');
      
      const tipoBadge = esIngreso 
        ? '<span class="badge" style="background:#e0f2fe; color:#0369a1;">🟢 Recibido</span>'
        : '<span class="badge" style="background:#fee2e2; color:#991b1b;">🔴 Realizado</span>';

      return `
        <tr>
          <td>${escapeHtml(p.fecha)}</td>
          <td>${tipoBadge}</td>
          <td><strong>${c ? escapeHtml(c.codigo) : 'Contrato eliminado'}</strong></td>
          <td>${escapeHtml(terceroNombre)}</td>
          <td><strong style="color:${esIngreso ? '#16a34a' : '#dc2626'};">${formatearMoneda(p.monto)}</strong></td>
          <td><small>${escapeHtml(metodoLimpio)}</small></td>
          <td>${badgeEstado}</td>
          <td>
            ${!validado ? `<button class="btn" data-validar="${p.id}">Validar Extracto</button>` : '<small style="color:#166534;">✔ Conciliado</small>'}
          </td>
        </tr>
      `;
    }).join('');

    // Fila de Totales
    tbody.innerHTML += `
      <tr style="background:#fafbfd; font-size:15px;">
        <td colspan="3" style="text-align:right;"><strong>TOTALES GLOBALES:</strong></td>
        <td colspan="5">
          <span style="color:#166534; margin-right: 15px;">Recibido: ${formatearMoneda(totalRecibido)}</span>
          <span style="color:#dc2626;">Realizado: ${formatearMoneda(totalRealizado)}</span>
        </td>
      </tr>
    `;

    // Validar Pagos
    tbody.querySelectorAll('[data-validar]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.validar;
        let lista = cargar();
        const idx = lista.findIndex(m => m.id === id);
        if (idx > -1) {
          lista[idx].detalle += ' [Validado]';
          guardarLista(lista);
          renderizarTabla(); 
          if (typeof ModuloDashboard !== 'undefined') ModuloDashboard.actualizar();
        }
      });
    });
  }

  function guardarPago() {
    const tipo = document.getElementById('pago-tipo').value;
    const contratoId = document.getElementById('pago-nuevo-contrato').value;
    const fechaMes = document.getElementById('pago-mes').value; // AHORA ES UN DATE
    const fechaPago = document.getElementById('pago-fecha').value;
    const monto = limpiarMoneda(document.getElementById('pago-monto').value);
    const metodo = document.getElementById('pago-metodo').value;

    if (!contratoId) return alert('Debes seleccionar un contrato.');
    if (!fechaMes || !fechaPago || monto === 0) return alert('Verifica el mes, la fecha y el monto.');

    // Tomamos solo el AAAA-MM de la fecha para agruparlo y le ponemos día 01
    const mesClave = fechaMes.substring(0, 7) + '-01';

    let lista = cargar();
    lista.push({
      id: Store.uid(), 
      contratoId: contratoId, 
      tipo: tipo,
      fecha: mesClave, // Se guarda como AAAA-MM-01
      fechaPago: fechaPago, 
      detalle: `Pago vía ${metodo}`, 
      monto: monto
    });
    
    guardarLista(lista);
    
    // Limpiar formulario
    document.getElementById('pago-monto').value = '';
    document.getElementById('pago-fecha').value = '';
    document.getElementById('pago-mes').value = '';
    
    alert('Movimiento registrado correctamente.');
    renderizarTabla();
    if (typeof ModuloDashboard !== 'undefined') ModuloDashboard.actualizar();
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-screen="pagos"]')) setTimeout(renderizar, 50);
  });
  
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderizar);
  else renderizar();

  return { renderizar };
})();