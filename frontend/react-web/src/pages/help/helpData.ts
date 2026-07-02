export type Locale = 'en' | 'es';

interface HelpSection {
  id: string;
  title: string;
  intro: string;
  steps: string[];
  screenshots: string[];
  platformNote?: string;
}

interface HelpData {
  pageTitle: string;
  tocTitle: string;
  sections: HelpSection[];
}

const en: HelpData = {
  pageTitle: 'User Manual',
  tocTitle: 'Table of Contents',
  sections: [
    {
      id: 'getting-started',
      title: '1. Getting Started',
      intro:
        'Planixor is a shift management and scheduling tool that unifies work shifts, calendar events, reminders, notifications, and reports into a single application. All your data is stored locally on your device (offline-first), so the app works fully without internet.',
      steps: [
        'All data is stored locally: IndexedDB on web, SQLite on Android.',
        'No account or internet connection is required for core functionality.',
        'Navigation: on web, use the sidebar on the left. On Android, use the bottom navigation bar.',
        'Both platforms share the same navigation order: Calendar, Reports, Shifts, Reminders, Settings.',
        'Synchronization across devices is optional and requires deploying your own backend server.',
      ],
      screenshots: ['/help/screenshot-planixor.png'],
    },
    {
      id: 'calendar',
      title: '2. Calendar',
      intro:
        'The calendar is the main view of Planixor. It supports four view modes: Day, Week, Month, and Year. Each view provides different levels of detail about your schedule.',
      steps: [
        'Day View: Shows a vertical timeline with a current time indicator (blue line). Events appear as colored blocks.',
        'Week View: Displays a 7-day grid with event blocks positioned by time.',
        'Month View: Shows the entire month with colored dots indicating events on each day. Click a day to navigate to the Day view.',
        'Year View: A compact overview of the entire year. Click a month to navigate to the Month view.',
        'Use the arrow buttons (< >) to navigate between dates.',
        'Press the "Today" button to jump back to the current date.',
        'Switch views using the view selector buttons (Day / Week / Month / Year).',
      ],
      screenshots: [
        '/help/screenshot-calendar-day.png',
        '/help/screenshot-calendar-week.png',
        '/help/screenshot-calendar-month.png',
        '/help/screenshot-calendar-year.png',
      ],
    },
    {
      id: 'shifts',
      title: '3. Shifts',
      intro:
        'Shifts are reusable templates that define recurring work patterns. Each shift has a name, emoji icon, color, start/end time, and hours worked. You assign shifts to calendar events.',
      steps: [
        'Create a shift: Go to Shifts, press the "+" button. Enter name, pick an emoji icon, choose a color from the palette, and set start/end times.',
        'The "Hours Worked" field is auto-calculated from start and end times.',
        '24-hour shifts: set start time equal to end time (e.g., 08:00 to 08:00).',
        'Midnight-crossing shifts: set end time earlier than start time (e.g., 22:00 to 06:00).',
        'Edit a shift by tapping/clicking the edit icon on the shift card.',
        'Deactivate a shift (pause icon) to hide it from the event type selector without deleting it.',
        'Reactivate a shift (play icon) to make it available again.',
        'Delete a shift using the trash icon. This cannot be undone.',
        'The color picker shows a palette of 45 colors (9 families × 5 shades). Theme-aware recommendations highlight which shades have best contrast.',
      ],
      screenshots: ['/help/screenshot-shift-list.png', '/help/screenshot-shift-form.png'],
    },
    {
      id: 'reminders',
      title: '4. Reminders',
      intro:
        'Reminders are reusable templates similar to shifts but without time constraints. They represent recurring events or tasks you want to track on your calendar (e.g., "Take Medicine", "Team Meeting").',
      steps: [
        'Create a reminder: Go to Reminders, press "+". Enter a name, pick an emoji icon, and choose a color.',
        'Edit a reminder by tapping the edit icon on the reminder card.',
        'Deactivate a reminder (pause icon) to hide it from the event type selector.',
        'Reactivate a reminder (play icon) to make it available again.',
        'Delete a reminder using the trash icon.',
      ],
      screenshots: ['/help/screenshot-reminder-list.png', '/help/screenshot-reminder-form.png'],
    },
    {
      id: 'calendar-events',
      title: '5. Calendar Events',
      intro:
        'Calendar events are the entries that appear on your calendar. Each event is linked to either a shift or a reminder template.',
      steps: [
        'Create an event: On the Calendar page, press "+" and select the event type (a shift or reminder).',
        'If you select a shift, the start/end times and hours worked are auto-populated from the shift definition (read-only).',
        'If you select a reminder, you set the start/end times manually.',
        'Choose start and end day. Multi-day events are supported.',
        'Add optional notes to describe the event.',
        'Configure alerts: at start, 10 minutes before, 1 hour before, or 1 day before.',
        'One shift per day restriction: you cannot assign two shift-type events on the same day.',
        'Edit an event by tapping it on the calendar.',
        'Delete an event from the event detail/edit screen.',
      ],
      screenshots: ['/help/screenshot-event-form.png'],
    },
    {
      id: 'notifications',
      title: '6. Notifications',
      intro:
        'Planixor sends notifications based on the alerts you configure for your calendar events. You can view all notifications from the bell icon in the top bar.',
      steps: [
        'Notifications are triggered at the times you configured (at start, 10min before, 1h before, 1 day before).',
        'Notification channels: in-app, system (push), or both. Configure in Settings.',
        'Tap the bell icon in the top bar to view all notifications.',
        'Use "Mark all as read" to clear unread indicators.',
        'Past notifications are automatically cleaned up during sync cycles.',
      ],
      screenshots: ['/help/screenshot-notifications.png'],
    },
    {
      id: 'reports',
      title: '7. Reports',
      intro:
        'The Reports section shows statistics about your worked hours with visual charts. Filter by day, week, month, or year.',
      steps: [
        'View hours worked per day, week, month, or year using the time range selector.',
        'Bar charts show hours distribution across the selected period.',
        'Donut charts show breakdown by shift type.',
        'Configure your annual hours target in "Annual Hours Configuration" to track progress.',
        'Reports update automatically as you add or modify calendar events.',
      ],
      screenshots: ['/help/screenshot-reports.png'],
    },
    {
      id: 'synchronization',
      title: '8. Synchronization',
      intro:
        'Synchronization is an optional feature that lets you keep data in sync across multiple devices. It requires deploying your own self-hosted backend server.',
      steps: [
        'Go to Settings > Sync to configure synchronization.',
        'Enter your server URL (e.g., https://your-server.com/api) and API key.',
        'Press "Validate" to test the connection. If successful, sync activates.',
        'The connection status indicator in the top bar shows: Active (green), Failing (red), or Paused.',
        'Sync runs automatically at a configurable interval (default: 5 minutes).',
        'Sync also triggers when the app opens/gains focus and pushes when the app loses focus.',
        'You can pause/resume sync at any time.',
        'Conflict resolution: Last-Writer-Wins (LWW) based on modification timestamp.',
        'If the server returns a different username, a confirmation dialog appears warning that local data will be wiped.',
      ],
      screenshots: ['/help/screenshot-sync-config.png'],
      platformNote:
        'The sync interface is identical on both web and Android platforms.',
    },
    {
      id: 'backups',
      title: '9. Backups',
      intro:
        'Backups let you export all your local data to a portable .bak file and restore it later — on the same or a different device. No backend server is required.',
      steps: [
        'Go to Settings > Backups section.',
        'Create Backup: Exports all data (events, shifts, reminders, notifications, hours config, sync config) to a .bak JSON file.',
        'A file save dialog opens to choose where to save the backup.',
        'Restore Backup: Opens a file picker to select a .bak file.',
        'If local data already exists, a confirmation dialog appears before merging.',
        'Restore uses LWW (Last-Writer-Wins) merge: newer records overwrite older ones.',
        'Web: Uses File System Access API (or download fallback).',
        'Android: Uses Storage Access Framework for file selection.',
        'The backup file is cross-platform — you can create on web and restore on Android, or vice versa.',
      ],
      screenshots: ['/help/screenshot-backup-section.png'],
    },
    {
      id: 'settings',
      title: '10. Settings',
      intro:
        'The Settings page lets you customize Planixor to your preferences.',
      steps: [
        'Theme: Choose between Light, Dark, or System (follows your device preference). Applied immediately.',
        'Language: Switch between Spanish (ES) and English (EN). Applied immediately without restart.',
        'Notifications: Configure the notification channel (in-app, system, or both).',
        'Sync: Configure synchronization with your self-hosted backend.',
        'Backups: Create or restore data backups.',
        'Reset Application (danger zone): Deletes ALL local data permanently. Use with caution.',
      ],
      screenshots: ['/help/screenshot-settings.png'],
    },
  ],
};

const es: HelpData = {
  pageTitle: 'Manual de Usuario',
  tocTitle: 'Tabla de Contenidos',
  sections: [
    {
      id: 'getting-started',
      title: '1. Primeros Pasos',
      intro:
        'Planixor es una herramienta de gestión de turnos y horarios que unifica turnos de trabajo, eventos del calendario, recordatorios, notificaciones e informes en una sola aplicación. Todos tus datos se almacenan localmente en tu dispositivo (offline-first), por lo que la app funciona completamente sin internet.',
      steps: [
        'Todos los datos se almacenan localmente: IndexedDB en web, SQLite en Android.',
        'No se requiere cuenta ni conexión a internet para la funcionalidad principal.',
        'Navegación: en web, usa la barra lateral izquierda. En Android, usa la barra de navegación inferior.',
        'Ambas plataformas comparten el mismo orden de navegación: Calendario, Informes, Turnos, Recordatorios, Ajustes.',
        'La sincronización entre dispositivos es opcional y requiere desplegar tu propio servidor backend.',
      ],
      screenshots: ['/help/screenshot-planixor.png'],
    },
    {
      id: 'calendar',
      title: '2. Calendario',
      intro:
        'El calendario es la vista principal de Planixor. Soporta cuatro modos de vista: Día, Semana, Mes y Año. Cada vista proporciona diferentes niveles de detalle sobre tu horario.',
      steps: [
        'Vista Día: Muestra una línea de tiempo vertical con un indicador de hora actual (línea azul). Los eventos aparecen como bloques de color.',
        'Vista Semana: Muestra una cuadrícula de 7 días con bloques de eventos posicionados por hora.',
        'Vista Mes: Muestra el mes completo con puntos de colores indicando eventos en cada día. Haz clic en un día para navegar a la vista de Día.',
        'Vista Año: Una vista compacta de todo el año. Haz clic en un mes para navegar a la vista de Mes.',
        'Usa los botones de flecha (< >) para navegar entre fechas.',
        'Presiona el botón "Hoy" para volver a la fecha actual.',
        'Cambia de vista usando los botones del selector de vista (Día / Semana / Mes / Año).',
      ],
      screenshots: [
        '/help/screenshot-calendar-day.png',
        '/help/screenshot-calendar-week.png',
        '/help/screenshot-calendar-month.png',
        '/help/screenshot-calendar-year.png',
      ],
    },
    {
      id: 'shifts',
      title: '3. Turnos',
      intro:
        'Los turnos son plantillas reutilizables que definen patrones de trabajo recurrentes. Cada turno tiene un nombre, un icono emoji, un color, hora de inicio/fin y horas trabajadas. Asignas turnos a eventos del calendario.',
      steps: [
        'Crear un turno: Ve a Turnos, presiona el botón "+". Introduce el nombre, elige un emoji, selecciona un color de la paleta y configura las horas de inicio/fin.',
        'El campo "Horas Trabajadas" se calcula automáticamente a partir de las horas de inicio y fin.',
        'Turnos de 24 horas: establece la hora de inicio igual a la de fin (ej: 08:00 a 08:00).',
        'Turnos que cruzan medianoche: establece la hora de fin anterior a la de inicio (ej: 22:00 a 06:00).',
        'Edita un turno tocando/haciendo clic en el icono de editar en la tarjeta del turno.',
        'Desactiva un turno (icono de pausa) para ocultarlo del selector de tipo de evento sin eliminarlo.',
        'Reactiva un turno (icono de reproducir) para que esté disponible de nuevo.',
        'Elimina un turno usando el icono de papelera. Esto no se puede deshacer.',
        'El selector de color muestra una paleta de 45 colores (9 familias × 5 tonos). Las recomendaciones adaptadas al tema resaltan qué tonos tienen mejor contraste.',
      ],
      screenshots: ['/help/screenshot-shift-list.png', '/help/screenshot-shift-form.png'],
    },
    {
      id: 'reminders',
      title: '4. Recordatorios',
      intro:
        'Los recordatorios son plantillas reutilizables similares a los turnos pero sin restricciones de tiempo. Representan eventos o tareas recurrentes que quieres seguir en tu calendario (ej: "Tomar Medicación", "Reunión de Equipo").',
      steps: [
        'Crear un recordatorio: Ve a Recordatorios, presiona "+". Introduce un nombre, elige un emoji y selecciona un color.',
        'Edita un recordatorio tocando el icono de editar en la tarjeta del recordatorio.',
        'Desactiva un recordatorio (icono de pausa) para ocultarlo del selector de tipo de evento.',
        'Reactiva un recordatorio (icono de reproducir) para que esté disponible de nuevo.',
        'Elimina un recordatorio usando el icono de papelera.',
      ],
      screenshots: ['/help/screenshot-reminder-list.png', '/help/screenshot-reminder-form.png'],
    },
    {
      id: 'calendar-events',
      title: '5. Eventos del Calendario',
      intro:
        'Los eventos del calendario son las entradas que aparecen en tu calendario. Cada evento está vinculado a una plantilla de turno o recordatorio.',
      steps: [
        'Crear un evento: En la página del Calendario, presiona "+" y selecciona el tipo de evento (un turno o recordatorio).',
        'Si seleccionas un turno, las horas de inicio/fin y horas trabajadas se auto-rellenan desde la definición del turno (solo lectura).',
        'Si seleccionas un recordatorio, configuras las horas de inicio/fin manualmente.',
        'Elige el día de inicio y fin. Se soportan eventos de varios días.',
        'Añade notas opcionales para describir el evento.',
        'Configura alertas: al inicio, 10 minutos antes, 1 hora antes o 1 día antes.',
        'Restricción de un turno por día: no puedes asignar dos eventos de tipo turno en el mismo día.',
        'Edita un evento tocándolo en el calendario.',
        'Elimina un evento desde la pantalla de detalle/edición del evento.',
      ],
      screenshots: ['/help/screenshot-event-form.png'],
    },
    {
      id: 'notifications',
      title: '6. Notificaciones',
      intro:
        'Planixor envía notificaciones basadas en las alertas que configuras para tus eventos del calendario. Puedes ver todas las notificaciones desde el icono de campana en la barra superior.',
      steps: [
        'Las notificaciones se activan en los momentos que configuraste (al inicio, 10min antes, 1h antes, 1 día antes).',
        'Canales de notificación: en la app, sistema (push), o ambos. Configúralo en Ajustes.',
        'Toca el icono de campana en la barra superior para ver todas las notificaciones.',
        'Usa "Marcar todas como leídas" para limpiar los indicadores de no leídas.',
        'Las notificaciones pasadas se limpian automáticamente durante los ciclos de sincronización.',
      ],
      screenshots: ['/help/screenshot-notifications.png'],
    },
    {
      id: 'reports',
      title: '7. Informes',
      intro:
        'La sección de Informes muestra estadísticas sobre tus horas trabajadas con gráficos visuales. Filtra por día, semana, mes o año.',
      steps: [
        'Visualiza las horas trabajadas por día, semana, mes o año usando el selector de rango temporal.',
        'Los gráficos de barras muestran la distribución de horas en el período seleccionado.',
        'Los gráficos de dona muestran el desglose por tipo de turno.',
        'Configura tu objetivo de horas anuales en "Configuración de Horas Anuales" para seguir el progreso.',
        'Los informes se actualizan automáticamente al añadir o modificar eventos del calendario.',
      ],
      screenshots: ['/help/screenshot-reports.png'],
    },
    {
      id: 'synchronization',
      title: '8. Sincronización',
      intro:
        'La sincronización es una función opcional que te permite mantener los datos sincronizados entre múltiples dispositivos. Requiere desplegar tu propio servidor backend auto-alojado.',
      steps: [
        'Ve a Ajustes > Sincronización para configurar la sincronización.',
        'Introduce la URL de tu servidor (ej: https://tu-servidor.com/api) y la clave API.',
        'Presiona "Validar" para probar la conexión. Si es exitosa, la sincronización se activa.',
        'El indicador de estado de conexión en la barra superior muestra: Activo (verde), Fallando (rojo) o Pausado.',
        'La sincronización se ejecuta automáticamente con un intervalo configurable (por defecto: 5 minutos).',
        'También se activa al abrir/enfocar la app y hace push al perder el foco.',
        'Puedes pausar/reanudar la sincronización en cualquier momento.',
        'Resolución de conflictos: Último-Escritor-Gana (LWW) basado en marca de tiempo de modificación.',
        'Si el servidor devuelve un nombre de usuario diferente, aparece un diálogo de confirmación advirtiendo que los datos locales se borrarán.',
      ],
      screenshots: ['/help/screenshot-sync-config.png'],
      platformNote:
        'La interfaz de sincronización es idéntica en ambas plataformas web y Android.',
    },
    {
      id: 'backups',
      title: '9. Respaldos',
      intro:
        'Los respaldos te permiten exportar todos tus datos locales a un archivo portable .bak y restaurarlo después — en el mismo o en otro dispositivo. No se requiere servidor backend.',
      steps: [
        'Ve a Ajustes > sección Respaldos.',
        'Crear Respaldo: Exporta todos los datos (eventos, turnos, recordatorios, notificaciones, config de horas, config de sincronización) a un archivo JSON .bak.',
        'Se abre un diálogo para elegir dónde guardar el respaldo.',
        'Restaurar Respaldo: Abre un selector de archivos para seleccionar un archivo .bak.',
        'Si ya existen datos locales, aparece un diálogo de confirmación antes de fusionar.',
        'La restauración usa fusión LWW (Último-Escritor-Gana): los registros más recientes sobreescriben a los antiguos.',
        'Web: Usa la File System Access API (o descarga como alternativa).',
        'Android: Usa el Storage Access Framework para la selección de archivos.',
        'El archivo de respaldo es multiplataforma — puedes crear en web y restaurar en Android, o viceversa.',
      ],
      screenshots: ['/help/screenshot-backup-section.png'],
    },
    {
      id: 'settings',
      title: '10. Ajustes',
      intro:
        'La página de Ajustes te permite personalizar Planixor según tus preferencias.',
      steps: [
        'Tema: Elige entre Claro, Oscuro o Sistema (sigue la preferencia de tu dispositivo). Se aplica inmediatamente.',
        'Idioma: Cambia entre Español (ES) e Inglés (EN). Se aplica inmediatamente sin reiniciar.',
        'Notificaciones: Configura el canal de notificaciones (en la app, sistema o ambos).',
        'Sincronización: Configura la sincronización con tu backend auto-alojado.',
        'Respaldos: Crea o restaura copias de seguridad de datos.',
        'Restablecer Aplicación (zona de peligro): Elimina TODOS los datos locales permanentemente. Usar con precaución.',
      ],
      screenshots: ['/help/screenshot-settings.png'],
    },
  ],
};

const helpDataMap: Record<Locale, HelpData> = { en, es };

export const getHelpData = (locale: Locale): HelpData => helpDataMap[locale];
