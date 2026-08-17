import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVendedorAuth } from '../../context/VendedorAuthContext';
import { crearProspectoDemo, fetchRubrosDemo } from '../../api/client';
import NavVendedor from './NavVendedor';
import './vendedor.css';

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

  const [rubros, setRubros] = useState([]);
  const [cargandoRubros, setCargandoRubros] = useState(true);
  const [errorRubros, setErrorRubros] = useState('');

  const [nombreNegocio, setNombreNegocio] = useState('');
  const [telefono, setTelefono] = useState('');
  const [paisTelefono, setPaisTelefono] = useState('CL');
  const [nombreEncargado, setNombreEncargado] = useState('');
  const [claveRubro, setClaveRubro] = useState('');
  const [sitioWeb, setSitioWeb] = useState('');
  const [email, setEmail] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    fetchRubrosDemo(token)
      .then((data) => setRubros(data.rubros || []))
      .catch((err) => setErrorRubros(err.message || 'No se pudieron cargar los rubros'))
      .finally(() => setCargandoRubros(false));
  }, [token]);

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
        claveRubro,
        sitioWeb: sitioWeb.trim() || undefined,
        email: email.trim() || undefined,
      });
      setResultado(data);
      setNombreNegocio('');
      setTelefono('');
      setPaisTelefono('CL');
      setNombreEncargado('');
      setClaveRubro('');
      setSitioWeb('');
      setEmail('');
    } catch (err) {
      setError(err.message || 'No se pudo crear la demo');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pantalla-vendedor">
      <NavVendedor />
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
              <select
                value={claveRubro}
                onChange={(e) => setClaveRubro(e.target.value)}
                required
                disabled={cargandoRubros || rubros.length === 0}
              >
                <option value="" disabled>
                  {cargandoRubros ? 'Cargando rubros…' : 'Selecciona un rubro'}
                </option>
                {rubros.map((r) => (
                  <option key={r.clave} value={r.clave}>{r.nombre}</option>
                ))}
              </select>
              {errorRubros && <p className="login-error">{errorRubros}</p>}
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

            <label>
              Email (opcional)
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contacto@negocio.cl"
              />
            </label>
          </div>

          {error && <p className="login-error">{error}</p>}

          {resultado && (
            <div className="aviso-exito-whatsapp">
              <b>✅ {resultado.mensaje}</b>
              Ya puede llamar al número de demo{resultado.productosCreados > 0 ? ` — se cargó un catálogo de ${resultado.productosCreados} productos` : ''}.
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
