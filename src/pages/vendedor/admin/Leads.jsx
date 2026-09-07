import { useSearchParams } from 'react-router-dom';
import NavVendedor from '../NavVendedor';
import PoolLeads from './PoolLeads';
import LeadsEmails from './LeadsEmails';
import '../vendedor.css';

// Un canal nuevo (ej. SMS) se agrega acá y en su propio componente de
// contenido -- no hace falta tocar el nav ni las rutas.
const CANALES = [
  { clave: 'fonos', etiqueta: 'Fonos', Contenido: PoolLeads },
  { clave: 'emails', etiqueta: 'Emails', Contenido: LeadsEmails },
];

export default function Leads() {
  const [searchParams, setSearchParams] = useSearchParams();
  const claveActiva = CANALES.some((c) => c.clave === searchParams.get('canal')) ? searchParams.get('canal') : 'fonos';
  const canalActivo = CANALES.find((c) => c.clave === claveActiva);

  return (
    <div className="pantalla-vendedor">
      <NavVendedor />
      <div className="vendedor-inner">
        <h1>Leads</h1>

        <div className="pestanas-filtro" style={{ marginBottom: 16 }}>
          {CANALES.map((c) => (
            <button
              key={c.clave}
              type="button"
              className={c.clave === claveActiva ? 'pestana-filtro activa' : 'pestana-filtro'}
              onClick={() => setSearchParams({ canal: c.clave })}
            >
              {c.etiqueta}
            </button>
          ))}
        </div>

        <canalActivo.Contenido />
      </div>
    </div>
  );
}
