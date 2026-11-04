// ============================================================
// reporte-propietario.js  ·  Módulo independiente: Informe Propietario
// ============================================================

const ModuloReportePropietario = (() => {

  function formatearMoneda(num) {
    return '$ ' + Number(num || 0).toLocaleString('es-CO');
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function init() {
    const screen = document.getElementById('screen-rep-propietario');
    if (!screen) return;

    const cardViejo = screen.querySelector('.card');
    if (!cardViejo) return;

    const btn = screen.querySelector('.actions .btn.primary');
    if (btn) {
      btn.removeAttribute('data-soon');
      btn.textContent = 'Calcular y Enviar Correo';
      btn.onclick = generarPropietario;
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
          <input type="date" id="rep-prop-mes" style="width: 100%;">
        </div>
      </div>

      <h3 class="mt">Fórmula del Informe</h3>
      <p class="hint">Ingresos (Arriendo) − Comisión (${pctComision}%) − IVA (${pctIva}%) − Gastos = Neto</p>
      
      <div id="rp-alerta" class="note" style="display:none; background:#fef2f2; border-color:#fca5a5; color:#991b1b; margin-top:15px;">
        <strong>⚠️ Informe Bloqueado:</strong> <span id="rp-alerta-texto"></span>
      </div>

      <table class="mt" id="rep-prop-tabla" style="display:none;">
        <tbody>
          <tr><td>Ingresos (Solo Arriendo)</td><td id="rp-ingresos">$ 0</td></tr>
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

  function extraerArriendo(detalle) {
    const match = detalle.match(/Arriendo:\s*\$?\s*([\d.,]+)/);
    if (match && match[1]) {
      const valorStr = match[1].replace(/\./g, '').replace(/,/g, '');
      return Number(valorStr) || 0;
    }
    return 0;
  }

  function calcularPropietario() {
    const contratoId = document.getElementById('rep-prop-contrato').value;
    const fechaInput = document.getElementById('rep-prop-mes').value;
    const tabla = document.getElementById('rep-prop-tabla');
    const alerta = document.getElementById('rp-alerta');
    const alertaTexto = document.getElementById('rp-alerta-texto');

    if (!contratoId || !fechaInput) {
      if (tabla) tabla.style.display = 'none';
      if (alerta) alerta.style.display = 'none';
      return;
    }

    const mes = fechaInput.substring(0, 7);
    const cobros = Store.get('cobros', []);
    const params = ModuloParametros.getParametros();
    const pctComision = (params.comision || 10) / 100;
    const pctIva = (params.iva || 19) / 100;

    const movs = cobros.filter(c => c.contratoId === contratoId && c.fecha && c.fecha.startsWith(mes));

    let ingresosArriendoCargado = 0;
    let pagosValidados = 0;
    let gastosPropietario = 0;
    let hayPagoNoValidado = false;
    let hayPagoValidado = false;

    movs.forEach(m => {
      if (m.tipo === 'cargo') {
        ingresosArriendoCargado += extraerArriendo(m.detalle);
      }
      if (m.tipo === 'pago') {
        if (m.detalle.includes('[Validado]')) {
          pagosValidados += m.monto;
          hayPagoValidado = true;
        } else {
          hayPagoNoValidado = true;
        }
      }
      if (m.tipo === 'gasto' && m.detalle.includes('Propietario')) {
        gastosPropietario += m.monto;
      }
    });

    let puedeGenerar = true;
    let mensajeError = "";

    if (!hayPagoValidado && hayPagoNoValidado) {
      puedeGenerar = false;
      mensajeError = "Existen pagos registrados en este mes, pero NO han sido validados contra el extracto bancario. Ve a Financiero > Pagos y valídalos.";
    } else if (pagosValidados === 0) {
      puedeGenerar = false;
      mensajeError = "No se han registrado pagos válidos para este mes.";
    } else if (pagosValidados < ingresosArriendoCargado) {
      puedeGenerar = false;
      mensajeError = `El pago validado (${formatearMoneda(pagosValidados)}) es menor al arriendo cargado (${formatearMoneda(ingresosArriendoCargado)}). El arrendatario no ha pagado completo.`;
    }

    if (!puedeGenerar) {
      alerta.style.display = 'block';
      alertaTexto.textContent = mensajeError;
      tabla.style.display = 'none';
      return;
    }

    alerta.style.display = 'none';
    
    const baseCalculo = ingresosArriendoCargado;
    const comision = baseCalculo * pctComision;
    const iva = comision * pctIva;
    const neto = baseCalculo - comision - iva - gastosPropietario;

    document.getElementById('rp-ingresos').textContent = formatearMoneda(baseCalculo);
    document.getElementById('rp-comision').textContent = '- ' + formatearMoneda(comision);
    document.getElementById('rp-iva').textContent = '- ' + formatearMoneda(iva);
    document.getElementById('rp-gastos').textContent = '- ' + formatearMoneda(gastosPropietario);
    document.getElementById('rp-neto').textContent = formatearMoneda(neto);

    tabla.style.display = 'table';
  }

  function generarPropietario() {
    const contratoId = document.getElementById('rep-prop-contrato').value;
    const fechaInput = document.getElementById('rep-prop-mes').value;
    
    if (!contratoId || !fechaInput) return alert('Selecciona el contrato y el mes.');

    const tabla = document.getElementById('rep-prop-tabla');
    if (tabla.style.display === 'none') {
      return alert('No se puede enviar el correo. Revisa las alertas rojas en la pantalla.');
    }

    const fechaObj = new Date(fechaInput + 'T00:00:00');
    let mesLetras = fechaObj.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    mesLetras = mesLetras.charAt(0).toUpperCase() + mesLetras.slice(1); 

    const mesClave = fechaInput.substring(0, 7);
    const contratos = ModuloContratos.listar();
    const inmuebles = ModuloInmuebles.listar();
    const copropiedades = ModuloCopropiedades.listar();
    const propietarios = ModuloPropietarios.listar();
    
    const c = contratos.find(x => x.id === contratoId);
    const inm = inmuebles.find(x => x.id === c.inmuebleId);
    
    let inmuebleTexto = inm ? inm.codigo : 'Inmueble';
    if (inm && inm.copropiedad) {
      const cop = copropiedades.find(x => x.id === inm.copropiedad);
      if (cop) inmuebleTexto += ` - ${cop.nombre}`;
    }

    const propId = inm.propietarios && inm.propietarios.length > 0 ? inm.propietarios[0].id : null;
    const prop = propietarios.find(x => x.id === propId);

    if (!prop) return alert('El inmueble no tiene un propietario asignado.');
    
    const correos = (prop.correos && prop.correos.length > 0) ? prop.correos.join(',') : '';

    const cobros = Store.get('cobros', []);
    const movs = cobros.filter(m => m.contratoId === contratoId && m.fecha && m.fecha.startsWith(mesClave));
    
    let ingresosArriendo = 0;
    let gastosPropietario = 0;
    let gastosDetalle = [];

    movs.forEach(m => {
      if (m.tipo === 'cargo') {
        ingresosArriendo += extraerArriendo(m.detalle);
      }
      if (m.tipo === 'gasto' && m.detalle.includes('Propietario')) {
        gastosPropietario += m.monto;
        gastosDetalle.push({
          concepto: m.detalle.split('(')[0].trim(),
          monto: m.monto,
          soporte: m.soporte || null 
        });
      }
    });

    const params = ModuloParametros.getParametros();
    const comision = ingresosArriendo * ((params.comision || 10) / 100);
    const iva = comision * ((params.iva || 19) / 100);
    const neto = ingresosArriendo - comision - iva - gastosPropietario;

    ModuloPlantillas.generarPropietario({
      correos: correos,
      propietarioNombre: prop.nombre,
      mesLetras: mesLetras,
      inmuebleTexto: inmuebleTexto,
      ingresos: ingresosArriendo, 
      comision: comision,
      iva: iva,
      gastos: gastosPropietario,
      gastosDetalle: gastosDetalle,
      neto: neto
    });
  }

  function cargarContratosSelect(idSelect) {
    const sel = document.getElementById(idSelect);
    if (!sel) return;

    const contratos = ModuloContratos.listar();
    const inmuebles = ModuloInmuebles.listar();
    const copropiedades = ModuloCopropiedades.listar();
    const arrendatarios = ModuloArrendatarios.listar();

    let html = '<option value="">— Seleccionar contrato —</option>';
    
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
      if (arr) texto += ` | Arrendatario: ${escapeHtml(arr.nombre)}`;
      return `<option value="${c.id}">${texto}</option>`;
    }).join('');
    
    sel.innerHTML = html;
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-screen="rep-propietario"]')) {
      setTimeout(() => cargarContratosSelect('rep-prop-contrato'), 50);
    }
  });

  // === FUNCIÓN PARA CONECTAR DESDE EL DETALLE ===
  function abrirReporte(idContrato) {
    if (typeof showScreen === 'function') showScreen('rep-propietario');
    
    setTimeout(() => {
      const sel = document.getElementById('rep-prop-contrato');
      if (sel) {
        sel.value = idContrato;
        sel.dispatchEvent(new Event('change'));
      }
    }, 150);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { init, abrirReporte };
})();