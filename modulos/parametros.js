// ============================================================
// parametros.js  ·  Módulo independiente: Parámetros
// Guarda: empresa, NIT, % comisión, IVA y métodos de pago.
// Llave propia: "parametros"
// No depende de atributos name en el HTML: busca por etiqueta.
// ============================================================

const ModuloParametros = (() => {

const KEY = 'parametros';

const DEFAULTS = {
    empresa: '',
    nit: '',
    comision: 10,
    iva: 19,
    metodosPago: [],
    actualizado: null
};

function cargar() {
    const guardado = Store.get(KEY, null);
    return guardado ? { ...DEFAULTS, ...guardado } : { ...DEFAULTS };
}

function guardar(datos) {
    const limpio = {
    empresa: (datos.empresa || '').trim(),
    nit: (datos.nit || '').trim(),
    comision: Number(datos.comision) || 0,
    iva: Number(datos.iva) || 0,
    metodosPago: Array.isArray(datos.metodosPago) ? datos.metodosPago : [],
    actualizado: new Date().toISOString()
    };
    return Store.set(KEY, limpio) ? limpio : null;
}

  // ---------- Localizar un campo por el texto de su etiqueta ----------
function campoPorLabel(screen, textoLabel) {
    const labels = Array.from(screen.querySelectorAll('label'));
    const label = labels.find(l =>
    l.textContent.trim().toLowerCase().startsWith(textoLabel.toLowerCase())
    );
    return label ? label.parentElement.querySelector('input, select, textarea') : null;
}

  // ---------- Pintar el formulario con lo guardado ----------
function renderFormulario() {
    const screen = document.getElementById('screen-parametros');
    if (!screen) return;

    const datos = cargar();

    const empresa = campoPorLabel(screen, 'Empresa');
    const nit = campoPorLabel(screen, 'NIT');
    const comision = campoPorLabel(screen, '% Comisión');
    const iva = campoPorLabel(screen, 'IVA');

    if (empresa) empresa.value = datos.empresa;
    if (nit) nit.value = datos.nit;
    if (comision) comision.value = datos.comision;
    if (iva) iva.value = datos.iva;

    screen.querySelectorAll('input[type="checkbox"]').forEach(chk => {
    const texto = chk.parentElement.textContent.trim();
    chk.checked = datos.metodosPago.includes(texto);
    });

    renderEstado(datos);
}

function renderEstado(datos) {
    const contenedor = document.getElementById('parametros-estado');
    if (!contenedor) return;

    if (!datos.actualizado) {
    contenedor.textContent = 'Aún no has guardado parámetros.';
    contenedor.className = 'note';
    return;
    }
    const fecha = new Date(datos.actualizado);
    contenedor.textContent =
    'Guardado el ' + fecha.toLocaleDateString('es-CO') +
    ' a las ' + fecha.toLocaleTimeString('es-CO');
    contenedor.className = 'note';
}

  // ---------- Leer el formulario ----------
function leerFormulario() {
    const screen = document.getElementById('screen-parametros');
    if (!screen) return null;

    return {
    empresa: campoPorLabel(screen, 'Empresa')?.value || '',
    nit: campoPorLabel(screen, 'NIT')?.value || '',
    comision: campoPorLabel(screen, '% Comisión')?.value || 0,
    iva: campoPorLabel(screen, 'IVA')?.value || 0,
    metodosPago: Array.from(
        screen.querySelectorAll('input[type="checkbox"]:checked')
    ).map(chk => chk.parentElement.textContent.trim())
    };
}

  // ---------- Acción del botón Guardar ----------
function onGuardar() {
    const datos = leerFormulario();
    if (!datos) return;

    const mensajes = [];
    if (!datos.empresa) mensajes.push('El nombre de la empresa es obligatorio.');
    if (Number(datos.comision) < 0 || Number(datos.comision) > 100)
    mensajes.push('La comisión debe estar entre 0 y 100.');
    if (Number(datos.iva) < 0 || Number(datos.iva) > 100)
    mensajes.push('El IVA debe estar entre 0 y 100.');

    if (mensajes.length) {
    alert(mensajes.join('\n'));
    return;
    }

    const guardado = guardar(datos);
    if (!guardado) {
    alert('No se pudo guardar. Revisa el espacio de localStorage.');
    return;
    }
    renderEstado(guardado);
    alert('Parámetros guardados correctamente.');
}

function getParametros() {
    return cargar();
}

  // ---------- Inicialización ----------
function init() {
    const screen = document.getElementById('screen-parametros');
    if (!screen) return;

    if (!document.getElementById('parametros-estado')) {
    const estado = document.createElement('div');
    estado.id = 'parametros-estado';
    estado.className = 'note mt';
    screen.querySelector('.form')?.parentElement?.appendChild(estado);
    }

    const botonGuardar = screen.querySelector('.actions .btn.primary');
    if (botonGuardar) {
    botonGuardar.removeAttribute('data-soon');
    botonGuardar.textContent = 'Guardar parámetros';
      // Evitar doble listener si init se ejecuta dos veces
    const nuevo = botonGuardar.cloneNode(true);
    botonGuardar.parentElement.replaceChild(nuevo, botonGuardar);
    nuevo.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        onGuardar();
    });
    }

    renderFormulario();
}

  // Esperar a que la app esté lista
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

return { getParametros };
})();