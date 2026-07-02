import logoIcon from '@/assets/logo-icon.svg';

/**
 * Privacy Policy page — standalone (no AppShell).
 * Required for Google Play deployment and AEPD compliance.
 */
export const PrivacyPolicyPage = () => {
  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '40px 24px',
        fontFamily: 'Poppins, sans-serif',
        color: '#111827',
        lineHeight: 1.7,
        backgroundColor: '#FFFFFF',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <header
        style={{
          marginBottom: '48px',
          paddingBottom: '24px',
          borderBottom: '1px solid #E5E7EB',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src={logoIcon}
            alt="Planixor"
            style={{ width: '32px', height: '32px' }}
          />
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>
            Planixor
          </span>
        </div>
      </header>

      {/* English Section */}
      <section style={{ marginBottom: '64px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
          Privacy Policy
        </h1>
        <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '32px' }}>
          Last updated: July 2025
        </p>
        <p style={{ marginBottom: '24px' }}>
          Planixor (&ldquo;the App&rdquo;) is developed by Codenized. This privacy policy
          explains how the App handles your data.
        </p>

        <h2 style={sectionHeadingStyle}>1. Data Collection and Storage</h2>
        <p style={{ marginBottom: '16px' }}>
          Planixor does NOT collect, transmit, or store any personal data on external
          servers controlled by the developer. All data you enter into the application
          (shifts, calendar events, reminders, notifications, reports, and configuration)
          is stored exclusively on your device&apos;s local storage.
        </p>
        <ul style={listStyle}>
          <li>
            On Android: data is stored in a local SQLite database and DataStore
            preferences on your device.
          </li>
          <li>On Web (PWA): data is stored in your browser&apos;s IndexedDB.</li>
        </ul>
        <p style={{ marginBottom: '24px' }}>
          The developer has no access to your data at any time.
        </p>

        <h2 style={sectionHeadingStyle}>2. Optional Self-Hosted Synchronization</h2>
        <p style={{ marginBottom: '16px' }}>
          Planixor offers an optional synchronization feature that allows you to sync
          data across multiple devices. This feature requires you to deploy and configure
          your own backend server. When you enable synchronization:
        </p>
        <ul style={listStyle}>
          <li>
            Your data is transmitted between your devices and YOUR self-hosted server
            only.
          </li>
          <li>
            The developer does NOT operate, manage, or have access to your sync server.
          </li>
          <li>
            You are solely responsible for the security and privacy of your self-hosted
            backend.
          </li>
          <li>
            You configure the server URL and API key in the application settings.
          </li>
        </ul>
        <p style={{ marginBottom: '24px' }}>
          If you do not configure synchronization, no data ever leaves your device.
        </p>

        <h2 style={sectionHeadingStyle}>3. Data We Do NOT Collect</h2>
        <ul style={listStyle}>
          <li>No personal information (name, email, phone)</li>
          <li>No usage analytics or telemetry</li>
          <li>No device identifiers</li>
          <li>No location data</li>
          <li>No advertising identifiers</li>
          <li>No cookies or tracking technologies</li>
          <li>No data shared with third parties</li>
        </ul>

        <h2 style={sectionHeadingStyle}>4. Local Backups</h2>
        <p style={{ marginBottom: '24px' }}>
          The App provides a backup feature that exports your data to a local file on
          your device. This file is stored in a location you choose on your device or
          cloud storage (managed by your operating system&apos;s file picker). The
          developer has no access to backup files.
        </p>

        <h2 style={sectionHeadingStyle}>5. Data Deletion</h2>
        <p style={{ marginBottom: '16px' }}>
          Since all data is stored locally on your device, you can delete all application
          data at any time by:
        </p>
        <ul style={listStyle}>
          <li>
            Using the &ldquo;Reset Application&rdquo; option in Settings (deletes all
            local data)
          </li>
          <li>Uninstalling the application</li>
          <li>Clearing the application&apos;s storage through your device settings</li>
        </ul>

        <h2 style={sectionHeadingStyle}>6. Children&apos;s Privacy</h2>
        <p style={{ marginBottom: '24px' }}>
          The App does not knowingly collect data from children under 13. Since no data
          is collected from any user, this is inherently satisfied.
        </p>

        <h2 style={sectionHeadingStyle}>7. Changes to This Policy</h2>
        <p style={{ marginBottom: '24px' }}>
          We may update this privacy policy from time to time. Changes will be reflected
          in the &ldquo;Last updated&rdquo; date at the top of this page.
        </p>

        <h2 style={sectionHeadingStyle}>8. Contact</h2>
        <p style={{ marginBottom: '8px' }}>
          If you have questions about this privacy policy, you can contact us at:
        </p>
        <p style={{ marginBottom: '0' }}>
          <strong>Codenized</strong>
          <br />
          Email:{' '}
          <a href="mailto:ramgaralf@gmail.com" style={{ color: '#2563EB' }}>
            ramgaralf@gmail.com
          </a>
        </p>
      </section>

      {/* Divider */}
      <hr style={{ border: 'none', borderTop: '2px solid #E5E7EB', margin: '48px 0' }} />

      {/* Spanish Section (AEPD Compliance) */}
      <section>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
          Pol&iacute;tica de Privacidad
        </h1>
        <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '32px' }}>
          &Uacute;ltima actualizaci&oacute;n: julio 2025
        </p>
        <p style={{ marginBottom: '24px' }}>
          Planixor (&ldquo;la Aplicaci&oacute;n&rdquo;) es desarrollada por Codenized.
          Esta pol&iacute;tica de privacidad explica c&oacute;mo la Aplicaci&oacute;n
          gestiona sus datos.
        </p>

        <h2 style={sectionHeadingStyle}>1. Recogida y Almacenamiento de Datos</h2>
        <p style={{ marginBottom: '16px' }}>
          Planixor NO recoge, transmite ni almacena datos personales en servidores
          externos controlados por el desarrollador. Todos los datos que introduce en la
          aplicaci&oacute;n (turnos, eventos del calendario, recordatorios,
          notificaciones, informes y configuraci&oacute;n) se almacenan exclusivamente en
          el almacenamiento local de su dispositivo.
        </p>
        <ul style={listStyle}>
          <li>
            En Android: los datos se almacenan en una base de datos SQLite local y
            preferencias DataStore en su dispositivo.
          </li>
          <li>En Web (PWA): los datos se almacenan en el IndexedDB de su navegador.</li>
        </ul>
        <p style={{ marginBottom: '24px' }}>
          El desarrollador no tiene acceso a sus datos en ning&uacute;n momento.
        </p>

        <h2 style={sectionHeadingStyle}>
          2. Sincronizaci&oacute;n Auto-Alojada Opcional
        </h2>
        <p style={{ marginBottom: '16px' }}>
          Planixor ofrece una funcionalidad opcional de sincronizaci&oacute;n que permite
          sincronizar datos entre m&uacute;ltiples dispositivos. Esta funcionalidad
          requiere que usted despliegue y configure su propio servidor backend. Cuando
          activa la sincronizaci&oacute;n:
        </p>
        <ul style={listStyle}>
          <li>
            Sus datos se transmiten &uacute;nicamente entre sus dispositivos y SU
            servidor auto-alojado.
          </li>
          <li>
            El desarrollador NO opera, gestiona ni tiene acceso a su servidor de
            sincronizaci&oacute;n.
          </li>
          <li>
            Usted es el &uacute;nico responsable de la seguridad y privacidad de su
            backend auto-alojado.
          </li>
          <li>
            Usted configura la URL del servidor y la clave API en los ajustes de la
            aplicaci&oacute;n.
          </li>
        </ul>
        <p style={{ marginBottom: '24px' }}>
          Si no configura la sincronizaci&oacute;n, ning&uacute;n dato abandona su
          dispositivo.
        </p>

        <h2 style={sectionHeadingStyle}>3. Datos que NO Recogemos</h2>
        <ul style={listStyle}>
          <li>
            No recogemos informaci&oacute;n personal (nombre, correo electr&oacute;nico,
            tel&eacute;fono)
          </li>
          <li>No utilizamos anal&iacute;ticas de uso ni telemetr&iacute;a</li>
          <li>No recogemos identificadores de dispositivo</li>
          <li>No recogemos datos de ubicaci&oacute;n</li>
          <li>No utilizamos identificadores publicitarios</li>
          <li>No utilizamos cookies ni tecnolog&iacute;as de seguimiento</li>
          <li>No compartimos datos con terceros</li>
        </ul>

        <h2 style={sectionHeadingStyle}>4. Copias de Seguridad Locales</h2>
        <p style={{ marginBottom: '24px' }}>
          La Aplicaci&oacute;n proporciona una funcionalidad de copia de seguridad que
          exporta sus datos a un fichero local en su dispositivo. Este fichero se
          almacena en una ubicaci&oacute;n que usted elige en su dispositivo o
          almacenamiento en la nube (gestionado por el selector de archivos de su sistema
          operativo). El desarrollador no tiene acceso a los ficheros de copia de
          seguridad.
        </p>

        <h2 style={sectionHeadingStyle}>5. Eliminaci&oacute;n de Datos</h2>
        <p style={{ marginBottom: '16px' }}>
          Dado que todos los datos se almacenan localmente en su dispositivo, puede
          eliminar todos los datos de la aplicaci&oacute;n en cualquier momento:
        </p>
        <ul style={listStyle}>
          <li>
            Utilizando la opci&oacute;n &ldquo;Restablecer aplicaci&oacute;n&rdquo; en
            Ajustes (elimina todos los datos locales)
          </li>
          <li>Desinstalando la aplicaci&oacute;n</li>
          <li>
            Borrando el almacenamiento de la aplicaci&oacute;n desde los ajustes de su
            dispositivo
          </li>
        </ul>

        <h2 style={sectionHeadingStyle}>6. Privacidad de Menores</h2>
        <p style={{ marginBottom: '24px' }}>
          La Aplicaci&oacute;n no recoge conscientemente datos de menores de 13
          a&ntilde;os. Dado que no se recogen datos de ning&uacute;n usuario, esto se
          cumple de forma inherente.
        </p>

        <h2 style={sectionHeadingStyle}>7. Base Legal (RGPD/LOPD-GDD)</h2>
        <p style={{ marginBottom: '16px' }}>
          De conformidad con el Reglamento General de Protecci&oacute;n de Datos (UE)
          2016/679 y la Ley Org&aacute;nica 3/2018, de Protecci&oacute;n de Datos
          Personales y garant&iacute;a de los derechos digitales:
        </p>
        <ul style={listStyle}>
          <li>Responsable del tratamiento: Codenized</li>
          <li>
            No se realiza ning&uacute;n tratamiento de datos personales por parte del
            desarrollador.
          </li>
          <li>
            Todos los datos introducidos por el usuario se procesan y almacenan
            exclusivamente en el dispositivo del usuario.
          </li>
          <li>
            No existe transferencia internacional de datos por parte del desarrollador.
          </li>
          <li>
            Los derechos de acceso, rectificaci&oacute;n, supresi&oacute;n, portabilidad,
            limitaci&oacute;n y oposici&oacute;n pueden ejercerse directamente sobre los
            datos locales del dispositivo, ya que el desarrollador no dispone de copia
            alguna.
          </li>
        </ul>

        <h2 style={sectionHeadingStyle}>8. Cambios en Esta Pol&iacute;tica</h2>
        <p style={{ marginBottom: '24px' }}>
          Podemos actualizar esta pol&iacute;tica de privacidad peri&oacute;dicamente.
          Los cambios se reflejar&aacute;n en la fecha de &ldquo;&Uacute;ltima
          actualizaci&oacute;n&rdquo; en la parte superior de esta p&aacute;gina.
        </p>

        <h2 style={sectionHeadingStyle}>9. Contacto</h2>
        <p style={{ marginBottom: '8px' }}>
          Si tiene preguntas sobre esta pol&iacute;tica de privacidad, puede contactarnos
          en:
        </p>
        <p style={{ marginBottom: '0' }}>
          <strong>Codenized</strong>
          <br />
          Email:{' '}
          <a href="mailto:ramgaralf@gmail.com" style={{ color: '#2563EB' }}>
            ramgaralf@gmail.com
          </a>
        </p>
      </section>

      {/* Footer */}
      <footer
        style={{
          marginTop: '64px',
          paddingTop: '24px',
          borderTop: '1px solid #E5E7EB',
          textAlign: 'center',
          color: '#6B7280',
          fontSize: '13px',
        }}
      >
        &copy; {new Date().getFullYear()} Codenized. All rights reserved.
      </footer>
    </div>
  );
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  marginTop: '32px',
  marginBottom: '12px',
  color: '#111827',
};

const listStyle: React.CSSProperties = {
  paddingLeft: '24px',
  marginBottom: '24px',
};
