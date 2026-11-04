// ============================================================
// cobros.js  ·  Módulo independiente: Cobros y Pagos
// ============================================================

const ModuloCobros = (() => {
  
  const KEY = 'cobros';
  let contratoActualId = null;
  let editandoCargoId = null;
  let editandoPagoId = null;
  let editandoGastoId = null;

  function cargar() { return Store.get(KEY, []); }
  function guardarLista(lista) { return Store.set(KEY, lista); }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function formatearMoneda(num) { return '$ ' + Number(num || 0).toLocaleString('es-CO'); }
  function limpiarMoneda(val) { return Number(String(val).replace(/[^0-9]/g, '')) || 0; }

  function abrirContrato(id) {
    contratoActualId = id || null;
    if (typeof showScreen === 'function') showScreen('cobro');
    renderizar();
  }

  function construirUI(screen) {
    if (!screen) return;
    const content = screen.querySelector('.grid');
    if (!content || content.dataset.built) return;

    content.dataset.built = "true";
    content.outerHTML = `
      <div class="actions mb mt" style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid #e3e8ef; padding-bottom: 15px;">
        <button class="btn" data-screen="contratos">← Volver a Contratos</button>
        <div style="display:flex; align-items:center; gap:10px;">
          <label style="font-size:13px; color:#667085; font-weight:600;">Seleccionar Contrato:</label>
          <select id="cob-selector" style="min-width: 450px; max-width: 100%;">
            <option value="">— Seleccionar contrato —</option>
          </select>
        </div>
      </div>

      <div id="cobros-paneles" style="display:none;">
        <div class="grid g3 mt">
          
          <!-- Panel Cargos -->
          <div class="card">
            <h3>Cargos del Mes</h3>
            <p class="hint">El arriendo se carga automáticamente según la fecha.</p>
            <div class="form mt">
              <div class="field">
                <label>Mes del Cargo (Selecciona cualquier día de ese mes)</label>
                <input type="date" id="cob-mes" style="width: 100%;">
              </div>
              <div class="field">
                <label>Arriendo</label>
                <input type="text" id="cob-arriendo" readonly style="background:#f4f6f9; cursor:not-allowed;" placeholder="$ 0">
              </div>
              <div class="field">
                <label>Administración</label>
                <input type="text" id="cob-admin" class="input-money" placeholder="$ 0">
              </div>
              <div class="field">
                <label>Parqueadero</label>
                <input type="text" id="cob-parqueadero" class="input-money" placeholder="$ 0">
              </div>
              <div class="field">
                <label>Notas / Observaciones</label>
                <input type="text" id="cob-nota" placeholder="Ej: Cobro retroactivo de administración">
              </div>
              <button class="btn primary mt" id="btn-add-cargo">+ Agregar Cargo</button>
            </div>
          </div>

          <!-- Panel Pagos -->
          <div class="card">
            <h3>Pagos Recibidos</h3>
            <div class="form mt">
              <div class="field"><label>Fecha del Pago</label><input type="date" id="pago-fecha"></div>
              <div class="field"><label>Monto</label><input type="text" id="pago-monto" class="input-money" placeholder="$ 0"></div>
              <div class="field">
                <label>Método</label>
                <select id="pago-metodo"><option>Transferencia</option><option>Nequi</option><option>PSE</option><option>Efectivo</option></select>
              </div>
              <div class="field" style="flex-direction:row; align-items:center; gap:8px; margin-top:5px;">
                <input type="checkbox" id="pago-validado" style="width:16px; height:16px;">
                <label for="pago-validado" style="font-size:13px; color:#475467; font-weight:600; cursor:pointer;">Validado contra extracto bancario</label>
              </div>
              <button class="btn primary mt" id="btn-add-pago">+ Registrar Pago</button>
            </div>
          </div>

          <!-- Panel Gastos -->
          <div class="card">
            <h3>Gastos Extra</h3>
            <div class="form mt">
              <div class="field"><label>Fecha</label><input type="date" id="gasto-fecha"></div>
              <div class="field"><label>Concepto</label><input type="text" id="gasto-concepto" placeholder="Ej: Reparación de tubería"></div>
              <div class="field"><label>Monto</label><input type="text" id="gasto-monto" class="input-money" placeholder="$ 0"></div>
              <div class="field">
                <label>A cargo de</label>
                <select id="gasto-responsable"><option>Arrendatario</option><option>Propietario</option></select>
              </div>
              <div class="field">
                <label>Soporte (Factura / Recibo)</label>
                <input type="file" id="gasto-soporte" accept="image/*,.pdf" style="font-size:13px; padding:5px;">
              </div>
              <button class="btn primary mt" id="btn-add-gasto">+ Registrar Gasto</button>
            </div>
          </div>
        </div>

        <!-- Historial con Filtros -->
        <div class="card mt">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:10px;">
            <h3 style="margin:0;">Historial de Movimientos</h3>
            <div style="display:flex; gap:10px;">
              <select id="filtro-mes-hist" style="min-width:150px;">
                <option value="">— Todos los meses —</option>
              </select>
              <select id="filtro-tipo-hist" style="min-width:200px;">
                <option value="todos">— Todos los movimientos —</option>
                <option value="cargos">Solo Cargos</option>
                <option value="pagos">Solo Pagos Recibidos</option>
                <option value="gastos-arr">Gastos del Arrendatario</option>
                <option value="gastos-prop">Gastos del Propietario</option>
              </select>
            </div>
          </div>
          
          <div style="overflow-x:auto;">
            <table class="mt">
              <thead><tr><th>Fecha / Mes</th><th>Tipo</th><th>Detalle</th><th>Monto</th><th>Acciones</th></tr></thead>
              <tbody id="cobros-tbody"></tbody>
            </table>
          </div>
        </div>

        <!-- Tarjetas de Auditoría Global -->
        <div class="grid g2 mt" style="margin-bottom: 30px;">
          <div class="card" style="background:#f0f5ff; border-color:#d6e2ff;">
            <div class="label" style="color:#1e3a8a; font-weight:bold; margin-bottom:5px;">Saldo del Arrendatario</div>
            <div id="auditoria-saldo-arr" style="font-size:24px; font-weight:bold; color:#2563eb;">$ 0</div>
            <div class="hint" style="margin-top:5px;">Suma de Cargos + sus Gastos - Pagos Recibidos.</div>
          </div>
          
          <div class="card" style="background:#fffbeb; border-color:#fcd34d;">
            <div class="label" style="color:#92400e; font-weight:bold; margin-bottom:5px;">Gastos a descontar al Propietario</div>
            <div id="auditoria-saldo-prop" style="font-size:24px; font-weight:bold; color:#d97706;">$ 0</div>
            <div class="hint" style="margin-top:5px;">Se descuentan automáticamente de su liquidación de arriendo.</div>
          </div>
        </div>
      </div>

      <div id="cobros-empty" class="card mt" style="text-align:center; padding:40px; display:block;">
        <h3>No hay contrato seleccionado</h3>
        <p class="hint">Elige un contrato en el menú de arriba para gestionar sus cobros.</p>
      </div>
    `;

    screen.querySelectorAll('.input-money').forEach(input => {
      input.addEventListener('input', function() {
        let val = this.value.replace(/\D/g, '');
        this.value = val ? '$ ' + parseInt(val, 10).toLocaleString('es-CO') : '';
      });
    });

    // Calcular arriendo dinámico al cambiar el mes
    document.getElementById('cob-mes').addEventListener('change', (e) => {
      const fechaInput = e.target.value;
      if (!fechaInput) return;

      const contratos = ModuloContratos.listar();
      const c = contratos.find(x => x.id === contratoActualId);
      if (!c) return;

      const mesClave = fechaInput.substring(0, 7);
      let arriendoParaEsteMes = c.canon; // Valor actual por defecto

      // Si hay historial de incrementos, buscar si alguno aplica para esta fecha
      if (c.historialIncrementos && c.historialIncrementos.length > 0) {
        // Ordenar del más reciente al más antiguo
        const historial = [...c.historialIncrementos].sort((a, b) => new Date(b.fechaAplicacion) - new Date(a.fechaAplicacion));
        
        for (let i = 0; i < historial.length; i++) {
          const inc = historial[i];
          const mesInc = inc.fechaAplicacion.substring(0, 7);
          
          // Si la fecha del cargo es anterior o igual al incremento, usamos el canon anterior
          if (mesClave < mesInc) {
            arriendoParaEsteMes = inc.canonAnterior;
          } else {
            // Si es igual o mayor, tomamos el nuevo canon y rompemos el bucle
            arriendoParaEsteMes = inc.canonNuevo;
            break;
          }
        }
      }

      document.getElementById('cob-arriendo').value = formatearMoneda(arriendoParaEsteMes);
    });

    document.getElementById('btn-add-cargo').addEventListener('click', agregarCargo);
    document.getElementById('btn-add-pago').addEventListener('click', agregarPago);
    document.getElementById('btn-add-gasto').addEventListener('click', agregarGasto);

    document.getElementById('cob-selector').addEventListener('change', (e) => {
      contratoActualId = e.target.value;
      renderizar();
    });

    document.getElementById('filtro-mes-hist').addEventListener('change', renderizarHistorial);
    document.getElementById('filtro-tipo-hist').addEventListener('change', renderizarHistorial);
  }

  function renderizar() {
    const screen = document.getElementById('screen-cobro');
    if (!screen) return;

    if (!document.getElementById('cob-selector')) {
      construirUI(screen);
    }

    const selector = document.getElementById('cob-selector');
    const paneles = document.getElementById('cobros-paneles');
    const empty = document.getElementById('cobros-empty');

    if (!selector) return;

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
      return `<option value="${c.id}" ${c.id === contratoActualId ? 'selected' : ''}>${texto}</option>`;
    }).join('');
    selector.innerHTML = html;

    if (!contratoActualId) {
      paneles.style.display = 'none';
      empty.style.display = 'block';
      return;
    }

    paneles.style.display = 'block';
    empty.style.display = 'none';

    // Cargar los meses disponibles en el filtro
    const movsContrato = cargar().filter(m => m.contratoId === contratoActualId);
    const mesesSet = new Set(movsContrato.map(m => m.fecha.substring(0, 7)));
    const selectFiltroMes = document.getElementById('filtro-mes-hist');
    
    if (selectFiltroMes) {
      const valActual = selectFiltroMes.value;
      let opcionesMeses = '<option value="">— Todos los meses —</option>';
      Array.from(mesesSet).sort().reverse().forEach(m => {
        opcionesMeses += `<option value="${m}">${m}</option>`;
      });
      selectFiltroMes.innerHTML = opcionesMeses;
      selectFiltroMes.value = valActual;
    }

    // Si estamos editando, no rellenamos el arriendo automáticamente
    if (!editandoCargoId) {
       const cobMesInput = document.getElementById('cob-mes');
       if(cobMesInput && !cobMesInput.value) {
          document.getElementById('cob-arriendo').value = formatearMoneda(contratos.find(x => x.id === contratoActualId).canon);
       }
    }

    renderizarHistorial();
  }

  // ---------- Cargar en Formulario para Editar ----------
  function editarCargo(id) {
    const lista = cargar();
    const mov = lista.find(x => x.id === id);
    if (!mov) return;

    editandoCargoId = id;
    
    // Extraer datos del texto
    const matchArr = mov.detalle.match(/Arriendo:\s*\$?\s*([\d.,]+)/);
    const matchAdm = mov.detalle.match(/Admin:\s*\$?\s*([\d.,]+)/);
    const matchPar = mov.detalle.match(/Parqueadero:\s*\$?\s*([\d.,]+)/);
    const matchNota = mov.detalle.match(/\| Nota:\s*(.*)/);

    document.getElementById('cob-mes').value = mov.fecha.substring(0, 7) + '-01';
    document.getElementById('cob-arriendo').value = matchArr ? formatearMoneda(matchArr[1].replace(/\./g, '').replace(/,/g, '')) : '$ 0';
    document.getElementById('cob-admin').value = matchAdm ? formatearMoneda(matchAdm[1].replace(/\./g, '').replace(/,/g, '')) : '';
    document.getElementById('cob-parqueadero').value = matchPar ? formatearMoneda(matchPar[1].replace(/\./g, '').replace(/,/g, '')) : '';
    document.getElementById('cob-nota').value = matchNota ? matchNota[1].trim() : '';

    const btn = document.getElementById('btn-add-cargo');
    btn.textContent = 'Actualizar Cargo';
    btn.style.background = '#d97706';
    btn.style.borderColor = '#d97706';
    document.getElementById('cob-mes').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function editarPago(id) {
    const lista = cargar();
    const mov = lista.find(x => x.id === id);
    if (!mov) return;

    editandoPagoId = id;
    
    const matchMetodo = mov.detalle.match(/Pago vía\s*(.*?)(?:\s*\[Validado\])?$/);
    
    document.getElementById('pago-fecha').value = mov.fecha;
    document.getElementById('pago-monto').value = formatearMoneda(mov.monto);
    document.getElementById('pago-metodo').value = matchMetodo ? matchMetodo[1].trim() : 'Transferencia';
    document.getElementById('pago-validado').checked = mov.detalle.includes('[Validado]');

    const btn = document.getElementById('btn-add-pago');
    btn.textContent = 'Actualizar Pago';
    btn.style.background = '#d97706';
    btn.style.borderColor = '#d97706';
    document.getElementById('pago-fecha').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function editarGasto(id) {
    const lista = cargar();
    const mov = lista.find(x => x.id === id);
    if (!mov) return;

    editandoGastoId = id;
    
    const matchResp = mov.detalle.match(/\(A cargo de (.*?)\)/);
    const concepto = mov.detalle.split('(')[0].trim();

    document.getElementById('gasto-fecha').value = mov.fecha;
    document.getElementById('gasto-concepto').value = concepto;
    document.getElementById('gasto-monto').value = formatearMoneda(mov.monto);
    document.getElementById('gasto-responsable').value = matchResp ? matchResp[1] : 'Arrendatario';

    const btn = document.getElementById('btn-add-gasto');
    btn.textContent = 'Actualizar Gasto';
    btn.style.background = '#d97706';
    btn.style.borderColor = '#d97706';
    document.getElementById('gasto-fecha').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ---------- Agregar / Actualizar Cargo ----------
  function agregarCargo() {
    const fechaInput = document.getElementById('cob-mes').value;
    const arr = limpiarMoneda(document.getElementById('cob-arriendo').value);
    const adm = limpiarMoneda(document.getElementById('cob-admin').value);
    const par = limpiarMoneda(document.getElementById('cob-parqueadero').value);
    const nota = document.getElementById('cob-nota').value.trim();

    if (!fechaInput) return alert('Selecciona el mes del cobro.');
    const total = arr + adm + par;
    if (total === 0) return alert('El cargo no puede ser cero.');

    const mes = fechaInput.substring(0, 7) + '-01';

    let detalle = `Arriendo: ${formatearMoneda(arr)}, Admin: ${formatearMoneda(adm)}, Parqueadero: ${formatearMoneda(par)}`;
    if (nota) detalle += ` | Nota: ${nota}`;

    let lista = cargar();

    if (editandoCargoId) {
      const idx = lista.findIndex(x => x.id === editandoCargoId);
      if (idx > -1) {
         lista[idx].fecha = mes;
         lista[idx].detalle = detalle;
         lista[idx].monto = total;
      }
      alert('Cargo actualizado correctamente.');
    } else {
      lista.push({
        id: Store.uid(), contratoId: contratoActualId, tipo: 'cargo', fecha: mes, 
        detalle: detalle, monto: total
      });
      alert('Cargo agregado correctamente.');
    }
    
    guardarLista(lista);
    
    // Limpiar Formulario
    editandoCargoId = null;
    document.getElementById('cob-mes').value = '';
    document.getElementById('cob-arriendo').value = formatearMoneda(ModuloContratos.listar().find(x => x.id === contratoActualId).canon);
    document.getElementById('cob-admin').value = '';
    document.getElementById('cob-parqueadero').value = '';
    document.getElementById('cob-nota').value = '';
    
    const btn = document.getElementById('btn-add-cargo');
    btn.textContent = '+ Agregar Cargo';
    btn.style.background = '';
    btn.style.borderColor = '';

    renderizar(); 
  }

  // ---------- Agregar / Actualizar Pago ----------
  function agregarPago() {
    const fecha = document.getElementById('pago-fecha').value;
    const monto = limpiarMoneda(document.getElementById('pago-monto').value);
    const metodo = document.getElementById('pago-metodo').value;
    const validado = document.getElementById('pago-validado').checked;

    if (!fecha || monto === 0) return alert('Verifica la fecha y el monto.');

    let detalle = `Pago vía ${metodo}`;
    if (validado) detalle += ' [Validado]';

    let lista = cargar();

    if (editandoPagoId) {
      const idx = lista.findIndex(x => x.id === editandoPagoId);
      if (idx > -1) {
        lista[idx].fecha = fecha;
        lista[idx].monto = monto;
        lista[idx].detalle = detalle;
      }
      alert('Pago actualizado correctamente.');
    } else {
      lista.push({
        id: Store.uid(), contratoId: contratoActualId, tipo: 'pago', fecha: fecha,
        detalle: detalle, monto: monto
      });
      alert('Pago registrado correctamente.');
    }
    
    guardarLista(lista);
    
    editandoPagoId = null;
    document.getElementById('pago-fecha').value = '';
    document.getElementById('pago-monto').value = '';
    document.getElementById('pago-validado').checked = false;
    
    const btn = document.getElementById('btn-add-pago');
    btn.textContent = '+ Registrar Pago';
    btn.style.background = '';
    btn.style.borderColor = '';

    renderizar(); 
  }

  // ---------- Agregar / Actualizar Gasto ----------
  function agregarGasto() {
    const fecha = document.getElementById('gasto-fecha').value;
    const concepto = document.getElementById('gasto-concepto').value.trim();
    const monto = limpiarMoneda(document.getElementById('gasto-monto').value);
    const resp = document.getElementById('gasto-responsable').value;
    const fileInput = document.getElementById('gasto-soporte');

    if (!fecha || !concepto || monto === 0) return alert('Verifica los datos del gasto.');

    const ejecutarGuardado = (soporteData = null) => {
      let lista = cargar();
      
      if (editandoGastoId) {
        const idx = lista.findIndex(x => x.id === editandoGastoId);
        if (idx > -1) {
          lista[idx].fecha = fecha;
          lista[idx].detalle = `${concepto} (A cargo de ${resp})`;
          lista[idx].monto = monto;
          if (soporteData) lista[idx].soporte = soporteData; // Solo actualizamos el soporte si subieron uno nuevo
        }
        alert('Gasto actualizado correctamente.');
      } else {
        lista.push({
          id: Store.uid(), contratoId: contratoActualId, tipo: 'gasto', fecha: fecha,
          detalle: `${concepto} (A cargo de ${resp})`, monto: monto, soporte: soporteData
        });
        alert('Gasto registrado correctamente.');
      }
      
      guardarLista(lista);
      
      editandoGastoId = null;
      document.getElementById('gasto-concepto').value = '';
      document.getElementById('gasto-monto').value = '';
      fileInput.value = ''; 
      
      const btn = document.getElementById('btn-add-gasto');
      btn.textContent = '+ Registrar Gasto';
      btn.style.background = '';
      btn.style.borderColor = '';

      renderizar(); 
    };

    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = function(e) { ejecutarGuardado(e.target.result); };
      reader.readAsDataURL(file);
    } else {
      ejecutarGuardado(null);
    }
  }

  // ---------- Renderizar Tabla y Auditoría Dinámica ----------
  function renderizarHistorial() {
    const tbody = document.getElementById('cobros-tbody');
    if (!tbody) return;

    const filtroMes = document.getElementById('filtro-mes-hist')?.value || '';
    const filtroTipo = document.getElementById('filtro-tipo-hist')?.value || 'todos';

    let listaCompleta = cargar().filter(x => x.contratoId === contratoActualId);
    
    let listaFiltrada = listaCompleta;
    if (filtroMes) {
      listaFiltrada = listaFiltrada.filter(m => m.fecha.startsWith(filtroMes));
    }
    if (filtroTipo === 'cargos') {
      listaFiltrada = listaFiltrada.filter(m => m.tipo === 'cargo');
    } else if (filtroTipo === 'pagos') {
      listaFiltrada = listaFiltrada.filter(m => m.tipo === 'pago');
    } else if (filtroTipo === 'gastos-arr') {
      listaFiltrada = listaFiltrada.filter(m => m.tipo === 'gasto' && !m.detalle.includes('Propietario'));
    } else if (filtroTipo === 'gastos-prop') {
      listaFiltrada = listaFiltrada.filter(m => m.tipo === 'gasto' && m.detalle.includes('Propietario'));
    }

    // Auditoría Dinámica
    let totalCargos = 0;
    let totalGastosArr = 0;
    let totalGastosProp = 0;
    let totalPagos = 0;

    listaFiltrada.forEach(mov => {
      if (mov.tipo === 'cargo') totalCargos += mov.monto;
      if (mov.tipo === 'gasto') {
        if (mov.detalle.includes('Propietario')) totalGastosProp += mov.monto;
        else totalGastosArr += mov.monto;
      }
      if (mov.tipo === 'pago') totalPagos += mov.monto;
    });

    const saldoArr = (totalCargos + totalGastosArr) - totalPagos;
    
    const elSaldoArr = document.getElementById('auditoria-saldo-arr');
    if (elSaldoArr) {
      elSaldoArr.textContent = formatearMoneda(saldoArr);
      elSaldoArr.style.color = saldoArr > 0 ? '#dc2626' : '#16a34a';
    }
    
    const elSaldoProp = document.getElementById('auditoria-saldo-prop');
    if (elSaldoProp) {
      elSaldoProp.textContent = formatearMoneda(totalGastosProp);
    }

    // Tabla
    listaFiltrada.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));

    if (listaFiltrada.length === 0) {
      tbody.innerHTML = '<tr class="empty"><td colspan="5">No hay movimientos para este filtro.</td></tr>';
      return;
    }

    tbody.innerHTML = listaFiltrada.map(mov => {
      let badgeColor = '#f3f4f6'; let textColor = '#374151';
      if (mov.tipo === 'cargo') { badgeColor = '#fee2e2'; textColor = '#991b1b'; }
      if (mov.tipo === 'pago') { badgeColor = '#dcfce7'; textColor = '#166534'; }
      if (mov.tipo === 'gasto') { badgeColor = '#fef3c7'; textColor = '#92400e'; }

      let btnSoporte = '—';
      if (mov.tipo === 'gasto' && mov.soporte) {
        btnSoporte = `<button class="btn" data-ver-soporte="${mov.id}" style="padding: 4px 8px; font-size:12px;">📄 Ver</button>`;
      }

      return `
        <tr>
          <td>${escapeHtml(mov.fecha)}</td>
          <td><span class="badge" style="background:${badgeColor};color:${textColor};">${mov.tipo.toUpperCase()}</span></td>
          <td><small>${escapeHtml(mov.detalle)}</small></td>
          <td><strong>${formatearMoneda(mov.monto)}</strong></td>
          <td>
            ${btnSoporte}
            <button class="btn" data-edit-tipo="${mov.tipo}" data-edit-id="${mov.id}" style="padding: 4px 8px; font-size:12px; margin-left:5px; color:#2563eb;">✏️</button>
            <button class="btn" data-del-mov="${mov.id}" style="color:red; padding: 4px 8px; font-size:12px; margin-left:5px;">✕</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('[data-ver-soporte]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.verSoporte;
        const mov = cargar().find(x => x.id === id);
        if (mov && mov.soporte) {
          const win = window.open();
          win.document.write(`<iframe src="${mov.soporte}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        }
      });
    });

    // Evento Editar
    tbody.querySelectorAll('[data-edit-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.editId;
        const tipo = e.currentTarget.dataset.editTipo;
        
        if (tipo === 'cargo') editarCargo(id);
        else if (tipo === 'pago') editarPago(id);
        else if (tipo === 'gasto') editarGasto(id);
      });
    });

    // Evento Eliminar
    tbody.querySelectorAll('[data-del-mov]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (confirm('¿Borrar este movimiento?')) {
          const id = e.currentTarget.dataset.delMov;
          guardarLista(cargar().filter(x => x.id !== id));
          renderizarHistorial();
          if (typeof ModuloDashboard !== 'undefined') ModuloDashboard.actualizar();
        }
      });
    });
  }

  document.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-screen="cobro"]');
    if (nav) setTimeout(() => renderizar(), 50);
  });

  return { abrirContrato, renderizar };
})();