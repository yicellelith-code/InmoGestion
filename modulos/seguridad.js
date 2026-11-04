// ============================================================
// seguridad.js  ·  Módulo independiente: SMTP y Copias de Seguridad
// Llave propia: "seguridad"
// ============================================================

const ModuloSeguridad = (() => {
  const KEY = 'seguridad';

  const DEFAULTS = {
    smtpServer: 'smtp.gmail.com',
    puerto: 587,
    correoEmisor: 'notificaciones@inmogestion.com',
    clave: '',
    backupEmail: '',
    backupDia: 'Viernes',
    backupHora: '18:00',
    ultimoBackup: null
  };

  function cargar() {
    const g = Store.get(KEY, null);
    return g ? { ...DEFAULTS, ...g } : { ...DEFAULTS };
  }

  function guardar(datos) {
    return Store.set(KEY, datos);
  }

  function construirUI() {
    const screen = document.getElementById('screen-seguridad');
    if (!screen) return;

    if (!screen.querySelector('.form-smtp')) {
      screen.innerHTML = `
        <div class="screen-head">
          <div>
            <p class="crumb">Datos</p>
            <h1>SMTP, Respaldos y Seguridad</h1>
            <p class="sub">Configura el correo, programa backups y administra los respaldos.</p>
          </div>
        </div>

        <!-- Tarjeta 1: Configuración SMTP -->
        <div class="card">
          <h3>Configuración SMTP (Servidor de Correos)</h3>
          <div class="form-smtp mt">
            <div class="row">
              <div class="field" style="flex:1">
                <label>Servidor SMTP</label>
                <input type="text" id="smtp-server" placeholder="smtp.gmail.com">
              </div>
              <div class="field" style="flex:1">
                <label>Correo Emisor</label>
                <input type="email" id="smtp-correo" placeholder="notificaciones@inmogestion.com">
              </div>
            </div>
            
            <div class="row">
              <div class="field" style="flex:1">
                <label>Puerto</label>
                <input type="number" id="smtp-puerto" placeholder="587">
              </div>
              <div class="field" style="flex:1">
                <label>Clave SMTP</label>
                <div style="position:relative; display:flex;">
                  <input type="password" id="smtp-clave" style="width:100%; padding-right: 35px;">
                  <button type="button" id="btn-ver-clave" style="position:absolute; right:5px; top:5px; background:none; border:none; cursor:pointer;">👁️</button>
                </div>
              </div>
            </div>

            <div class="actions mt">
              <button type="button" class="btn" id="btn-guardar-smtp">Guardar Configuración SMTP</button>
            </div>
          </div>
        </div>

        <!-- Tarjeta 2: Programación de Backups -->
        <div class="card mt">
          <h3>Programación de Copias Automáticas</h3>
          <p class="hint">Selecciona el correo que recibirá los respaldos y la frecuencia. (Nota: El navegador debe estar abierto a esa hora para enviar el correo).</p>
          <div class="form mt">
            <div class="field">
              <label>Correo para recibir Backups</label>
              <input type="email" id="backup-email" placeholder="admin@inmogestion.com">
            </div>
            <div class="row">
              <div class="field" style="flex:1">
                <label>Día de la semana</label>
                <select id="backup-dia">
                  <option>Lunes</option><option>Martes</option><option>Miércoles</option>
                  <option>Jueves</option><option>Viernes</option><option>Sábado</option><option>Domingo</option>
                </select>
              </div>
              <div class="field" style="flex:1">
                <label>Hora (Formato 24h)</label>
                <input type="time" id="backup-hora">
              </div>
            </div>
            <div class="actions mt">
              <button type="button" class="btn primary" id="btn-guardar-backup">Programar Backups</button>
            </div>
            <p class="hint mt" id="backup-status-info" style="font-weight:bold; color:#2563eb;"></p>
          </div>
        </div>

        <!-- Tarjeta 3: Acciones Manuales -->
        <div class="card mt">
          <h3>Respaldos Manuales</h3>
          <p class="hint">Descarga o restaura la base de datos en el momento que quieras.</p>
          
          <div class="row mt">
            <div class="card" style="flex:1; background:#fcfcfc;">
              <h4>Descargar Copia</h4>
              <p class="hint" style="margin-bottom:12px;">Guarda un archivo .json en tu computador.</p>
              <button type="button" class="btn" id="btn-backup" style="background:#f0fdf4; color:#166534; border-color:#bbf7d0;">
                🛡️ Descargar Copia Ahora
              </button>
            </div>

            <div class="card" style="flex:1; background:#fcfcfc;">
              <h4>Restaurar Copia</h4>
              <p class="hint" style="margin-bottom:12px;">Sube un archivo .json para recuperar los datos.</p>
              <input type="file" id="file-restore" accept=".json" style="display:none;">
              <button type="button" class="btn" id="btn-restore" style="background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe;">
                📤 Subir y Restaurar Copia
              </button>
            </div>
          </div>

          <p class="hint mt" id="backup-status" style="font-weight:bold;"></p>
        </div>
      `;

      // Eventos SMTP
      document.getElementById('btn-ver-clave').addEventListener('click', () => {
        const input = document.getElementById('smtp-clave');
        input.type = input.type === 'password' ? 'text' : 'password';
      });
      document.getElementById('btn-guardar-smtp').addEventListener('click', guardarDatosSMTP);

      // Eventos Backups
      document.getElementById('btn-guardar-backup').addEventListener('click', guardarProgramacion);
      document.getElementById('btn-backup').addEventListener('click', ejecutarBackupManual);
      document.getElementById('btn-restore').addEventListener('click', () => {
        document.getElementById('file-restore').click();
      });
      document.getElementById('file-restore').addEventListener('change', restaurarBackup);
    }

    llenarFormulario();
  }

  function llenarFormulario() {
    const d = cargar();
    const server = document.getElementById('smtp-server');
    if (server) {
      server.value = d.smtpServer;
      document.getElementById('smtp-puerto').value = d.puerto;
      document.getElementById('smtp-correo').value = d.correoEmisor;
      document.getElementById('smtp-clave').value = d.clave;

      document.getElementById('backup-email').value = d.backupEmail || '';
      document.getElementById('backup-dia').value = d.backupDia || 'Viernes';
      document.getElementById('backup-hora').value = d.backupHora || '18:00';

      const info = document.getElementById('backup-status-info');
      if (d.backupEmail) {
        info.innerHTML = `✔ Backups programados para los <b>${d.backupDia}</b> a las <b>${d.backupHora}</b> enviados a <b>${d.backupEmail}</b>.`;
      } else {
        info.innerHTML = `⚠ No has programado un correo para backups automáticos.`;
      }
    }
  }

  function guardarDatosSMTP() {
    const d = cargar();
    d.smtpServer = document.getElementById('smtp-server').value.trim();
    d.puerto = document.getElementById('smtp-puerto').value.trim();
    d.correoEmisor = document.getElementById('smtp-correo').value.trim();
    d.clave = document.getElementById('smtp-clave').value;

    if (guardar(d)) alert('Configuración SMTP guardada.');
  }

  function guardarProgramacion() {
    const d = cargar();
    d.backupEmail = document.getElementById('backup-email').value.trim();
    d.backupDia = document.getElementById('backup-dia').value;
    d.backupHora = document.getElementById('backup-hora').value;

    if (!d.backupEmail) return alert('Por favor, ingresa un correo para recibir los backups.');

    if (guardar(d)) {
      alert('Programación de backups guardada correctamente.');
      llenarFormulario();
    }
  }

  function ejecutarBackupManual() {
    const btn = document.getElementById('btn-backup');
    const status = document.getElementById('backup-status');
    
    btn.textContent = 'Generando copia...';
    btn.disabled = true;

    setTimeout(() => {
      try {
        const backupData = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.startsWith('inmogestion.')) {
            backupData[key] = JSON.parse(localStorage.getItem(key));
          }
        }

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const fecha = new Date().toISOString().split('T')[0];
        a.download = `Backup_InmoGestion_${fecha}.json`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        status.innerHTML = `<span style="color:#166534">✔ Copia de seguridad generada el ${new Date().toLocaleString('es-CO')}.</span>`;
        
        const d = cargar();
        d.ultimoBackup = new Date().toISOString();
        guardar(d);

      } catch (err) {
        status.innerHTML = `<span style="color:#dc2626">Error: ${err.message}</span>`;
      } finally {
        btn.textContent = '🛡️ Descargar Copia Ahora';
        btn.disabled = false;
      }
    }, 800);
  }

  function restaurarBackup(e) {
    const file = e.target.files[0];
    if (!file) return;

    const status = document.getElementById('backup-status');
    
    if (!confirm('⚠️ ADVERTENCIA: Esto reemplazará TODOS los datos actuales de tu sistema con los del archivo. ¿Estás segura de continuar?')) {
      e.target.value = ''; 
      return;
    }

    const reader = new FileReader();
    
    reader.onload = function(event) {
      try {
        const data = JSON.parse(event.target.result);
        let count = 0;

        for (const key in data) {
          if (key.startsWith('inmogestion.')) {
            localStorage.setItem(key, JSON.stringify(data[key]));
            count++;
          }
        }

        status.innerHTML = `<span style="color:#16a34a">✔ ¡Restauración exitosa! Se recuperaron ${count} módulos.</span>`;
        alert('Datos restaurados correctamente. La página se recargará.');
        location.reload();

      } catch (err) {
        status.innerHTML = `<span style="color:#dc2626">Error al leer el archivo. Asegúrate de que sea un JSON válido.</span>`;
        console.error(err);
      }
      e.target.value = ''; 
    };

    reader.readAsText(file);
  }

  // === MOTOR DE BACKUP AUTOMÁTICO ===
  function verificarProgramacion() {
    const d = cargar();
    if (!d.backupEmail || !d.backupDia || !d.backupHora) return;

    const ahora = new Date();
    const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const diaActual = diasSemana[ahora.getDay()];
    
    // Formato HH:MM
    const horaActual = String(ahora.getHours()).padStart(2, '0') + ':' + String(ahora.getMinutes()).padStart(2, '0');

    if (diaActual === d.backupDia && horaActual === d.backupHora) {
      // Verificar si ya se envió hoy para no enviarlo múltiples veces en el mismo minuto
      if (d.ultimoBackup) {
        const fechaUltimo = new Date(d.ultimoBackup);
        if (fechaUltimo.getDate() === ahora.getDate() && fechaUltimo.getMonth() === ahora.getMonth()) return;
      }

      // Ejecutar "Envío"
      console.log("Ejecutando backup automático...");
      
      const asunto = encodeURIComponent("Backup Automático - InmoGestión");
      const cuerpo = encodeURIComponent(
        `Hola,\n\nEste es el recordatorio de tu copia de seguridad programada para hoy (${d.backupDia}).\n\n` +
        `Por seguridad, los navegadores no pueden adjuntar archivos automáticamente. Por favor, da clic en "Descargar Copia Ahora" en la plataforma para generar tu archivo físico .json y guárdalo.\n\n` +
        `Atentamente,\nInmoGestión`
      );

      window.open(`mailto:${d.backupEmail}?subject=${asunto}&body=${cuerpo}`, '_blank');
      
      // Actualizar fecha del último backup
      d.ultimoBackup = new Date().toISOString();
      guardar(d);
    }
  }

  // Revisar cada 30 segundos si es la hora
  setInterval(verificarProgramacion, 30000);

  document.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-screen="seguridad"]');
    if (nav) {
      setTimeout(construirUI, 50);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', construirUI);
  } else {
    construirUI();
  }

  return { cargar };
})();