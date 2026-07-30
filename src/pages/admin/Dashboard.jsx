import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiFetch from '../../api/client';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedCita, setExpandedCita] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const result = await apiFetch(`/agenda/dashboard/${user.empresaId}`);
        setData(result);
      } catch (error) {
        console.error('Error fetching dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [user.empresaId]);

  if (loading) return <div className="p-6">Cargando...</div>;
  if (!data) return <div className="p-6">Error al cargar el dashboard</div>;

  // Mapeo de colores por estado
  const estadoColores = {
    CONFIRMADA: 'bg-teal-100 text-teal-800',
    PENDIENTE: 'bg-amber-100 text-amber-800',
    CANCELADA: 'bg-red-100 text-red-800',
    COMPLETADA: 'bg-green-100 text-green-800',
    NO_ASISTIO: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="p-6 bg-stone-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Encabezado */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-stone-900">Dashboard</h1>
          <p className="text-stone-600 text-sm mt-2">
            {new Date().toLocaleDateString('es-CL', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* Tarjetas de resumen (2x2 en móvil, 1x4 en desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Citas hoy */}
          <div className="bg-white border border-stone-200 rounded-lg p-6">
            <p className="text-stone-600 text-sm font-medium uppercase tracking-wider">
              Citas hoy
            </p>
            <p className="text-4xl font-bold text-stone-900 mt-3">
              {data.citasHoy}
            </p>
          </div>

          {/* Confirmadas */}
          <div className="bg-white border border-stone-200 rounded-lg p-6">
            <p className="text-stone-600 text-sm font-medium uppercase tracking-wider">
              Confirmadas
            </p>
            <p className="text-4xl font-bold text-teal-700 mt-3">
              {data.confirmadas}
            </p>
          </div>

          {/* Lista de espera */}
          <div className="bg-white border border-stone-200 rounded-lg p-6">
            <p className="text-stone-600 text-sm font-medium uppercase tracking-wider">
              Lista de espera
            </p>
            <p className="text-4xl font-bold text-amber-700 mt-3">
              {data.listaEspera}
            </p>
          </div>

          {/* Asistencia */}
          <div className="bg-white border border-stone-200 rounded-lg p-6">
            <p className="text-stone-600 text-sm font-medium uppercase tracking-wider">
              Asistencia (30 días)
            </p>
            <p className="text-4xl font-bold text-green-700 mt-3">
              {data.asistencia30dias}%
            </p>
          </div>
        </div>

        {/* Agenda del día */}
        <div className="bg-white border border-stone-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-stone-900 mb-4">
            Agenda de hoy
          </h2>

          {data.agendaHoy.length === 0 ? (
            <p className="text-stone-500 text-center py-8">
              No hay citas agendadas para hoy
            </p>
          ) : (
            <div className="space-y-2">
              {data.agendaHoy.map((cita) => (
                <div
                  key={cita.id}
                  className="border border-stone-200 rounded-lg overflow-hidden"
                >
                  {/* Resumen colapsable */}
                  <button
                    onClick={() =>
                      setExpandedCita(
                        expandedCita === cita.id ? null : cita.id
                      )
                    }
                    className="w-full bg-stone-50 hover:bg-stone-100 p-4 flex items-center justify-between transition"
                  >
                    <div className="flex items-center gap-4 flex-1 text-left">
                      <span className="font-semibold text-stone-900 w-16">
                        {cita.hora}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-stone-900 truncate">
                          {cita.nombre}
                        </p>
                        <p className="text-sm text-stone-600 truncate">
                          {cita.servicio}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${
                          estadoColores[cita.estado] || 'bg-gray-100'
                        }`}
                      >
                        {cita.estado === 'CONFIRMADA' && 'Confirmada'}
                        {cita.estado === 'PENDIENTE' && 'Pendiente'}
                        {cita.estado === 'CANCELADA' && 'Cancelada'}
                        {cita.estado === 'COMPLETADA' && 'Completada'}
                        {cita.estado === 'NO_ASISTIO' && 'No asistió'}
                      </span>
                    </div>
                    <span className="text-stone-400 ml-2">
                      {expandedCita === cita.id ? '▼' : '▶'}
                    </span>
                  </button>

                  {/* Detalles expandidos */}
                  {expandedCita === cita.id && (
                    <div className="bg-white border-t border-stone-200 p-4 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-stone-600 font-medium">
                            Profesional
                          </p>
                          <p className="text-stone-900">
                            {cita.profesional}
                          </p>
                        </div>
                        <div>
                          <p className="text-stone-600 font-medium">Teléfono</p>
                          <p className="text-stone-900">
                            {cita.telefono || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-stone-600 font-medium">RUT</p>
                          <p className="text-stone-900">{cita.rut || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-stone-600 font-medium">Servicio</p>
                          <p className="text-stone-900">{cita.servicio}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}