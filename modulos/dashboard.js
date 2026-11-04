// ============================================================
// dashboard.js  ·  Módulo independiente: Dashboard Principal
// ============================================================

const ModuloDashboard = (() => {

  function formatearMoneda(num) {
    return '$ ' + Number(num || 0).toLocaleString('es-CO');
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // Función principal que actualiza todo el Dashboard
  function renderizar() {
    const screen = document.getElementById('screen-dashboard');
    if (!screen) return;

    // 1. Obtener todos los datos de los módulos
    const inmuebles = ModuloInmuebles.listar();
    const contratos = ModuloContratos.listar();
    const cobros = Store.get('cobros', []);
    const arrendatarios = ModuloArrendatarios.listar();

    // 2. Calcular KPIs
    const totalInmuebles = inmuebles.length;
    const contratosActivos = contratos.filter(c => {
      const hoy = new Date();
      hoy.setHours(0,0,0,0);
      return new Date(c.fechaFin + 'T00:00:00') >= hoy;
    }).length;

    // Pagos recibidos en el mes actual
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();
    let recaudadoMes = 0;
    let pagosPorValidar = 0;

    cobros.forEach(c => {
      if (c.tipo === 'pago' && c.fecha) {
        const f = new Date(c.fecha + 'T00:00:00');
        if (f.getMonth() === mesActual && f.getFullYear() === anioActual) {
          recaudadoMes += c.monto;
        }
        // Si no está validado, sumamos a "pagos por validar"
        if (!c.detalle.includes('[Validado]')) {
           pagosPorValidar++;
        }
      }
    });

    // 3. Actualizar las 4 tarjetas (KPIs)
    const kpis = screen.querySelectorAll('.kpi .value');
    if (kpis.length >= 4) {
      kpis[0].textContent = totalInmuebles;
      kpis[1].textContent = formatearMoneda(recaudadoMes);
      kpis[2].textContent = pagosPorValidar; 
      kpis[3].textContent = contratosActivos;
    }

    // 4. Alertas de Vencimiento (en la parte superior)
    let alertaDiv = document.getElementById('dash-alertas-vencimiento');
    if (!alertaDiv) {
      alertaDiv = document.createElement('div');
      alertaDiv.id = 'dash-alertas-vencimiento';
      alertaDiv.className = 'note';
      alertaDiv.style.background = '#fffbeb';
      alertaDiv.style.borderColor = '#fcd34d';
      alertaDiv.style.color = '#92400e';
      alertaDiv.style.marginBottom = '15px';
      
      const gridKpi = screen.querySelector('.grid');
      if (gridKpi) gridKpi.parentNode.insertBefore(alertaDiv, gridKpi);
    }

    const porVencer = contratos.filter(c => {
      if (!c.fechaFin) return false;
      const fechaFin = new Date(c.fechaFin + 'T00:00:00');
      return fechaFin.getMonth() === mesActual && 
             fechaFin.getFullYear() === anioActual && 
             fechaFin >= hoy;
    });

    const vencidos = contratos.filter(c => {
      if (!c.fechaFin) return false;
      return new Date(c.fechaFin + 'T00:00:00') < hoy;
    });

    if (porVencer.length === 0 && vencidos.length === 0) {
      alertaDiv.style.display = 'none';
    } else {
      alertaDiv.style.display = 'block';
      let mensajes = [];
      if (porVencer.length > 0) mensajes.push(`Tienes <strong>${porVencer.length}</strong> contrato(s) que vencen este mes.`);
      if (vencidos.length > 0) mensajes.push(`Hay <strong>${vencidos.length}</strong> contrato(s) vencidos sin prorrogar.`);
      alertaDiv.innerHTML = '<strong>⚠️ Alertas de Contratos:</strong> ' + mensajes.join(' ');
    }

    // 5. Tabla de Deudas de mayor a menor (AUDITORÍA CORREGIDA Y BOTÓN)
    let deudasContratos = [];
    
    contratos.forEach(contrato => {
      const movs = cobros.filter(c => c.contratoId === contrato.id);
      let cargos = 0;
      let gastosArr = 0;
      let pagos = 0;
      
      movs.forEach(m => {
        if (m.tipo === 'cargo') cargos += m.monto;
        if (m.tipo === 'gasto' && !m.detalle.includes('Propietario')) gastosArr += m.monto;
        if (m.tipo === 'pago') pagos += m.monto;
      });
      
      // Cálculo exacto de la deuda: Cargos + Gastos del Arrendatario - Pagos
      const saldo = (cargos + gastosArr) - pagos;
      
      if (saldo > 0) {
        const arr = arrendatarios.find(a => a.id === contrato.arrendatarioId);
        deudasContratos.push({
          id: contrato.id, // Guardamos el ID para el botón
          arrendatario: arr ? arr.nombre : 'Desconocido',
          contrato: contrato.codigo,
          saldo: saldo
        });
      }
    });

    // Ordenar de mayor a menor
    deudasContratos.sort((a, b) => b.saldo - a.saldo);

    const tbody = screen.querySelector('table tbody');
    if (tbody) {
      if (deudasContratos.length === 0) {
        tbody.innerHTML = '<tr class="empty"><td colspan="5">¡Felicidades! No hay deudas pendientes en este momento.</td></tr>';
      } else {
        tbody.innerHTML = deudasContratos.map(d => `
          <tr>
            <td><strong>${escapeHtml(d.arrendatario)}</strong></td>
            <td>${escapeHtml(d.contrato)}</td>
            <td>
              <!-- BOTÓN VER EN COBROS -->
              <button class="btn" style="padding: 4px 10px; font-size:12px; background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe;" 
                onclick="ModuloCobros.abrirContrato('${d.id}')">
                Ver en Cobros
              </button>
            </td>
            <td><strong style="color:#dc2626;">${formatearMoneda(d.saldo)}</strong></td>
            <td><span class="badge" style="background:#fee2e2;color:#991b1b;">Pendiente</span></td>
          </tr>
        `).join('');
      }
    }
  }

  // Actualizar el dashboard cada vez que el usuario entre a la pantalla
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-screen="dashboard"]')) {
      setTimeout(renderizar, 50);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderizar);
  } else {
    renderizar();
  }

  return { actualizar: renderizar };
})();