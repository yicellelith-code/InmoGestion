// ============================================================
// app.js  ·  Navegación Principal y Conexión de Botones
// ============================================================

const titles = {
  dashboard: 'Principal · Dashboard',
  contratos: 'Principal · Contratos',
  'contrato-detalle': 'Principal · Contratos · Detalle',
  cobro: 'Principal · Contratos · Detalle · Cobro',
  inmuebles: 'Registro · Inmuebles',
  copropiedades: 'Registro · Copropiedades',
  arrendatarios: 'Registro · Arrendatarios',
  propietarios: 'Registro · Propietarios',
  pagos: 'Financiero · Pagos',
  gastos: 'Financiero · Gastos',
  'estados-cuenta': 'Financiero · Estados de cuenta',
  'rep-propietario': 'Reportes · Informe Propietario',
  'rep-arrendatario': 'Reportes · Informe Arrendatario',
  cierre: 'Reportes · Cierre mensual',
  importar: 'Datos · Importar Excel',
  exportar: 'Datos · Exportar Excel',
  parametros: 'Datos · Parámetros',
  seguridad: 'Datos · Seguridad y SMTP'
};

const parent = { 'contrato-detalle': 'contratos', cobro: 'contratos' };

function showScreen(name) {
  if (!document.getElementById('screen-' + name)) name = 'dashboard';

  document.querySelectorAll('.screen').forEach(s =>
    s.classList.toggle('active', s.id === 'screen-' + name)
  );

  document.querySelectorAll('.nav-item').forEach(b =>
    b.classList.toggle('active',
      b.dataset.screen === name || b.dataset.screen === parent[name])
  );

  document.getElementById('topbar-title').textContent = titles[name] || 'InmoGestión';
  window.scrollTo(0, 0);

  if (location.hash.slice(1) !== name) {
    history.replaceState(null, '', '#' + name);
  }

  document.querySelector('.sidebar').classList.remove('open');
}

document.addEventListener('click', (e) => {
  // Navegación del menú lateral
  const nav = e.target.closest('[data-screen]');
  if (nav) {
    e.preventDefault();
    showScreen(nav.dataset.screen);
    return;
  }

  // Pestañas del detalle
  const tab = e.target.closest('[data-tab]');
  if (tab) {
    const wrap = tab.closest('.screen');
    wrap.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
    wrap.querySelectorAll('.tabpanel').forEach(p =>
      p.classList.toggle('active', p.id === tab.dataset.tab)
    );
    return;
  }

  // CONEXIÓN DE BOTONES "NUEVO" CON EL FORMULARIO
  const btnNuevo = e.target.closest('button');
  if (btnNuevo) {
    const text = btnNuevo.textContent.toLowerCase().trim();
    
    if (text.includes('nuevo') || text.includes('nueva')) {
      btnNuevo.removeAttribute('data-soon');
      
      const screen = btnNuevo.closest('.screen');
      if (screen) {
        const cardForm = screen.querySelector('.card.mt') || screen.querySelector('.form');
        if (cardForm) {
          cardForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
          cardForm.style.transition = 'box-shadow 0.5s';
          cardForm.style.boxShadow = '0 0 0 4px #2563eb';
          setTimeout(() => { cardForm.style.boxShadow = 'none'; }, 1500);
        }
      }
      return;
    }
  }

  // Alerta para botones que aún no tienen lógica
  if (e.target.closest('[data-soon]')) {
    alert('Este botón estará disponible en una próxima actualización.');
    return;
  }

  if (e.target.closest('#menu-btn')) {
    document.querySelector('.sidebar').classList.toggle('open');
  }
});

window.addEventListener('hashchange', () =>
  showScreen(location.hash.slice(1) || 'dashboard')
);

showScreen(location.hash.slice(1) || 'dashboard');

// Verificaciones iniciales
if (typeof ModuloContratos !== 'undefined' && ModuloContratos.verificarEstados) {
  ModuloContratos.verificarEstados();
}

if (typeof ModuloDashboard !== 'undefined' && ModuloDashboard.actualizar) {
  ModuloDashboard.actualizar();
}