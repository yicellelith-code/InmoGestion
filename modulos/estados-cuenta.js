// ============================================================
// estados-cuenta.js  ·  Módulo independiente: Estados de Cuenta
// ============================================================

const ModuloEstadosCuenta = (() => {
  const KEY = 'cobros';

  function cargar() { return Store.get(KEY, []); }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function formatearMoneda(num) {
    return '$ ' + Number(num || 0).toLocaleString('es-CO');
  }

  // Función auxiliar para extraer solo el arriendo del texto del cargo
  function extraerArriendo(detalle) {
    const match = detalle.match(/Arriendo:\s*\$?\s*([\d.,]+)/);
    if (match && match[1]) {
      const valorStr = match[1].replace(/\./g, '').replace(/,/g, '');
      return Number(valorStr) || 0;
    }
    return 0;
  }

  function renderizar() {
    const screen = document.getElementById('screen-estados-cuenta');
    if (!screen) return;

    const card = screen.querySelector('.card');
    const actions = screen.querySelector('.actions');
    
    if (card && !card.dataset.built) {
      card.dataset.built = 'true';
      
      if (actions) {
        actions.innerHTML = `
          <select id="ec-selector" style="min-width: 450px; max-width: 100%; margin-bottom: 5px;">
            <option value="">— Seleccionar contrato —</option>
          </select>
          <select id="ec-filtro-mes" style="min-width: 200px; margin-bottom: 5px;">
            <option value="">— Todos los meses —</option>
          </select>
          <button class="btn" id="ec-btn-limpiar" style="margin-bottom: 5px;">Ver Todo</button>
        `;
        document.getElementById('ec-selector').addEventListener('change', renderizarTabla);
        document.getElementById('ec-filtro-mes').addEventListener('change', renderizarTabla);
        document.getElementById('ec-btn-limpiar').addEventListener('click', () => {
          document.getElementById('ec-filtro-mes').value = '';
          renderizarTabla();
        });
      }

      card.innerHTML = `
        <div id="ec-empty" class="note" style="text-align:center; padding:40px;">
          <h3>No hay contrato seleccionado</h3>
          <p>Elige un contrato en el menú de arriba para ver su estado de cuenta.</p>
        </div>
        
        <div id="ec-contenido" style="display:none;">
          
          <!-- Bloque Arrendatario -->
          <h3 style="margin-top:20px; color:#2563eb; border-bottom:2px solid #bfd3ff; padding-bottom:5px;">Estado de Cuenta: Arrendatario</h3>
          <div style="overflow-x:auto;">
            <table class="mt">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto / Detalle</th>
                  <th>Cargos (Deuda)</th>
                  <th>Pagos (Abonos)</th>
                </tr>
              </thead>
              <tbody id="ec-tbody-arr"></tbody>
              <tfoot id="ec-tfoot-arr" style="background:#f8fafc;"></tfoot>
            </table>
          </div>

          <!-- Bloque Propietario -->
          <h3 style="margin-top:30px; color:#166534; border-bottom:2px solid #bbf7d0; padding-bottom:5px;">Estado de Cuenta: Propietario</h3>
          <div style="overflow-x:auto;">
            <table class="mt">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto / Detalle</th>
                  <th>Recaudo (Arriendo)</th>
                  <th>Gastos (Descuentos)</th>
                </tr>
              </thead>
              <tbody id="ec-tbody-prop"></tbody>
              <tfoot id="ec-tfoot-prop" style="background:#f8fafc;"></tfoot>
            </table>
          </div>

          <!-- Resumen Final -->
          <div class="grid g2 mt">
            <div class="card" style="background:#f0f5ff; border-color:#d6e2ff;">
              <h3 style="color:#1e3a8a; margin-bottom:10px;">Resumen del Arrendatario</h3>
              <p class="hint">Cargos + Gastos - Pagos.</p>
              <div id="ec-saldo-arr" style="font-size:24px; font-weight:bold; margin-top:10px;"></div>
            </div>
            <div class="card" style="background:#fffbeb; border-color:#fcd34d;">
              <h3 style="color:#92400e; margin-bottom:10px;">Resumen del Propietario</h3>
              <p class="hint">Arriendo Recaudado - Comisión - IVA - Gastos.</p>
              <div id="ec-saldo-prop" style="font-size:24px; font-weight:bold; margin-top:10px;"></div>
            </div>
          </div>

        </div>
      `;
    }

    // 2. Llenar el selector de contratos y de meses
    const selector = document.getElementById('ec-selector');
    const selectMes = document.getElementById('ec-filtro-mes');
    const contratos = ModuloContratos.listar();
    const inmuebles = ModuloInmuebles.listar();
    const copropiedades = ModuloCopropiedades.listar();
    const arrendatarios = ModuloArrendatarios.listar();

    if (selector && selector.options.length <= 1) {
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
      selector.innerHTML = html;

      // Llenar el selector de meses (últimos 2 años)
      const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      let opcionesMeses = '<option value="">— Todos los meses —</option>';
      const hoy = new Date();
      
      for (let anio = hoy.getFullYear(); anio >= hoy.getFullYear() - 1; anio--) {
        for (let mes = 11; mes >= 0; mes--) {
          if (anio === hoy.getFullYear() && mes > hoy.getMonth()) continue;
          const valor = `${anio}-${String(mes + 1).padStart(2, '0')}`;
          opcionesMeses += `<option value="${valor}">${nombresMeses[mes]} ${anio}</option>`;
        }
      }
      selectMes.innerHTML = opcionesMeses;
    }

    renderizarTabla();
  }

  function renderizarTabla() {
    const selector = document.getElementById('ec-selector');
    const filtroMes = document.getElementById('ec-filtro-mes')?.value;
    const contenido = document.getElementById('ec-contenido');
    const empty = document.getElementById('ec-empty');

    if (!selector || !contenido || !empty) return;

    const contratoId = selector.value;

    if (!contratoId) {
      contenido.style.display = 'none';
      empty.style.display = 'block';
      return;
    }

    contenido.style.display = 'block';
    empty.style.display = 'none';

    let movs = cargar().filter(m => m.contratoId === contratoId);
    if (filtroMes) movs = movs.filter(m => m.fecha.startsWith(filtroMes));

    // Separar movimientos
    const movsArrendatario = [];
    const movsPropietario = [];

    movs.forEach(m => {
      if (m.tipo === 'gasto') {
        if (m.detalle.includes('Propietario')) {
          movsPropietario.push(m);
        } else {
          movsArrendatario.push(m);
        }
      } else {
        movsArrendatario.push(m);
      }
    });

    movsArrendatario.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    movsPropietario.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    // --- RENDERIZAR ARRENDATARIO ---
    const tbodyArr = document.getElementById('ec-tbody-arr');
    const tfootArr = document.getElementById('ec-tfoot-arr');
    
    let totalCargosArr = 0;
    let totalPagosArr = 0;

    if (movsArrendatario.length === 0) {
      tbodyArr.innerHTML = '<tr class="empty"><td colspan="4">No hay movimientos para el arrendatario en este período.</td></tr>';
      tfootArr.innerHTML = '';
    } else {
      tbodyArr.innerHTML = movsArrendatario.map(m => {
        let cargo = 0, pago = 0;
        if (m.tipo === 'cargo') { cargo = m.monto; totalCargosArr += m.monto; }
        if (m.tipo === 'pago') { pago = m.monto; totalPagosArr += m.monto; }
        if (m.tipo === 'gasto') { cargo = m.monto; totalCargosArr += m.monto; } 

        return `
          <tr>
            <td>${escapeHtml(m.fecha)}</td>
            <td><small>${escapeHtml(m.detalle)}</small></td>
            <td>${cargo > 0 ? formatearMoneda(cargo) : '—'}</td>
            <td style="color:#166534;">${pago > 0 ? formatearMoneda(pago) : '—'}</td>
          </tr>
        `;
      }).join('');

      const saldoArr = totalCargosArr - totalPagosArr;
      const colorSaldoArr = saldoArr > 0 ? '#dc2626' : (saldoArr < 0 ? '#16a34a' : '#101828');
      
      tfootArr.innerHTML = `
        <tr style="font-weight:bold; border-top:2px solid #e2e8f0;">
          <td colspan="2" style="text-align:right;">TOTALES:</td>
          <td>${formatearMoneda(totalCargosArr)}</td>
          <td style="color:#166534;">${formatearMoneda(totalPagosArr)}</td>
        </tr>
        <tr>
          <td colspan="2" style="text-align:right; font-size:15px;">SALDO FINAL:</td>
          <td colspan="2"><strong style="color:${colorSaldoArr}; font-size:16px;">${formatearMoneda(Math.abs(saldoArr))}</strong></td>
        </tr>
      `;
      
      let estadoArrTxt = saldoArr > 0 ? 'Pendiente de pago' : (saldoArr < 0 ? 'A favor' : 'Al día');
      document.getElementById('ec-saldo-arr').innerHTML = `<span style="color:${colorSaldoArr};">${formatearMoneda(Math.abs(saldoArr))}</span> <br><small style="font-size:14px; font-weight:normal; color:#667085;">${estadoArrTxt}</small>`;
    }

    // --- RENDERIZAR PROPIETARIO ---
    const tbodyProp = document.getElementById('ec-tbody-prop');
    const tfootProp = document.getElementById('ec-tfoot-prop');
    
    let ingresosProp = 0; 
    let totalGastosProp = 0;

    // Obtenemos los parametros
    const params = ModuloParametros.getParametros();
    const pctComision = (params.comision || 10) / 100;
    const pctIva = (params.iva || 19) / 100;

    // CORRECCIÓN AQUÍ: Buscamos el arriendo cargado en los cargos del mes
    movs.filter(m => m.tipo === 'cargo').forEach(m => {
      ingresosProp += extraerArriendo(m.detalle);
    });

    // Si el recaudo real (pagos) es menor al arriendo, el propietario solo recibe lo que entró
    let baseParaPropietario = Math.min(ingresosProp, totalPagosArr);
    
    // Si el recaudo fue mayor al arriendo (pagó arriendo + admin), solo se le comisiona sobre el arriendo
    if (totalPagosArr > ingresosProp) {
      baseParaPropietario = ingresosProp; 
    }

    if (movsPropietario.length === 0) {
      tbodyProp.innerHTML = '<tr class="empty"><td colspan="4">No hay gastos a cargo del propietario.</td></tr>';
    } else {
      tbodyProp.innerHTML = movsPropietario.map(m => {
        if (m.tipo === 'gasto') totalGastosProp += m.monto;
        return `
          <tr>
            <td>${escapeHtml(m.fecha)}</td>
            <td><small>${escapeHtml(m.detalle)}</small></td>
            <td style="color:#166534;">—</td>
            <td style="color:#92400e;">${formatearMoneda(m.monto)}</td>
          </tr>
        `;
      }).join('');
    }

    // Cálculos finales del propietario
    const comision = baseParaPropietario * pctComision;
    const iva = comision * pctIva;
    
    const saldoProp = baseParaPropietario - comision - iva - totalGastosProp;
    const colorSaldoProp = saldoProp >= 0 ? '#166534' : '#dc2626';

    tfootProp.innerHTML = `
      <tr style="font-weight:bold; border-top:2px solid #e2e8f0;">
        <td colspan="2" style="text-align:right;">TOTALES:</td>
        <td style="color:#166534;">${formatearMoneda(baseParaPropietario)}</td>
        <td style="color:#92400e;">${formatearMoneda(totalGastosProp)}</td>
      </tr>
      <tr>
        <td colspan="2" style="text-align:right; font-size:15px;">SALDO FINAL:</td>
        <td colspan="2"><strong style="color:${colorSaldoProp}; font-size:16px;">${formatearMoneda(Math.abs(saldoProp))}</strong></td>
      </tr>
    `;
    
    let estadoPropTxt = saldoProp >= 0 ? 'Pendiente por consignar al propietario' : 'Propietario debe a la inmobiliaria';
    document.getElementById('ec-saldo-prop').innerHTML = `<span style="color:${colorSaldoProp};">${formatearMoneda(Math.abs(saldoProp))}</span> <br><small style="font-size:14px; font-weight:normal; color:#667085;">${estadoPropTxt}</small>`;
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-screen="estados-cuenta"]')) setTimeout(renderizar, 50);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderizar);
  else renderizar();

  return { renderizar };
})();