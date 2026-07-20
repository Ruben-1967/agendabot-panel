import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVendedorAuth } from '../../context/VendedorAuthContext';
import { crearProspectoDemo } from '../../api/client';
import './vendedor.css';

const OPCIONES_RUBRO = [
  { valor: 'OPTICA', etiqueta: 'Óptica' },
  { valor: 'ESTETICA', etiqueta: 'Centro estético' },
  { valor: 'SALUD', etiqueta: 'Salud independiente' },
  { valor: 'MANTENCION', etiqueta: 'Mantención técnica' },
  { valor: 'PROACTIVO', etiqueta: 'Venta proactiva (panadería, rotisería, taller, etc.)' },
  { valor: 'OTRO', etiqueta: 'Otro' },
];

const OPCIONES_PAIS = [
  { valor: 'CL', etiqueta: '🇨🇱 +56' },
  { valor: 'MX', etiqueta: '🇲🇽 +52' },
  { valor: 'AR', etiqueta: '🇦🇷 +54' },
  { valor: 'PE', etiqueta: '🇵🇪 +51' },
  { valor: 'CO', etiqueta: '🇨🇴 +57' },
  { valor: 'ES', etiqueta: '🇪🇸 +34' },
];

export default function NuevaDemo() {
  const { token } = useVendedorAuth();
  const navigate = useNavigate();

  const [nombreNegocio, setNombreNegocio] = useState('');
  const [telefono, setTelefono] = useState('');
  const [paisTelefono, setPaisTelefono] = useState('CL');
  const [nombreEncargado, setNombreEncargado] = useState('');
  const [rubro, setRubro] = useState('');
  const [sitioWeb, setSitioWeb] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');
    setResultado(null);
    setEnviando(true);

    try {
      const data = await crearProspectoDemo(token, {
        nombreNegocio: nombreNegocio.trim(),
        telefono: telefono.trim(),
        paisTelefono,
        nombreEncargado: nombreEncargado.trim(),
        rubro,
        sitioWeb: sitioWeb.trim() || undefined,
      });
      setResultado(data);
      setNombreNegocio('');
      setTelefono('');
      setPaisTelefono('CL');
      setNombreEncargado('');
      setRubro('');
      setSitioWeb('');
    } catch (err) {
      setError(err.message || 'No se pudo crear la demo');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pantalla-vendedor">
      <div className="vendedor-inner">
        <p className="vendedor-eyebrow">Demo comercial</p>
        <h1>Cargar negocio</h1>
        <p className="texto-ayuda">
          Dile al encargado que llame o escriba al <strong>+56 9 2767 9838</strong> apenas termines — verá su propio negocio respondiendo, en vivo.
        </p>

        <form onSubmit={manejarSubmit} className="form-vendedor">
          <div className="campo-seccion">
            <p className="campo-seccion-titulo">Negocio</p>

            <label>
              Nombre del negocio
              <input value={nombreNegocio} onChange={(e) => setNombreNegocio(e.target.value)} required />
            </label>

            <label>
              Rubro
              <select value={rubro} onChange={(e) => setRubro(e.target.value)} required>
                <option value="" disabled>Selecciona un rubro</option>
                {OPCIONES_RUBRO.map((o) => (
                  <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
                ))}
              </select>
            </label>

            <label>
              Sitio web (opcional)
             <input
                value={sitioWeb}
                onChange={(e) => setSitioWeb(e.target.value)}
                placeholder="luxvision.cl"
              />

            </label>
          </div>

          <div className="campo-seccion">
            <p className="campo-seccion-titulo">Contacto para la demo</p>

            <label>
              Teléfono (el que va a llamar/escribir)
              <div className="telefono-grupo">
                <select
                  className="select-pais"
                  value={paisTelefono}
                  onChange={(e) => setPaisTelefono(e.target.value)}
                >
                  {OPCIONES_PAIS.map((p) => (
                    <option key={p.valor} value={p.valor}>{p.etiqueta}</option>
                  ))}
                </select>
                <input
                  className="input-numero"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="9 1234 5678"
                  required
                />
              </div>
            </label>

            <label>
              Nombre del encargado
              <input value={nombreEncargado} onChange={(e) => setNombreEncargado(e.target.value)} required />
            </label>
          </div>

          {error && <p className="login-error">{error}</p>}

          {resultado && (
            <div className="aviso-exito-whatsapp">
              <b>✅ {resultado.mensaje}</b>
              Ya puede llamar al número de demo{resultado.productosCreados > 0 ? ` — cargamos ${resultado.productosCreados} productos desde su sitio web` : ''}.
            </div>
          )}

          <button type="submit" className="cta-primaria" disabled={enviando}>
            {enviando ? 'Creando demo…' : 'Crear demo'}
          </button>
        </form>

        <button className="cta-secundaria" onClick={() => navigate('/vendedor/mis-demos')}>
          Ver mis demos →
        </button>
      </div>
    </div>
  );
}