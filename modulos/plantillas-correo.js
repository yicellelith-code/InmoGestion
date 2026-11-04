// ============================================================
// plantillas-correo.js  ·  Módulo independiente: Plantillas de Correo
// ============================================================

const ModuloPlantillas = (() => {

  function formatearMoneda(num) {
    return '$ ' + Number(num || 0).toLocaleString('es-CO');
  }

  function generarPropietario(datos) {
    // Verificamos si el correo viene en texto
    const emailDestino = typeof datos.correos === 'string' ? datos.correos : '';
    
    if (!emailDestino) {
      alert("Atención: El Propietario no tiene un correo electrónico registrado.");
      return;
    }

    let textoSoportes = '';
    if (datos.gastosDetalle && datos.gastosDetalle.length > 0) {
      let listaGastos = datos.gastosDetalle.map(g => 
        `&nbsp;&nbsp;&nbsp;- ${g.concepto}: ${formatearMoneda(g.monto)}`
      ).join('<br>');
      textoSoportes = `<br><br><b>(Desglose de gastos)</b><br>${listaGastos}`;
    }

    const asunto = encodeURIComponent(`Informe de Arriendo - ${datos.mesLetras} - ${datos.inmuebleTexto}`);
    
    const cuerpoHtml = 
      `Estimado(a) <b>${datos.propietarioNombre}</b>,<br><br>` +
      `Reciba un cordial saludo de parte de <b>InmoGestión</b>.<br><br>` +
      `A continuación, presentamos el resumen financiero correspondiente al mes de <b>${datos.mesLetras}</b> para el inmueble <b>${datos.inmuebleTexto}</b>:<br><br>` +
      `--------------------------------------------------<br>` +
      `<b>RESUMEN FINANCIERO</b><br>` +
      `--------------------------------------------------<br>` +
      `(+) Ingresos por Arriendo: &nbsp;&nbsp;&nbsp;${formatearMoneda(datos.ingresos)}<br>` +
      `(-) Comisión de administración: - ${formatearMoneda(datos.comision)}<br>` +
      `(-) IVA sobre comisión: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- ${formatearMoneda(datos.iva)}<br>` +
      `(-) Gastos descontados: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- ${formatearMoneda(datos.gastos)}` +
      `${textoSoportes}<br>` +
      `--------------------------------------------------<br>` +
      `<b>NETO A CONSIGNAR: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${formatearMoneda(datos.neto)}</b><br>` +
      `--------------------------------------------------<br><br>` +
      `Quedamos atentos a cualquier inquietud.<br><br>` +
      `Cordialmente,<br>` +
      `<b>Equipo de InmoGestión</b>`;

    window.open(`mailto:${emailDestino}?subject=${asunto}&body=${encodeURIComponent(cuerpoHtml)}`, '_blank');
  }

  function generarArrendatario(datos) {
    // Verificamos si el correo viene en texto
    const emailDestino = typeof datos.correos === 'string' ? datos.correos : '';
    
    if (!emailDestino) {
      alert("Atención: El Arrendatario no tiene un correo electrónico registrado.");
      return;
    }

    const asunto = encodeURIComponent(`Factura de Cobro - ${datos.mesLetras} - ${datos.inmuebleTexto}`);
    
    const cuerpoHtml = 
      `Estimado(a) <b>${datos.arrendatarioNombre}</b>,<br><br>` +
      `Reciba un cordial saludo de parte de <b>InmoGestión</b>.<br><br>` +
      `A continuación, presentamos el estado de cuenta para el inmueble <b>${datos.inmuebleTexto}</b>, correspondiente al mes de <b>${datos.mesLetras}</b>:<br><br>` +
      `--------------------------------------------------<br>` +
      `<b>DEUDAS ANTERIORES</b><br>` +
      `${datos.deudasTexto}` +
      `--------------------------------------------------<br>` +
      `<b>DETALLE DE CARGOS DEL MES</b><br>` +
      `${datos.detalleTexto}` +
      `--------------------------------------------------<br>` +
      `<b>RESUMEN FINANCIERO</b><br>` +
      `Cargos de este mes: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${formatearMoneda(datos.cargosMes)}<br>` +
      `<b>Total a Pagar: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${formatearMoneda(datos.totalAPagar)}</b><br>` +
      `Pagos recibidos: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- ${formatearMoneda(datos.pagosMes)}<br>` +
      `--------------------------------------------------<br>` +
      `<b>SALDO NETO: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${formatearMoneda(datos.saldoNeto)}</b><br>` +
      `--------------------------------------------------<br><br>` +
      (datos.saldoNeto > 0 
        ? `Le recordamos amablemente que tiene un saldo pendiente por regularizar.<br><br>` 
        : `¡Gracias por estar al día con sus obligaciones!<br><br>`) +
      `Quedamos atentos a cualquier inquietud.<br><br>` +
      `Cordialmente,<br>` +
      `<b>Equipo de InmoGestión</b>`;

    window.open(`mailto:${emailDestino}?subject=${asunto}&body=${encodeURIComponent(cuerpoHtml)}`, '_blank');
  }

  return { generarPropietario, generarArrendatario };
})();