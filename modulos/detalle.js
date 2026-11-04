// ============================================================
// detalle.js  ·  Módulo independiente: Detalle del Contrato
// ============================================================

const ModuloDetalle = (() => {
  
  let contratoActualId = null;

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function formatearMoneda(num) {
    return '$ ' + Number(num || 0).toLocaleString('es-CO');
  }

  function abrirContrato(id) {
    contratoActualId = id || null;
    if (typeof showScreen === 'function') showScreen('contrato-detalle');
    
    // RETRASO INTELIGENTE: Espera 50ms a que la pantalla se muestre antes de inyectar los datos
    setTimeout(() => {
      renderizar();
    }, 50);
  }

  function renderizar() {
    const screen = document.getElementById('screen-contrato-detalle');
    if (!screen) return;

    // 1. Selector superior
    let headerActions = screen.querySelector('.screen-head .actions');
    if (headerActions && !document.getElementById('det-selector')) {
      headerActions.innerHTML = `
        <select id="det-selector" style="min-width: 450px; max-width: 100%;">
          <option value="">— Seleccionar contrato —</option>
        </select>
        <button class="btn" data-screen="contratos">Volver a la lista</button>
      `;
      document.getElementById('det-selector').addEventListener('change', (e) => {
        contratoActualId = e.target.value;
        renderizar();
      });
    }

    const contratos = ModuloContratos.listar();
    const inmuebles = ModuloInmuebles.listar();
    const copropiedades = ModuloCopropiedades.listar();
    const arrendatarios = ModuloArrendatarios.listar();
    const selector = document.getElementById('det-selector');
    
    if (selector) {
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
        
        return `<option value="${c.id}" ${c.id === contratoActualId ? 'selected' : ''}>${texto}</option>`;
      }).join('');
      selector.innerHTML = html;
    }

    if (!contratoActualId) {
      screen.querySelector('.tabs').style.display = 'none';
      screen.querySelectorAll('.tabpanel').forEach(p => p.classList.remove('active'));
      
      let emptyDiv = document.getElementById('det-empty');
      if (!emptyDiv) {
        emptyDiv = document.createElement('div');
        emptyDiv.id = 'det-empty';
        emptyDiv.className = 'note';
        emptyDiv.style.textAlign = 'center';
        emptyDiv.style.padding = '40px';
        screen.insertBefore(emptyDiv, screen.querySelector('.tabs'));
      }
      emptyDiv.innerHTML = '<h3>No hay contrato seleccionado</h3><p>Por favor, elige un contrato en el menú de arriba o crea uno nuevo en la pestaña de Contratos.</p>';
      emptyDiv.style.display = 'block';
      return;
    }

    const emptyDiv = document.getElementById('det-empty');
    if (emptyDiv) emptyDiv.style.display = 'none';
    screen.querySelector('.tabs').style.display = 'flex';
    
    const c = contratos.find(x => x.id === contratoActualId);
    if (!c) return;

    const inmueble = inmuebles.find(i => i.id === c.inmuebleId);
    const arrendatario = arrendatarios.find(a => a.id === c.arrendatarioId);

    // =========================================================
    // CÁLCULO MAESTRO DE SALDOS
    // =========================================================
    const todosLosMovs = Store.get('cobros', []).filter(m => m.contratoId === contratoActualId);
    
    let globalCargos = 0;
    let globalGastosArr = 0;
    let globalGastosProp = 0;
    let globalPagos = 0;

    todosLosMovs.forEach(m => {
      if (m.tipo === 'cargo') globalCargos += m.monto;
      if (m.tipo === 'gasto') {
        if (m.detalle.includes('Propietario')) globalGastosProp += m.monto;
        else globalGastosArr += m.monto;
      }
      if (m.tipo === 'pago') globalPagos += m.monto;
    });

    const saldoArrendatario = (globalCargos + globalGastosArr) - globalPagos;
    const saldoPropietario = globalGastosProp; 

    // ---------------------------------------------------------
    // PESTAÑA 1: RESUMEN
    // ---------------------------------------------------------
    const resumen = document.getElementById('tab-resumen');
    if (resumen) {
      resumen.innerHTML = `
        <div class="grid g3">
          <div class="card kpi"><div class="label">Canon Mensual Actual</div><div class="value">${formatearMoneda(c.canon)}</div></div>
          <div class="card kpi"><div class="label">Arrendatario</div><div class="value" style="font-size:18px;">${escapeHtml(arrendatario?.nombre || '—')}</div></div>
          <div class="card kpi"><div class="label">Inmueble</div><div class="value" style="font-size:18px;">${escapeHtml(inmueble?.codigo || '—')}</div></div>
        </div>

        <div class="grid g2 mt">
          <div class="card kpi" style="background:${saldoArrendatario > 0 ? '#fef2f2' : '#f0fdf4'}; border-color:${saldoArrendatario > 0 ? '#fca5a5' : '#bbf7d0'};">
            <div class="label" style="color:${saldoArrendatario > 0 ? '#991b1b' : '#166534'};">Estado del Arrendatario</div>
            <div class="value" style="color:${saldoArrendatario > 0 ? '#dc2626' : '#166534'}; font-size:24px;">
              ${formatearMoneda(Math.abs(saldoArrendatario))}
            </div>
            <div class="meta" style="font-weight:bold; color:${saldoArrendatario > 0 ? '#dc2626' : '#166534'}; font-size:14px;">
              ${saldoArrendatario > 0 ? '⚠ EN DEUDA (Debe al contrato)' : '✔ AL DÍA O A FAVOR'}
            </div>
          </div>

          <div class="card kpi" style="background:#fffbeb; border-color:#fcd34d;">
            <div class="label" style="color:#92400e;">Gastos del Propietario</div>
            <div class="value" style="color:#92400e; font-size:24px;">
              ${formatearMoneda(saldoPropietario)}
            </div>
            <div class="meta" style="color:#92400e; font-size:14px;">
              (Se descuentan del arriendo)
            </div>
          </div>
        </div>

        <div class="card mt">
          <h3>Resumen del contrato</h3>
          <p class="hint">
            <strong>Código:</strong> ${escapeHtml(c.codigo)}<br>
            <strong>Vigencia:</strong> ${escapeHtml(c.fechaInicio)} al ${escapeHtml(c.fechaFin)}<br>
            <strong>Aseguradora:</strong> ${escapeHtml(c.aseguradora || '—')}<br>
            <strong>IVA:</strong> ${c.iva}% | <strong>Retención:</strong> ${c.retencion}%
          </p>
          <div class="actions mt">
            <button class="btn primary" id="btn-ir-cobro">Abrir pantalla de Cobro</button>
          </div>
        </div>
      `;
      document.getElementById('btn-ir-cobro').onclick = () => {
        ModuloCobros.abrirContrato(contratoActualId);
      };
    }

    // ---------------------------------------------------------
    // PESTAÑA 2: COBROS MENSUALES
    // ---------------------------------------------------------
    const tabCobros = document.getElementById('tab-cobros');
    if (tabCobros) {
      const resumenMeses = {};

      todosLosMovs.forEach(m => {
        const mes = m.fecha.substring(0, 7);
        if (!resumenMeses[mes]) {
          resumenMeses[mes] = { cargos: 0, gastosArr: 0, gastosProp: 0, pagos: 0 };
        }
        
        if (m.tipo === 'cargo') resumenMeses[mes].cargos += m.monto;
        if (m.tipo === 'gasto') {
          if (m.detalle.includes('Propietario')) resumenMeses[mes].gastosProp += m.monto;
          else resumenMeses[mes].gastosArr += m.monto;
        }
        if (m.tipo === 'pago') resumenMeses[mes].pagos += m.monto;
      });

      const meses = Object.keys(resumenMeses).sort().reverse();

      let filas = meses.map(mes => {
        const r = resumenMeses[mes];
        const sArr = (r.cargos + r.gastosArr) - r.pagos;
        
        const badgeArr = sArr <= 0 
          ? '<span class="badge" style="background:#dcfce7;color:#166534;">Al día</span>' 
          : '<span class="badge" style="background:#fee2e2;color:#991b1b;">Pendiente</span>';
        
        return `
          <tr>
            <td><strong>${escapeHtml(mes)}</strong></td>
            <td>${formatearMoneda(r.cargos)}</td>
            <td style="color:#92400e;">${formatearMoneda(r.gastosArr)}</td>
            <td style="color:#166534;">${formatearMoneda(r.pagos)}</td>
            <td><strong style="color:${sArr > 0 ? '#dc2626' : '#16a34a'}">${formatearMoneda(sArr)}</strong></td>
            <td>${badgeArr}</td>
          </tr>
        `;
      }).join('');

      if (meses.length === 0) {
        filas = '<tr class="empty"><td colspan="6">Aún no hay cobros registrados.</td></tr>';
      }

      tabCobros.innerHTML = `
        <div class="card">
          <h3>Cobros mensuales (Auditoría)</h3>
          <p class="hint">El saldo refleja únicamente la deuda del Arrendatario.</p>
          <div style="overflow-x:auto;">
            <table class="mt">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Cargos</th>
                  <th>Gastos (Arr)</th>
                  <th>Pagos</th>
                  <th>Saldo del Mes</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>${filas}</tbody>
            </table>
          </div>
          
          <div class="actions mt" style="border-top: 1px solid #e3e8ef; padding-top: 15px; justify-content: flex-end;">
            <button class="btn" id="btn-previsualizar-arr" style="background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe;">
              📄 Generar Informe Arrendatario
            </button>
            <button class="btn" id="btn-previsualizar-prop" style="background:#f0fdf4; color:#166534; border-color:#bbf7d0;">
              🏠 Generar Informe Propietario
            </button>
          </div>
        </div>
      `;

      document.getElementById('btn-previsualizar-arr').onclick = () => {
        if (typeof ModuloReporteArrendatario !== 'undefined') ModuloReporteArrendatario.abrirReporte(contratoActualId);
      };

      document.getElementById('btn-previsualizar-prop').onclick = () => {
        if (typeof ModuloReportePropietario !== 'undefined') ModuloReportePropietario.abrirReporte(contratoActualId);
      };
    }

    // ---------------------------------------------------------
    // PESTAÑA 3: NUEVO COBRO RÁPIDO
    // ---------------------------------------------------------
    const tabNuevo = document.getElementById('tab-nuevo');
    if (tabNuevo) {
      tabNuevo.innerHTML = `
        <div class="card">
          <h3>Nuevo cobro rápido</h3>
          <p class="hint">Registra un cargo mensual sin salir del detalle.</p>
          <div class="form mt">
            <div class="row">
              <div class="field" style="flex:1"><label>Mes</label><input type="date" id="rapido-mes"></div>
              <div class="field" style="flex:1"><label>Arriendo</label><input type="text" id="rapido-arriendo" value="${formatearMoneda(c.canon)}" readonly style="background:#f4f6f9;"></div>
              <div class="field" style="flex:1"><label>Administración</label><input type="text" id="rapido-admin" class="input-money" placeholder="$ 0"></div>
              <div class="field" style="flex:1"><label>Parqueadero</label><input type="text" id="rapido-parqueadero" class="input-money" placeholder="$ 0"></div>
            </div>
            <div class="field">
              <label>Notas / Observaciones</label>
              <input type="text" id="rapido-nota" placeholder="Ej: Cobro de administración atrasada">
            </div>
            <div class="actions">
              <button class="btn primary" id="btn-rapido-guardar">Guardar Cargo</button>
              <button class="btn" id="btn-ir-cobros-pantalla">Ir a pantalla de Cobros</button>
            </div>
          </div>
        </div>
      `;

      tabNuevo.querySelectorAll('.input-money').forEach(input => {
        input.addEventListener('input', function() {
          let val = this.value.replace(/\D/g, '');
          this.value = val ? '$ ' + parseInt(val, 10).toLocaleString('es-CO') : '';
        });
      });

      document.getElementById('btn-rapido-guardar').onclick = () => {
        const fInput = document.getElementById('rapido-mes').value;
        if (!fInput) return alert('Selecciona el mes.');
        const mesGuardar = fInput.substring(0, 7) + '-01';
        
        const arr = c.canon;
        const adm = Number(document.getElementById('rapido-admin').value.replace(/\D/g,'')) || 0;
        const par = Number(document.getElementById('rapido-parqueadero').value.replace(/\D/g,'')) || 0;
        const nota = document.getElementById('rapido-nota').value.trim();

        if (arr + adm + par === 0) return alert('El cargo no puede ser 0.');

        let detalle = `Arriendo: ${formatearMoneda(arr)}, Admin: ${formatearMoneda(adm)}, Parqueadero: ${formatearMoneda(par)}`;
        if (nota) detalle += ` | Nota: ${nota}`;

        let movs = Store.get('cobros', []);
        movs.push({ id: Store.uid(), contratoId: contratoActualId, tipo: 'cargo', fecha: mesGuardar, detalle, monto: arr + adm + par });
        Store.set('cobros', movs);
        
        alert('Cobro guardado.');
        renderizar();
      };

      document.getElementById('btn-ir-cobros-pantalla').onclick = () => {
        ModuloCobros.abrirContrato(contratoActualId);
      };
    }

    // ---------------------------------------------------------
    // PESTAÑA 4: DATOS E INCREMENTO AUTOMÁTICO
    // ---------------------------------------------------------
    const tabDatos = document.getElementById('tab-datos');
    if (tabDatos) {
      let historial = (c.historialIncrementos || []).map(h => 
        `<li>El ${escapeHtml(h.fechaAplicacion)} subió de ${formatearMoneda(h.canonAnterior)} a <strong>${formatearMoneda(h.canonNuevo)}</strong> (+${h.porcentaje}%)</li>`
      ).join('');

      const ultimoIncremento = c.historialIncrementos && c.historialIncrementos.length > 0 
        ? c.historialIncrementos[c.historialIncrementos.length - 1] 
        : null;

      tabDatos.innerHTML = `
        <div class="card">
          <h3>Datos y Actualización del Contrato</h3>
          
          <div class="row mt">
            <div class="field" style="flex:1"><label>Fecha inicio</label><input type="date" id="det-fecha-ini" value="${escapeHtml(c.fechaInicio)}"></div>
            <div class="field" style="flex:1"><label>Fecha fin</label><input type="date" id="det-fecha-f" value="${escapeHtml(c.fechaFin)}"></div>
            <div class="field" style="flex:1"><label>Aseguradora</label><input type="text" id="det-aseg" value="${escapeHtml(c.aseguradora || '')}"></div>
          </div>

          <div class="row mt">
            <div class="field" style="flex:1"><label>IVA (%)</label><input type="number" id="det-iva" value="${c.iva}"></div>
            <div class="field" style="flex:1"><label>Retención (%)</label><input type="number" id="det-ret" value="${c.retencion}"></div>
            <div class="field" style="flex:1; background:#f4f6f9; padding:5px 10px; border-radius:8px;">
              <label style="color:#101828; font-weight:bold;">Incremento Anual (%)</label>
              <input type="number" id="det-inc-porcentaje" value="${c.incremento || 0}" style="background:none; border:none; padding:0; font-weight:bold; font-size:16px;">
            </div>
          </div>

          <div class="actions mt">
            <button class="btn" id="btn-guardar-basicos">Guardar Datos Básicos</button>
          </div>

          <div class="mt" style="border-top: 2px dashed #fcd34d; padding-top: 15px; margin-top: 20px;">
            <h4 style="color:#92400e; margin:0 0 5px 0;">Aplicar Incremento de Canon</h4>
            <p class="hint" style="margin-bottom:10px;">Calcula y aplica el nuevo valor del arriendo sin afectar las fechas del contrato.</p>
            
            <div class="row">
              <div class="field" style="flex:1">
                <label>Canon Actual</label>
                <input type="text" value="${formatearMoneda(c.canon)}" readonly style="background:#fef3c7; cursor:not-allowed; color:#92400e; font-weight:bold;">
              </div>
              <div class="field" style="flex:1">
                <label>Nuevo Canon (Calculado)</label>
                <input type="text" id="det-nuevo-canon" readonly style="background:#f0fdf4; color:#166534; font-weight:bold; cursor:not-allowed;">
              </div>
              <div class="field" style="flex:1">
                <label>Fecha en que se aplica</label>
                <input type="date" id="det-fecha-inc" value="${new Date().toISOString().split('T')[0]}">
              </div>
            </div>
            
            ${historial ? `<div class="mt"><label style="color:#92400e; font-weight:bold; font-size:12px;">Historial de Aumentos:</label><ul style="font-size:12px; color:#92400e; margin-top:5px;">${historial}</ul></div>` : ''}
            
            <div class="actions mt" style="justify-content: space-between; border-top: 1px solid #e3e8ef; padding-top: 15px;">
              <div>
                <button class="btn primary" id="btn-aplicar-incremento" style="background:#d97706; border-color:#d97706;">Aplicar Incremento al Canon</button>
                ${ultimoIncremento ? `<button class="btn" id="btn-deshacer-incremento" style="color:#dc2626; border-color:#fca5a5; margin-left:10px;">Deshacer último incremento</button>` : ''}
              </div>
            </div>
          </div>
        </div>
      `;

      const inputPorcentaje = document.getElementById('det-inc-porcentaje');
      const inputNuevoCanon = document.getElementById('det-nuevo-canon');
      
      const calcularNuevoCanon = () => {
        const pct = Number(inputPorcentaje.value) || 0;
        const nuevo = c.canon + (c.canon * (pct / 100));
        inputNuevoCanon.value = formatearMoneda(nuevo);
      };

      inputPorcentaje.addEventListener('input', calcularNuevoCanon);
      calcularNuevoCanon(); 

      document.getElementById('btn-guardar-basicos').onclick = () => {
        let lista = ModuloContratos.listar();
        let idx = lista.findIndex(x => x.id === contratoActualId);
        if (idx > -1) {
          lista[idx].fechaInicio = document.getElementById('det-fecha-ini').value;
          lista[idx].fechaFin = document.getElementById('det-fecha-f').value;
          lista[idx].aseguradora = document.getElementById('det-aseg').value;
          lista[idx].iva = Number(document.getElementById('det-iva').value) || 0;
          lista[idx].retencion = Number(document.getElementById('det-ret').value) || 0;
          lista[idx].incremento = Number(inputPorcentaje.value) || 0; 
          
          Store.set('contratos', lista);
          alert('Datos del contrato actualizados.');
          renderizar();
        }
      };

      document.getElementById('btn-aplicar-incremento').onclick = () => {
        const fechaInc = document.getElementById('det-fecha-inc').value;
        const pct = Number(inputPorcentaje.value) || 0;
        
        if (!fechaInc) return alert('Debes seleccionar la fecha de aplicación.');
        if (pct <= 0) return alert('El porcentaje de incremento debe ser mayor a 0.');

        const nuevoCanon = c.canon + (c.canon * (pct / 100));

        let lista = ModuloContratos.listar();
        let idx = lista.findIndex(x => x.id === contratoActualId);
        
        if (idx > -1) {
          if (!lista[idx].historialIncrementos) lista[idx].historialIncrementos = [];
          
          lista[idx].historialIncrementos.push({
            fechaAplicacion: fechaInc,
            canonAnterior: c.canon,
            canonNuevo: nuevoCanon,
            porcentaje: pct
          });

          lista[idx].canon = nuevoCanon; 

          Store.set('contratos', lista);
          
          alert(`Incremento aplicado.\nEl nuevo arriendo es ${formatearMoneda(nuevoCanon)}.\n(Las fechas del contrato no han sido modificadas).`);
          renderizar();
        }
      };

      if (ultimoIncremento) {
        document.getElementById('btn-deshacer-incremento').onclick = () => {
          if (!confirm('¿Estás seguro de que deseas deshacer el último incremento y volver al canon anterior?')) return;

          let lista = ModuloContratos.listar();
          let idx = lista.findIndex(x => x.id === contratoActualId);
          
          if (idx > -1) {
            lista[idx].canon = ultimoIncremento.canonAnterior;
            lista[idx].historialIncrementos.pop(); 

            Store.set('contratos', lista);
            alert(`Incremento deshecho. El canon ha vuelto a ${formatearMoneda(ultimoIncremento.canonAnterior)}.`);
            renderizar();
          }
        };
      }
    }
  }

  // Eventos de pestañas
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (tab) {
      const screen = tab.closest('.screen');
      screen.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
      screen.querySelectorAll('.tabpanel').forEach(p => p.classList.toggle('active', p.id === tab.dataset.tab));
      return;
    }

    const nav = e.target.closest('[data-screen="contrato-detalle"]');
    if (nav) setTimeout(() => { if (!contratoActualId) renderizar(); }, 50);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderizar);
  else renderizar();

  return { abrirContrato, renderizar };
})();