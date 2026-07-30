import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchDashboard } from '../../api/client';

export default function Dashboard() {
  const { token, usuario } = useAuth();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !usuario?.empresaId) {
      setError('No hay sesión válida');
      setCargando(false);
      return;
    }

    fetchDashboard(token, usuario.empresaId)
      .then(setDatos)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, [token, usuario?.empresaId]);

  if (cargando) return <div>Cargando…</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;
  if (!datos) return <div>Sin datos</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>Dashboard</h2>
      <p>Citas hoy: <strong>{datos.citasHoy}</strong></p>
      <p>Confirmadas: <strong>{datos.confirmadas}</strong></p>
      <p>Lista espera: <strong>{datos.listaEspera}</strong></p>
      <p>Asistencia 30d: <strong>{datos.asistencia30dias}%</strong></p>
    </div>
  );
}