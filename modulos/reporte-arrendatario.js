// ============================================================
// reporte-arrendatario.js  ·  Módulo independiente: Informe Arrendatario
// ============================================================

const ModuloReporteArrendatario = (() => {

  const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  function formatearMoneda(num) {
    return '$ ' + Number(num || 0).toLocaleString('es-CO');
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function init() {
    const screen = document.getElementById('screen-rep-arrendatario');
    if (!screen) return;

    const btn = screen.querySelector('.actions .btn.primary');
    if (btn) {
      btn.removeAttribute('data-soon');
      btn.textContent = 'Generar y Enviar Correo';
      btn.onclick = generarArrendatario;
    }

    const cardViejo = screen.querySelector('.card');
    if (!cardViejo) return;

    cardViejo.innerHTML = `
      <div class="form mb mt">
        <div class="field">
          <label>Seleccionar Contrato</label>
          <select id="rep-arr-contrato">
            <option value="">— Seleccionar contrato —</option>
          </select>
        </div>
        <div class="field">
          <label>Mes a Reportar</label>
          <input type="date" id="rep-arr-mes" style="width: 100%;">
        </div>
      </div>

      <div class="grid g2 mt" id="rep-arr-resultado" style="display:none;">
        
        <div class="card" style="background:#f0f5ff; border-color:#d6e2ff; height: fit-content;">
          <h3 style="color:#1e3a8a; margin-bottom:10px;">Resumen Financiero</h3>
          <div id="rep-arr-estado-badge" style="text-align:center; margin-bottom: 15px;"></div>
          
          <table style="width:100%; font-size:14px; border-collapse:collapse;">
            <tbody>
              <tr>
                <td colspan="2" style="border:none; padding-bottom:5px;">
                  <strong style="color:#991b1b;">Saldo de meses anteriores:</strong>
                  <ul id="rep-arr-lista-deudas" style="margin: 5px 0 10px 15px; padding:0; color:#991b1b; font-size:13px;"></ul>
                </td>
              </tr>
              <tr style="border-top: 1px dashed #ccc;">
                <td style="border:none; padding-top:10px; font-weight:bold;">Cargos de este mes:</td>
                <td style="border:none; text-align:right; padding-top:10px; font-weight:bold;" id="rep-arr-cargos-mes">$ 0</td>
              </tr>
              <tr>
                <td style="border:none; font-size:15px; padding-top:5px;"><strong>Total a Pagar:</strong></td>
                <td style="border:none; text-align:right; padding-top:5px;"><strong id="rep-arr-total-pagar" style="font-size:15px;">$ 0</strong></td>
              </tr>
              <tr>
                <td style="border:none; color:#166534; padding-top:5px;">Pagos recibidos este mes:</td>
                <td style="border:none; text-align:right; color:#166534; padding-top:5px;">- <span id="rep-arr-pagos-mes">$ 0</span></td>
              </tr>
              <tr style="border-top:2px solid #e3e8ef;">
                <td style="padding-top:10px; font-size:16px;"><strong>Saldo Neto (Deuda Total):</strong></td>
                <td style="padding-top:10px; text-align:right;"><strong id="rep-arr-saldo" style="font-size:16px;">$ 0</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="card">
          <h3 style="border-bottom: 2px solid #2563eb; padding-bottom:5px; color:#2563eb;">Factura de Cargos</h3>
          <table class="mt">
            <tbody id="rep-arr-cargos-detalle"></tbody>
          </table>
        </div>
      </div>
    `;

    cargarContratosSelect('rep-arr-contrato');

    document.getElementById('rep-arr-contrato').addEventListener('change', calcularArrendatario);
    document.getElementById('rep-arr-mes').addEventListener('change', calcularArrendatario);
  }

  function calcularArrendatario() {
    const contratoId = document.getElementById('rep-arr-contrato').value;
    const fechaInput = document.getElementById('rep-arr-mes').value;
    const resultado = document.getElementById('rep-arr-resultado');

    if (!contratoId || !fechaInput) {
      if (resultado) resultado.style.display = 'none';
      return;
    }

    const mesClave = fechaInput.substring(0, 7);
    const todosLosMovs = Store.get('cobros', []).filter(c => c.contratoId === contratoId);
    
    // 1. ARRASTRAR EL SALDO DE MESES ANTERIORES (AUDITORÍA CORREGIDA)
    const deudasPorMes = {};
    const movsAnteriores = todosLosMovs.filter(m => m.fecha.substring(0, 7) < mesClave);
    
    movsAnteriores.forEach(m => {
      const mesMov = m.fecha.substring(0, 7);
      if (!deudasPorMes[mesMov]) deudasPorMes[mesMov] = 0;
      
      // AHORA SÍ: Sumamos cargos, sumamos gastos del arrendatario, y restamos pagos.
      if (m.tipo === 'cargo') deudasPorMes[mesMov] += m.monto;
      if (m.tipo === 'gasto' && !m.detalle.includes('Propietario')) deudasPorMes[mesMov] += m.monto;
      if (m.tipo === 'pago') deudasPorMes[mesMov] -= m.monto;
    });

    let deudaAnteriorTotal = 0;
    let htmlListaDeudas = '';
    
    Object.keys(deudasPorMes).sort().forEach(mes => {
      if (deudasPorMes[mes] > 0) {
        deudaAnteriorTotal += deudasPorMes[mes];
        const [anio, mesNum] = mes.split('-');
        const nombreMes = MESES[parseInt(mesNum) - 1] + ' ' + anio;
        htmlListaDeudas += `<li>Saldo pendiente de <strong>${nombreMes}</strong>: ${formatearMoneda(deudasPorMes[mes])}</li>`;
      }
    });

    if (!htmlListaDeudas) htmlListaDeudas = '<li style="color:#16a34a;">Está al día con meses anteriores.</li>';

    // 2. PROCESAR EL MES ACTUAL
    const movsMes = todosLosMovs.filter(m => m.fecha.startsWith(mesClave));
    let sumArriendo = 0, sumAdmin = 0, sumParqueadero = 0, sumGastosArrendatario = 0, pagosMes = 0, notas = [];

    movsMes.forEach(m => {
      if (m.tipo === 'cargo') {
        const matchArr = m.detalle.match(/Arriendo:\s*\$?\s*([\d.,]+)/);
        const matchAdm = m.detalle.match(/Admin:\s*\$?\s*([\d.,]+)/);
        const matchPar = m.detalle.match(/Parqueadero:\s*\$?\s*([\d.,]+)/);
        
        if (matchArr) sumArriendo += Number(matchArr[1].replace(/\./g, '').replace(/,/g, '')) || 0;
        if (matchAdm) sumAdmin += Number(matchAdm[1].replace(/\./g, '').replace(/,/g, '')) || 0;
        if (matchPar) sumParqueadero += Number(matchPar[1].replace(/\./g, '').replace(/,/g, '')) || 0;
        
        const notaIndex = m.detalle.indexOf('| Nota:');
        if (notaIndex !== -1) {
          let notaStr = m.detalle.substring(notaIndex + 7).trim().split('|')[0].trim(); 
          if(notaStr && !notas.includes(notaStr)) notas.push(notaStr);
        }
      }
      if (m.tipo === 'gasto' && !m.detalle.includes('Propietario')) {
        sumGastosArrendatario += m.monto;
      }
      if (m.tipo === 'pago') pagosMes += m.monto;
    });

    const totalCargosMes = sumArriendo + sumAdmin + sumParqueadero + sumGastosArrendatario;
    const totalAPagar = deudaAnteriorTotal + totalCargosMes;
    const saldoNeto = totalAPagar - pagosMes;

    // 3. ARMAR EL DESGLOSE
    let htmlDetalle = '';
    if (sumArriendo > 0) htmlDetalle += `<tr><td>Arriendo</td><td style="text-align:right;">${formatearMoneda(sumArriendo)}</td></tr>`;
    if (sumAdmin > 0) htmlDetalle += `<tr><td>Administración</td><td style="text-align:right;">${formatearMoneda(sumAdmin)}</td></tr>`;
    if (sumParqueadero > 0) htmlDetalle += `<tr><td>Parqueadero</td><td style="text-align:right;">${formatearMoneda(sumParqueadero)}</td></tr>`;
    
    const gastosLista = movsMes.filter(m => m.tipo === 'gasto' && !m.detalle.includes('Propietario'));
    if (gastosLista.length > 0) {
      htmlDetalle += `<tr><td colspan="2" style="padding-top:10px;"><strong>Gastos a tu cargo:</strong></td></tr>`;
      gastosLista.forEach(g => {
        let concepto = g.detalle.split('(')[0].trim();
        htmlDetalle += `<tr><td style="padding-left:15px;"><small>${escapeHtml(concepto)}</small></td><td style="text-align:right;"><small>${formatearMoneda(g.monto)}</small></td></tr>`;
      });
    }

    if (notas.length > 0) {
      htmlDetalle += `<tr><td colspan="2" style="padding-top:10px;"><strong>Notas:</strong></td></tr>`;
      notas.forEach(n => {
        htmlDetalle += `<tr><td colspan="2" style="padding-left:15px; color:#92400e; font-size:13px;"><em>${escapeHtml(n)}</em></td></tr>`;
      });
    }

    if (!htmlDetalle) htmlDetalle = '<tr><td colspan="2">No hay cargos este mes.</td></tr>';
    htmlDetalle += `<tr style="border-top:1px solid #ccc;"><td><strong>TOTAL CARGOS MES:</strong></td><td style="text-align:right;"><strong>${formatearMoneda(totalCargosMes)}</strong></td></tr>`;

    document.getElementById('rep-arr-lista-deudas').innerHTML = htmlListaDeudas;
    document.getElementById('rep-arr-cargos-mes').textContent = formatearMoneda(totalCargosMes);
    document.getElementById('rep-arr-total-pagar').textContent = formatearMoneda(totalAPagar);
    document.getElementById('rep-arr-pagos-mes').textContent = formatearMoneda(pagosMes);
    document.getElementById('rep-arr-cargos-detalle').innerHTML = htmlDetalle;

    const saldoSpan = document.getElementById('rep-arr-saldo');
    saldoSpan.textContent = formatearMoneda(saldoNeto);

    const badgeDiv = document.getElementById('rep-arr-estado-badge');
    if (saldoNeto <= 0) {
      badgeDiv.innerHTML = '<span class="badge" style="background:#dcfce7; color:#166534; font-size:16px; padding:8px 16px;">✔ AL DÍA</span>';
      saldoSpan.style.color = '#166534';
    } else {
      badgeDiv.innerHTML = '<span class="badge" style="background:#fee2e2; color:#991b1b; font-size:16px; padding:8px 16px;">⚠ EN DEUDA</span>';
      saldoSpan.style.color = '#dc2626';
    }

    resultado.style.display = 'grid';
  }

  function generarArrendatario() {
    const contratoId = document.getElementById('rep-arr-contrato').value;
    const fechaInput = document.getElementById('rep-arr-mes').value;
    
    if (!contratoId || !fechaInput) return alert('Selecciona el contrato y el mes.');

    const fechaObj = new Date(fechaInput + 'T00:00:00');
    let mesLetras = fechaObj.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    mesLetras = mesLetras.charAt(0).toUpperCase() + mesLetras.slice(1);

    const contratos = ModuloContratos.listar();
    const arrendatarios = ModuloArrendatarios.listar();
    const inmuebles = ModuloInmuebles.listar();
    const copropiedades = ModuloCopropiedades.listar();
    
    const c = contratos.find(x => x.id === contratoId);
    const arr = arrendatarios.find(x => x.id === c.arrendatarioId);
    const inm = inmuebles.find(x => x.id === c.inmuebleId);

    if (!arr) return alert('No se encontró el arrendatario.');

    let inmuebleTexto = inm ? inm.codigo : 'Inmueble';
    if (inm && inm.copropiedad) {
      const cop = copropiedades.find(x => x.id === inm.copropiedad);
      if (cop) inmuebleTexto += ` (${cop.nombre})`;
    }
    
    let correoDestino = '';
    if (arr.correos && Array.isArray(arr.correos) && arr.correos.length > 0) {
      correoDestino = arr.correos[0]; 
    } else if (typeof arr.correo === 'string') {
      correoDestino = arr.correo; 
    }

    const deudasHTML = document.getElementById('rep-arr-lista-deudas').innerHTML;
    const detalleHTML = document.getElementById('rep-arr-cargos-detalle').innerHTML;

    let deudasTexto = deudasHTML.replace(/<li>/g, '&nbsp;&nbsp;&nbsp;- ').replace(/<\/li>/g, '<br>').replace(/<strong>/g, '<b>').replace(/<\/strong>/g, '</b>');
    
    let detalleTexto = detalleHTML
      .replace(/<tr[^>]*>/g, '')
      .replace(/<\/tr>/g, '<br>')
      .replace(/<td[^>]*>/g, '')
      .replace(/<\/td>/g, ' ')
      .replace(/<small>/g, '')
      .replace(/<\/small>/g, '')
      .replace(/<em>/g, '<i>')
      .replace(/<\/em>/g, '</i>')
      .replace(/<strong>/g, '<b>')
      .replace(/<\/strong>/g, '</b>');

    const cargosMes = Number(document.getElementById('rep-arr-cargos-mes').textContent.replace(/[^0-9]/g, '')) || 0;
    const pagosMes = Number(document.getElementById('rep-arr-pagos-mes').textContent.replace(/[^0-9]/g, '')) || 0;
    const saldoNeto = Number(document.getElementById('rep-arr-saldo').textContent.replace(/[^0-9]/g, '')) || 0;
    const totalPagar = Number(document.getElementById('rep-arr-total-pagar').textContent.replace(/[^0-9]/g, '')) || 0;

    ModuloPlantillas.generarArrendatario({
      correos: correoDestino, 
      arrendatarioNombre: arr.nombre,
      mesLetras: mesLetras,
      inmuebleTexto: inmuebleTexto,
      deudasTexto: deudasTexto, 
      cargosMes: cargosMes,
      totalAPagar: totalPagar,
      pagosMes: pagosMes,
      saldoNeto: saldoNeto,
      detalleTexto: detalleTexto 
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
    if (e.target.closest('[data-screen="rep-arrendatario"]')) {
      setTimeout(() => cargarContratosSelect('rep-arr-contrato'), 50);
    }
  });

  // === FUNCIÓN PARA CONECTAR DESDE EL DETALLE ===
  function abrirReporte(idContrato) {
    if (typeof showScreen === 'function') showScreen('rep-arrendatario');
    
    setTimeout(() => {
      const sel = document.getElementById('rep-arr-contrato');
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