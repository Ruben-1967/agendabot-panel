import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchResumenRecordatorio,
  actualizarPausadoRecordatorio,
  importarBaseRecordatorio,
  leerArchivoComoBase64,
} from '../../api/client';
import './RecordatorioControlAnual.css';

export default function RecordatorioControlAnual() {
  const { token } = useAuth();

  const [pendientes, setPendientes] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardandoSwitch, setGuardandoSwitch] = useState(false);
  const [error, setError] = useState('');

  const [archivoPendiente, setArchivoPendiente] = useState(null);
  const [importando, setImportando] = useState(false);
  const [resultadoImportacion, setResultadoImportacion] = useState(null);

  async function cargarResumen() {
    setCargando(true);
    setError('');
    try {
      const data = await fetchResumenRecordatorio(token);
      setPendientes(data.pendientes);
      setPausado(data.pausado);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargarResumen(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function alternarSwitch() {
    setGuardandoSwitch(true);
    setError('');
    try {
      const data = await actualizarPausadoRecordatorio(token, !pausado);
      setPausado(data.recordatorioControlAnualPausado);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoSwitch(false);
    }
  }

  function manejarSeleccionArchivo(e) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    setArchivoPendiente(archivo);
    setResultadoImportacion(null);
    setError('');
  }

  async function confirmarImportacion() {
    if (!archivoPendiente) return;
    setImportando(true);
    setError('');
    try {
      const archivoBase64 = await leerArchivoComoBase64(archivoPendiente);
      const resultado = await importarBaseRecordatorio(token, archivoBase64);
      setResultadoImportacion(resultado);
      setArchivoPendiente(null);
      await cargarResumen();
    } catch (err) {
      setError(err.message);
    } finally {
      setImportando(false);
    }
  }

  return (
    <div>
      <h1>Recordatorio de control anual</h1>
      <p className="pagina-sub">
        Avisa por WhatsApp a tus pacientes que ya pasó un año desde su último control de la vista, invitándolos a agendar una nueva evaluación.
      </p>

      <div className="recordatorio-switch-row">
        <label className="switch">
          <input
            type="checkbox"
            checked={!pausado}
            disabled={guardandoSwitch}
            onChange={alternarSwitch}
          />
          <span className="switch-slider" />
        </label>
        <div>
          <strong>{pausado ? 'Envío pausado' : 'Envío activo'}</strong>
          <p className="texto-muted" style={{ margin: 0 }}>
            {pausado
              ? 'No se le está mandando el recordatorio a nadie.'
              : 'Se manda automáticamente a quien lleve 11 meses o más sin control.'}
          </p>
        </div>
      </div>

      {error && <p className="mensaje-error">{error}</p>}

      {cargando ? (
        <p className="texto-muted">Cargando…</p>
      ) : (
        <p className="contador-plan">
          <strong>{pendientes}</strong> paciente{pendientes === 1 ? '' : 's'} pendiente{pendientes === 1 ? '' : 's'} del recordatorio ahora mismo
        </p>
      )}

      <div className="seccion">
        <h2>Importar base de pacientes</h2>
        <p className="texto-muted">
          Archivo CSV o Excel con las columnas <code>fecha</code>, <code>nombre</code>, <code>rut</code> (opcional) y <code>teléfono</code>. Si un paciente ya existe (mismo RUT o teléfono), se actualiza su fecha de control solo si la nueva es más reciente.
        </p>

        <label className="recordatorio-archivo-input">
          <input type="file" accept=".csv,.xlsx,.xls" onChange={manejarSeleccionArchivo} />
          <span>+</span>
          <span>{archivoPendiente ? archivoPendiente.name : 'Elegir archivo'}</span>
        </label>

        {archivoPendiente && (
          <button className="btn-primary" onClick={confirmarImportacion} disabled={importando} style={{ marginTop: 12 }}>
            {importando ? 'Importando…' : 'Importar'}
          </button>
        )}

        {resultadoImportacion && (
          <div className="resultado-importacion" style={{ marginTop: 16 }}>
            <p><strong>{resultadoImportacion.creados}</strong> paciente(s) nuevo(s), <strong>{resultadoImportacion.actualizados}</strong> actualizado(s), de {resultadoImportacion.totalFilas} fila(s).</p>
            {resultadoImportacion.filasConError.length > 0 && (
              <>
                <p>{resultadoImportacion.filasConError.length} fila(s) con error:</p>
                <ul>
                  {resultadoImportacion.filasConError.slice(0, 20).map((f) => (
                    <li key={f.fila}>Fila {f.fila}: {f.motivo}</li>
                  ))}
                </ul>
                {resultadoImportacion.filasConError.length > 20 && (
                  <p className="texto-muted">…y {resultadoImportacion.filasConError.length - 20} más.</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
