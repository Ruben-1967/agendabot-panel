import { useEffect, useState } from 'react';
import { useVendedorAuth } from '../../../context/VendedorAuthContext';
import {
  fetchRubrosCatalogoDemo,
  actualizarRubroCatalogoDemoActivo,
  fetchCatalogoDemoItems,
  subirCatalogoDemoItem,
  actualizarCatalogoDemoItem,
  eliminarCatalogoDemoItem,
} from '../../../api/client';
import CatalogoImagenesGrid from '../../../components/CatalogoImagenesGrid';
import NavVendedor from '../NavVendedor';
import '../vendedor.css';
import '../../admin/CatalogoVisual.css';

const CAMPOS_EXTRA_ITEM = [{ key: 'categoria', label: 'Categoría', placeholder: 'ej. Armazones', requerido: true }];

export default function CatalogoVisualDemoAdmin() {
  const { token } = useVendedorAuth();

  const [rubros, setRubros] = useState([]);
  const [rubroSeleccionadoId, setRubroSeleccionadoId] = useState(null);
  const [items, setItems] = useState([]);

  const [cargandoRubros, setCargandoRubros] = useState(true);
  const [cargandoItems, setCargandoItems] = useState(false);
  const [guardandoSwitch, setGuardandoSwitch] = useState(false);
  const [error, setError] = useState('');

  async function cargarRubros() {
    setCargandoRubros(true);
    try {
      const data = await fetchRubrosCatalogoDemo(token);
      setRubros(data.rubros);
      if (!rubroSeleccionadoId && data.rubros.length > 0) {
        setRubroSeleccionadoId(data.rubros[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCargandoRubros(false);
    }
  }

  async function cargarItems(rubroTemplateId) {
    setCargandoItems(true);
    try {
      const data = await fetchCatalogoDemoItems(token, rubroTemplateId);
      setItems(data.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargandoItems(false);
    }
  }

  useEffect(() => { cargarRubros(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (rubroSeleccionadoId) cargarItems(rubroSeleccionadoId);
  }, [rubroSeleccionadoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const rubroActual = rubros.find((r) => r.id === rubroSeleccionadoId);

  async function alternarSwitchRubro() {
    if (!rubroActual) return;
    setGuardandoSwitch(true);
    setError('');
    try {
      await actualizarRubroCatalogoDemoActivo(token, rubroActual.id, !rubroActual.catalogoVisualDemoActivo);
      await cargarRubros();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoSwitch(false);
    }
  }

  async function manejarSubir({ nombre, descripcion, archivo, categoria }) {
    setError('');
    try {
      await subirCatalogoDemoItem(token, { rubroTemplateId: rubroSeleccionadoId, categoria, nombre, descripcion, archivo });
      await Promise.all([cargarRubros(), cargarItems(rubroSeleccionadoId)]);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function manejarEditar(item, datos) {
    setError('');
    try {
      await actualizarCatalogoDemoItem(token, item.id, datos);
      await cargarItems(rubroSeleccionadoId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  async function manejarAlternarActivo(item) {
    setError('');
    try {
      await actualizarCatalogoDemoItem(token, item.id, { activo: !item.activo });
      await cargarItems(rubroSeleccionadoId);
    } catch (err) {
      setError(err.message);
    }
  }

  async function manejarEliminar(item) {
    if (!confirm(`¿Eliminar "${item.nombre}"?`)) return;
    setError('');
    try {
      await eliminarCatalogoDemoItem(token, item.id);
      await Promise.all([cargarRubros(), cargarItems(rubroSeleccionadoId)]);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="pantalla-vendedor">
      <NavVendedor />
      <div className="vendedor-inner">
        <h1>Catálogo visual</h1>
        <p className="texto-ayuda">
          Imágenes de ejemplo por rubro que el bot de la demo puede mostrarle a un prospecto — nunca datos de negocios reales. Los rubros ya existen, acá solo se activa el catálogo para uno y se cargan sus imágenes.
        </p>

        {error && <p className="login-error">{error}</p>}

        {rubroActual && (
          <div className="catalogo-switch-row">
            <label className="switch">
              <input
                type="checkbox"
                checked={rubroActual.catalogoVisualDemoActivo}
                disabled={guardandoSwitch}
                onChange={alternarSwitchRubro}
              />
              <span className="switch-slider" />
            </label>
            <div>
              <strong>Mostrar catálogo de "{rubroActual.nombre}" en la demo</strong>
              <p className="texto-muted" style={{ margin: 0 }}>
                {rubroActual.catalogoVisualDemoActivo ? 'El bot de la demo puede ofrecer estas imágenes para este rubro.' : 'Apagado — el bot de la demo nunca menciona el catálogo de este rubro.'}
              </p>
            </div>
          </div>
        )}

        {cargandoRubros ? (
          <p className="texto-muted">Cargando…</p>
        ) : (
          <div className="catalogo-layout">
            <aside className="catalogo-riel">
              {rubros.map((r) => (
                <button
                  key={r.id}
                  className={`categoria-item ${r.id === rubroSeleccionadoId ? 'activa' : ''}`}
                  onClick={() => setRubroSeleccionadoId(r.id)}
                >
                  <span>{r.nombre}{r.catalogoVisualDemoActivo ? ' 🟢' : ''}</span>
                  <span className="conteo">{r._count.catalogoDemoItems}</span>
                </button>
              ))}
            </aside>

            <div className="catalogo-contenido">
              {!rubroActual ? (
                <p className="texto-muted">No hay rubros configurados.</p>
              ) : cargandoItems ? (
                <p className="texto-muted">Cargando…</p>
              ) : (
                <CatalogoImagenesGrid
                  items={items}
                  limiteAlcanzado={false}
                  camposExtra={CAMPOS_EXTRA_ITEM}
                  onSubir={manejarSubir}
                  onEditar={manejarEditar}
                  onEliminar={manejarEliminar}
                  onAlternarActivo={manejarAlternarActivo}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
