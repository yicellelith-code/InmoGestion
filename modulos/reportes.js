// ============================================================
// reportes.js  ·  Módulo independiente: Generación de Reportes
// Llave propia: Ninguna (solo lee datos)
// ============================================================

const ModuloReportes = (() => {

  function formatearMoneda(num) {
    return '$ ' + Number(num || 0).toLocaleString('es-CO');
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // ---------- 1. INFORME PROPIETARIO ----------
  function initPropietario() {
    const screen = document.getElementById('screen-rep-propietario');
    if (!screen) return;

    const cardViejo = screen.querySelector('.card');
    if (!cardViejo) return;

    const btn = screen.querySelector('.actions .btn.primary');
    if (btn) {
      btn.removeAttribute('data-soon');
      btn.textContent = 'Calcular y Enviar Correo';
      btn.addEventListener('click', generarPropietario);
    }

    const params = ModuloParametros.getParametros();
    const pctComision = params.comision || 10;
    const pctIva = params.iva || 19;

    cardViejo.innerHTML = `
      <div class="form mb mt">
        <div class="field">
          <label>Seleccionar Contrato</label>
          <select id="rep-prop-contrato">
            <option value="">— Seleccionar contrato —</option>
          </select>
        </div>
        <div class="field">
          <label>Mes a Reportar</label>
          <input type="month" id="rep-prop-mes">
        </div>
      </div>

      <h3 class="mt">Fórmula del Informe</h3>
      <p class="hint">Ingresos − Comisión (${pctComision}%) − IVA (${pctIva}%) − Gastos = Neto</p>
      
      <table class="mt" id="rep-prop-tabla" style="display:none;">
        <tbody>
          <tr><td>Ingresos (Pagos Recibidos)</td><td id="rp-ingresos">$ 0</td></tr>
          <tr><td>Comisión</td><td id="rp-comision" style="color:#991b1b;">- $ 0</td></tr>
          <tr><td>IVA sobre Comisión</td><td id="rp-iva" style="color:#991b1b;">- $ 0</td></tr>
          <tr><td>Gastos (A cargo del propietario)</td><td id="rp-gastos" style="color:#991b1b;">- $ 0</td></tr>
          <tr style="background:#f0fdf4;">
            <td><strong>Neto a Pagar</strong></td>
            <td><strong id="rp-neto" style="color:#166534; font-size:16px;">$ 0</strong></td>
          </tr>
        </tbody>
      </table>
    `;

    cargarContratosSelect('rep-prop-contrato');

    document.getElementById('rep-prop-contrato').addEventListener('change', calcularPropietario);
    document.getElementById('rep-prop-mes').addEventListener('change', calcularPropietario);
  }

  function calcularPropietario() {
    const contratoId = document.getElementById('rep-prop-contrato').value;
    const mes = document.getElementById('rep-prop-mes').value;
    const tabla = document.getElementById('rep-prop-tabla');

    if (!contratoId || !mes) {
      if (tabla) tabla.style.display = 'none';
      return;
    }

    const cobros = Store.get('cobros', []);
    const params = ModuloParametros.getParametros();
    const pctComision = (params.comision || 10) / 100;
    const pctIva = (params.iva || 19) / 100;

    const movs = cobros.filter(c => 
      c.contratoId === contratoId && 
      c.fecha && c.fecha.startsWith(mes)
    );

    let ingresos = 0;
    let gastosPropietario = 0;

    movs.forEach(m => {
      if (m.tipo === 'pago') ingresos += m.monto;
      if (m.tipo === 'gasto' && m.detalle.includes('Propietario')) gastosPropietario += m.monto;
    });

    const comision = ingresos * pctComision;
    const iva = comision * pctIva;
    const neto = ingresos - comision - iva - gastosPropietario;

    document.getElementById('rp-ingresos').textContent = formatearMoneda(ingresos);
    document.getElementById('rp-comision').textContent = '- ' + formatearMoneda(comision);
    document.getElementById('rp-iva').textContent = '- ' + formatearMoneda(iva);
    document.getElementById('rp-gastos').textContent = '- ' + formatearMoneda(gastosPropietario);
    document.getElementById('rp-neto').textContent = formatearMoneda(neto);

    tabla.style.display = 'table';
  }

  function generarPropietario() {
    const contratoId = document.getElementById('rep-prop-contrato').value;
    const mes = document.getElementById('rep-prop-mes').value;
    
    if (!contratoId || !mes) {
      alert('Selecciona el contrato y el mes.');
      return;
    }

    const contratos = ModuloContratos.listar();
    const inmuebles = ModuloInmuebles.listar();
    const propietarios = ModuloPropietarios.listar();
    
    const c = contratos.find(x => x.id === contratoId);
    const inm = inmuebles.find(x => x.id === c.inmuebleId);
    const propId = inm.propietarios && inm.propietarios.length > 0 ? inm.propietarios[0].id : null;
    const prop = propietarios.find(x => x.id === propId);

    if (!prop) {
      alert('El inmueble no tiene un propietario asignado.');
      return;
    }

    const correos = (prop.correos && prop.correos.length > 0) ? prop.correos.join(',') : '';
    
    const ingresos = document.getElementById('rp-ingresos').textContent;
    const comision = document.getElementById('rp-comision').textContent;
    const iva = document.getElementById('rp-iva').textContent;
    const gastos = document.getElementById('rp-gastos').textContent;
    const neto = document.getElementById('rp-neto').textContent;

    const asunto = encodeURIComponent(`Informe de Arriendo - ${inm.codigo} - ${mes}`);
    const cuerpo = encodeURIComponent(
      `Hola ${prop.nombre},\n\n` +
      `Adjunto el resumen financiero del inmueble ${inm.codigo} para el mes ${mes}:\n\n` +
      `Ingresos: ${ingresos}\n` +
      `Comisión: ${comision}\n` +
      `IVA: ${iva}\n` +
      `Gastos: ${gastos}\n` +
      `-------------------------\n` +
      `NETO A CONSIGNAR: ${neto}\n\n` +
      `Quedo atento a cualquier duda.\n\nInmoGestión`
    );

    window.open(`mailto:${correos}?subject=${asunto}&body=${cuerpo}`, '_blank');
  }

  // ---------- 2. INFORME ARRENDATARIO ----------
  function initArrendatario() {
    const screen = document.getElementById('screen-rep-arrendatario');
    if (!screen) return;

    const btn = screen.querySelector('.actions .btn.primary');
    if (btn) {
      btn.removeAttribute('data-soon');
      btn.textContent = 'Generar y Enviar Correo';
      btn.addEventListener('click', generarArrendatario);
    }

    const grid = screen.querySelector('.grid');
    if (grid) {
      grid.outerHTML = `
        <div class="card mt">
          <div class="form">
            <div class="row">
              <div class="field" style="flex:1">
                <label>Seleccionar Contrato</label>
                <select id="rep-arr-contrato">
                  <option value="">— Seleccionar contrato —</option>
                </select>
              </div>
              <div class="field" style="flex:1">
                <label>Mes a Reportar</label>
                <input type="month" id="rep-arr-mes">
              </div>
            </div>
          </div>

          <div class="grid g2 mt" id="rep-arr-resultado" style="display:none;">
            <div class="card">
              <h3>Cargos del mes</h3>
              <table class="mt"><tbody id="rep-arr-cargos"></tbody></table>
            </div>
            <div class="card">
              <h3>Estado de Cuenta</h3>
              <table class="mt">
                <tbody>
                  <tr><td>Total Cargos:</td><td id="rep-arr-total-cargos">$ 0</td></tr>
                  <tr><td>Total Pagos:</td><td id="rep-arr-total-pagos" style="color:#166534;">- $ 0</td></tr>
                  <tr style="background:#fafbfd;">
                    <td><strong>Saldo Pendiente:</strong></td>
                    <td><strong id="rep-arr-saldo">$ 0</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }

    cargarContratosSelect('rep-arr-contrato');

    document.getElementById('rep-arr-contrato').addEventListener('change', calcularArrendatario);
    document.getElementById('rep-arr-mes').addEventListener('change', calcularArrendatario);
  }

  function calcularArrendatario() {
    const contratoId = document.getElementById('rep-arr-contrato').value;
    const mes = document.getElementById('rep-arr-mes').value;
    const resultado = document.getElementById('rep-arr-resultado');

    if (!contratoId || !mes) {
      if (resultado) resultado.style.display = 'none';
      return;
    }

    const cobros = Store.get('cobros', []);
    const movs = cobros.filter(c => 
      c.contratoId === contratoId && 
      c.fecha && c.fecha.startsWith(mes)
    );

    let htmlCargos = '';
    let totalCargos = 0;
    let totalPagos = 0;

    movs.forEach(m => {
      if (m.tipo === 'cargo') {
        totalCargos += m.monto;
        htmlCargos += `<tr><td>${escapeHtml(m.detalle)}</td><td>${formatearMoneda(m.monto)}</td></tr>`;
      }
      if (m.tipo === 'pago') {
        totalPagos += m.monto;
      }
    });

    if (!htmlCargos) htmlCargos = '<tr><td colspan="2">No hay cargos este mes.</td></tr>';

    document.getElementById('rep-arr-cargos').innerHTML = htmlCargos;
    document.getElementById('rep-arr-total-cargos').textContent = formatearMoneda(totalCargos);
    document.getElementById('rep-arr-total-pagos').textContent = '- ' + formatearMoneda(totalPagos);
    
    const saldo = totalCargos - totalPagos;
    const spanSaldo = document.getElementById('rep-arr-saldo');
    spanSaldo.textContent = formatearMoneda(saldo);
    spanSaldo.style.color = saldo > 0 ? '#dc2626' : '#166534';

    resultado.style.display = 'grid';
  }

  function generarArrendatario() {
    const contratoId = document.getElementById('rep-arr-contrato').value;
    const mes = document.getElementById('rep-arr-mes').value;
    
    if (!contratoId || !mes) {
      alert('Selecciona el contrato y el mes.');
      return;
    }

    const contratos = ModuloContratos.listar();
    const arrendatarios = ModuloArrendatarios.listar();
    
    const c = contratos.find(x => x.id === contratoId);
    const arr = arrendatarios.find(x => x.id === c.arrendatarioId);

    if (!arr) {
      alert('No se encontró el arrendatario.');
      return;
    }

    const correos = (arr.correos && arr.correos.length > 0) ? arr.correos.join(',') : '';
    const totalCargos = document.getElementById('rep-arr-total-cargos').textContent;
    const totalPagos = document.getElementById('rep-arr-total-pagos').textContent;
    const saldo = document.getElementById('rep-arr-saldo').textContent;

    const asunto = encodeURIComponent(`Estado de Cuenta - ${mes}`);
    const cuerpo = encodeURIComponent(
      `Hola ${arr.nombre},\n\n` +
      `Este es tu estado de cuenta para el mes ${mes}:\n\n` +
      `Total Cargos: ${totalCargos}\n` +
      `Total Pagos: ${totalPagos}\n` +
      `-------------------------\n` +
      `SALDO PENDIENTE: ${saldo}\n\n` +
      `Gracias por tu atención.\n\nInmoGestión`
    );

    window.open(`mailto:${correos}?subject=${asunto}&body=${cuerpo}`, '_blank');
  }

  // ---------- UTILIDADES ----------
  function cargarContratosSelect(idSelect) {
    const sel = document.getElementById(idSelect);
    if (!sel) return;

    const contratos = ModuloContratos.listar();
    const inmuebles = ModuloInmuebles.listar();
    const copropiedades = ModuloCopropiedades.listar();
    const arrendatarios = ModuloArrendatarios.listar();

    let html = '<option value="">— Seleccionar contrato —</option>';
    
    // MAGIA: Armamos un texto muy descriptivo para que no haya errores
    html += contratos.map(c => {
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
      
      if (arr) {
        texto += ` | Arrendatario: ${escapeHtml(arr.nombre)}`;
      }

      return `<option value="${c.id}">${texto}</option>`;
    }).join('');
    
    sel.innerHTML = html;
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-screen="rep-propietario"]') || e.target.closest('[data-screen="rep-arrendatario"]')) {
      setTimeout(() => {
        cargarContratosSelect('rep-prop-contrato');
        cargarContratosSelect('rep-arr-contrato');
      }, 100);
    }
  });

  function init() {
    initPropietario();
    initArrendatario();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {};
})();