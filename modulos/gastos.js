// ============================================================
// gastos.js  ·  Módulo independiente: Gastos Globales
// ============================================================

const ModuloGastosGlobales = (() => {
  const KEY = 'cobros'; // Usa la misma llave que cobros

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
    const screen = document.getElementById('screen-gastos');
    if (!screen) return;

    const cardTabla = screen.querySelector('.card');
    const cardForm = screen.querySelectorAll('.card')[1]; 

    // 1. Construir la interfaz si no existe
    if (cardTabla && !cardTabla.dataset.built) {
      cardTabla.dataset.built = 'true';
      
      // Tabla (Agregamos la columna Soporte)
      cardTabla.innerHTML = `
        <div class="actions mb" style="justify-content: space-between;">
          <h3 class="mt" style="margin:0;">Historial Global de Gastos</h3>
          <select id="gasto-filtro-contrato" style="min-width: 450px; max-width: 100%;">
            <option value="">— Todos los contratos —</option>
          </select>
        </div>
        <div style="overflow-x:auto;">
          <table>
            <thead><tr><th>Fecha</th><th>Contrato</th><th>Concepto</th><th>Valor</th><th>A cargo de</th><th>Soporte</th></tr></thead>
            <tbody id="gastos-tbody"></tbody>
          </table>
        </div>
      `;

      // Formulario de Registro (Agregamos el input file)
      if (cardForm) {
        cardForm.innerHTML = `
          <h3>Registrar Nuevo Gasto</h3>
          <p class="hint">A cargo del arrendatario o del propietario.</p>
          <div class="form mt">
            <div class="field">
              <label>Contrato</label>
              <select id="gasto-nuevo-contrato">
                <option value="">— Seleccionar contrato —</option>
              </select>
            </div>
            <div class="row">
              <div class="field" style="flex:1"><label>Fecha</label><input type="date" id="gasto-fecha"></div>
              <div class="field" style="flex:2"><label>Concepto</label><input type="text" id="gasto-concepto" placeholder="Ej: Reparación de tubería"></div>
            </div>
            <div class="row">
              <div class="field" style="flex:1"><label>Monto</label><input type="text" id="gasto-monto" class="input-money" placeholder="$ 0"></div>
              <div class="field" style="flex:1"><label>A cargo de</label>
                <select id="gasto-responsable"><option>Arrendatario</option><option>Propietario</option></select>
              </div>
              <div class="field" style="flex:1">
                <label>Soporte (Factura / Recibo)</label>
                <input type="file" id="gasto-soporte" accept="image/*,.pdf" style="font-size:13px; padding:5px;">
              </div>
            </div>
            <div class="actions mt">
              <button class="btn primary" id="btn-guardar-gasto">Guardar Gasto</button>
            </div>
          </div>
        `;
      }

      // Formateador de moneda
      document.getElementById('gasto-monto').addEventListener('input', function() {
        let val = this.value.replace(/\D/g, '');
        this.value = val ? '$ ' + parseInt(val, 10).toLocaleString('es-CO') : '';
      });

      // Eventos
      document.getElementById('gasto-filtro-contrato').addEventListener('change', renderizarTabla);
      document.getElementById('btn-guardar-gasto').addEventListener('click', guardarGasto);
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

    const selFiltro = document.getElementById('gasto-filtro-contrato');
    const selNuevo = document.getElementById('gasto-nuevo-contrato');
    
    if (selFiltro) {
      const valActual = selFiltro.value;
      selFiltro.innerHTML = '<option value="">— Todos los contratos —</option>' + opciones.replace('<option value="">— Seleccionar contrato —</option>', '');
      selFiltro.value = valActual;
    }
    if (selNuevo) {
      selNuevo.value = selNuevo.value || ''; // Mantiene la selección si ya existía
      selNuevo.innerHTML = opciones;
    }

    renderizarTabla();
  }

  function renderizarTabla() {
    const tbody = document.getElementById('gastos-tbody');
    if (!tbody) return;

    const filtroId = document.getElementById('gasto-filtro-contrato')?.value || '';
    
    let movs = cargar().filter(m => m.tipo === 'gasto');
    if (filtroId) {
      movs = movs.filter(m => m.contratoId === filtroId);
    }

    const contratos = ModuloContratos.listar();

    if (movs.length === 0) {
      tbody.innerHTML = '<tr class="empty"><td colspan="6">No hay gastos registrados.</td></tr>';
      return;
    }

    movs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    // Pintar tabla
    let totalGlobal = 0;
    tbody.innerHTML = movs.map(g => {
      totalGlobal += g.monto;
      const c = contratos.find(x => x.id === g.contratoId);
      
      // Botón de soporte
      let btnSoporte = '—';
      if (g.soporte) {
        btnSoporte = `<button class="btn" data-ver-soporte="${g.id}" style="padding: 4px 8px; font-size:12px;">📄 Ver</button>`;
      }

      return `
        <tr>
          <td>${escapeHtml(g.fecha)}</td>
          <td><strong>${c ? escapeHtml(c.codigo) : '—'}</strong></td>
          <td><small>${escapeHtml(g.detalle.split('(')[0])}</small></td>
          <td><strong>${formatearMoneda(g.monto)}</strong></td>
          <td><span class="badge">${escapeHtml(g.detalle.split('(')[1]?.replace(')', '') || 'N/A')}</span></td>
          <td>${btnSoporte}</td>
        </tr>
      `;
    }).join('');

    // Agregar fila de totales
    tbody.innerHTML += `
      <tr style="background:#fafbfd; font-size:15px;">
        <td colspan="3" style="text-align:right;"><strong>TOTAL GASTOS ${filtroId ? 'DEL CONTRATO' : 'GLOBAL'}:</strong></td>
        <td><strong style="color:#dc2626;">${formatearMoneda(totalGlobal)}</strong></td>
        <td colspan="2"></td>
      </tr>
    `;

    // Eventos para abrir el soporte
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
  }

  function guardarGasto() {
    const contratoId = document.getElementById('gasto-nuevo-contrato').value;
    const fecha = document.getElementById('gasto-fecha').value;
    const concepto = document.getElementById('gasto-concepto').value.trim();
    const monto = limpiarMoneda(document.getElementById('gasto-monto').value);
    const resp = document.getElementById('gasto-responsable').value;
    const fileInput = document.getElementById('gasto-soporte');

    if (!contratoId) return alert('Debes seleccionar un contrato.');
    if (!fecha || !concepto || monto === 0) return alert('Verifica la fecha, el concepto y el monto.');

    // Función que guarda definitivamente (con o sin soporte)
    const ejecutarGuardado = (soporteData = null) => {
      let lista = cargar();
      lista.push({
        id: Store.uid(), 
        contratoId: contratoId, 
        tipo: 'gasto', 
        fecha,
        detalle: `${concepto} (A cargo de ${resp})`, 
        monto: monto,
        soporte: soporteData
      });
      
      guardarLista(lista);
      
      // Limpiar formulario
      document.getElementById('gasto-concepto').value = '';
      document.getElementById('gasto-monto').value = '';
      fileInput.value = '';
      
      alert('Gasto registrado correctamente.');
      renderizarTabla();
    };

    // Si el usuario adjuntó un archivo, lo leemos como Base64
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = function(e) {
        ejecutarGuardado(e.target.result); 
      };
      reader.readAsDataURL(file);
    } else {
      ejecutarGuardado(null);
    }
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-screen="gastos"]')) setTimeout(renderizar, 50);
  });
  
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderizar);
  else renderizar();

  return { renderizar };
})();