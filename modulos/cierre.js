// ============================================================
// cierre.js  ·  Módulo independiente: Cierre Mensual (AUDITADO)
// ============================================================

const ModuloCierreMensual = (() => {
  const KEY = 'cobros';

  function cargar() { return Store.get(KEY, []); }

  function formatearMoneda(num) {
    return '$ ' + Number(num || 0).toLocaleString('es-CO');
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function renderizar() {
    const screen = document.getElementById('screen-cierre');
    if (!screen) return;

    const card = screen.querySelector('.card');
    const actions = screen.querySelector('.actions');
    
    // 1. Construir la interfaz
    if (card && !card.dataset.built) {
      card.dataset.built = 'true';
      
      if (actions) {
        actions.innerHTML = `
          <input type="date" id="cierre-mes" style="min-width: 200px;">
          <button class="btn primary" id="btn-generar-cierre">Generar Cierre</button>
        `;
        document.getElementById('btn-generar-cierre').addEventListener('click', calcularCierre);
      }

      card.innerHTML = `
        <div id="cierre-empty" class="note" style="text-align:center; padding:40px;">
          <h3>Selecciona un mes y haz clic en "Generar Cierre"</h3>
          <p>El sistema comparará lo facturado (Cargos + Gastos) contra lo recaudado de todos los contratos.</p>
        </div>
        
        <div id="cierre-contenido" style="display:none;">
          <h3 style="margin-top:0;">Resumen de Cierre</h3>
          <div style="overflow-x:auto;">
            <table class="mt">
              <thead>
                <tr>
                  <th>Contrato</th>
                  <th>Inmueble</th>
                  <th>Arrendatario</th>
                  <th>Facturado (Deuda Total)</th>
                  <th>Recaudado (Pagos Val.)</th>
                  <th>Diferencia</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody id="cierre-tbody"></tbody>
              <tfoot id="cierre-tfoot" style="background:#fafbfd; font-weight:bold;"></tfoot>
            </table>
          </div>
        </div>
      `;
    }
  }

  function calcularCierre() {
    const fechaInput = document.getElementById('cierre-mes').value;
    const contenido = document.getElementById('cierre-contenido');
    const empty = document.getElementById('cierre-empty');
    const tbody = document.getElementById('cierre-tbody');
    const tfoot = document.getElementById('cierre-tfoot');

    if (!fechaInput) {
      alert('Por favor, selecciona un mes para generar el cierre.');
      return;
    }

    const mesClave = fechaInput.substring(0, 7);
    const movs = cargar();
    const contratos = ModuloContratos.listar();
    const inmuebles = ModuloInmuebles.listar();
    const arrendatarios = ModuloArrendatarios.listar();

    if (contratos.length === 0) {
      alert('No hay contratos registrados para hacer el cierre.');
      return;
    }

    let totalFacturadoGlobal = 0;
    let totalRecaudadoGlobal = 0;

    let filas = contratos.map(c => {
      const movsContrato = movs.filter(m => m.contratoId === c.id && m.fecha.startsWith(mesClave));
      
      let facturado = 0;
      let recaudado = 0;

      movsContrato.forEach(m => {
        // Facturado Total = Cargos + Gastos del Arrendatario
        if (m.tipo === 'cargo') {
          facturado += m.monto;
        }
        if (m.tipo === 'gasto' && !m.detalle.includes('Propietario')) {
          facturado += m.monto; 
        }
        // Recaudado = Pagos validados
        if (m.tipo === 'pago' && m.detalle.includes('[Validado]')) {
          recaudado += m.monto;
        }
      });

      totalFacturadoGlobal += facturado;
      totalRecaudadoGlobal += recaudado;

      // Diferencia: Si es negativa, es lo que falta por recaudar.
      const diferencia = recaudado - facturado;
      
      const inm = inmuebles.find(x => x.id === c.inmuebleId);
      const arr = arrendatarios.find(x => x.id === c.arrendatarioId);

      let badgeEstado = '';
      let colorDif = '';
      
      if (facturado === 0) {
        badgeEstado = '<span class="badge" style="background:#f3f4f6;color:#374151;">Sin facturación</span>';
        colorDif = '#374151';
      } else if (diferencia >= 0) {
        badgeEstado = '<span class="badge" style="background:#dcfce7;color:#166534;">Al día</span>';
        colorDif = '#166534';
      } else {
        badgeEstado = '<span class="badge" style="background:#fee2e2;color:#991b1b;">Déficit</span>';
        colorDif = '#dc2626';
      }

      return `
        <tr>
          <td><strong>${escapeHtml(c.codigo)}</strong></td>
          <td>${inm ? escapeHtml(inm.codigo) : '—'}</td>
          <td>${arr ? escapeHtml(arr.nombre) : '—'}</td>
          <td>${formatearMoneda(facturado)}</td>
          <td style="color:#166534;">${formatearMoneda(recaudado)}</td>
          <td><strong style="color:${colorDif};">${formatearMoneda(diferencia)}</strong></td>
          <td>${badgeEstado}</td>
        </tr>
      `;
    }).join('');

    const difGlobal = totalRecaudadoGlobal - totalFacturadoGlobal;
    const colorGlobal = difGlobal >= 0 ? '#166534' : '#dc2626';

    tfoot.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:right; font-size:15px;">TOTALES DEL MES:</td>
        <td>${formatearMoneda(totalFacturadoGlobal)}</td>
        <td style="color:#166534;">${formatearMoneda(totalRecaudadoGlobal)}</td>
        <td colspan="2"><strong style="color:${colorGlobal}; font-size:16px;">${formatearMoneda(difGlobal)}</strong></td>
      </tr>
    `;

    tbody.innerHTML = filas;
    empty.style.display = 'none';
    contenido.style.display = 'block';
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-screen="cierre"]')) setTimeout(renderizar, 50);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderizar);
  else renderizar();

  return { renderizar };
})();