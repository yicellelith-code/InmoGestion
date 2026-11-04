// ============================================================
// botones.js · Conexión de botones de la Fase 1 a la Fase 2
// ============================================================

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  const texto = btn.textContent.trim().toLowerCase();

  // 1. Botón Guardar en Inmuebles
  if (texto === 'guardar' && btn.closest('#screen-inmuebles')) {
    btn.removeAttribute('data-soon');
    return; 
  }

  // 2. Botón Nuevo Contrato
  if (texto === 'nuevo contrato') {
    e.preventDefault();
    // Buscamos el formulario de contratos (que está inyectado en la última tarjeta)
    const tarjetas = document.querySelectorAll('#screen-contratos .card');
    if (tarjetas.length > 0) {
      const formContrato = tarjetas[tarjetas.length - 1];
      formContrato.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Efecto visual para que el humano vea dónde debe llenar
      formContrato.style.transition = 'box-shadow 0.5s';
      formContrato.style.boxShadow = '0 0 0 3px #2563eb';
      setTimeout(() => { formContrato.style.boxShadow = 'none'; }, 1500);
    }
    return;
  }

  // 3. Botones de "Nuevo" en los módulos de registro
  if (texto === 'nuevo inmueble' || texto === 'nueva copropiedad' || texto === 'nuevo arrendatario' || texto === 'nuevo propietario' || texto === 'nuevo gasto') {
    btn.removeAttribute('data-soon');
    const form = btn.closest('.screen').querySelector('.form');
    if (form) {
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      form.style.transition = 'box-shadow 0.5s';
      form.style.boxShadow = '0 0 0 3px #2563eb';
      setTimeout(() => { form.style.boxShadow = 'none'; }, 1500);
    }
    return;
  }
});