import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchArtistBookings, fetchClientBookings, saveBookingRating } from '../../services/bookings'

const statusBadge = {
  Pendiente: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  Confirmada: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  Rechazada: 'border-zinc-700 bg-zinc-800 text-zinc-400',
  Finalizada: 'border-red-600/30 bg-red-600/10 text-red-300',
}

const originBadge = {
  compra: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  venta: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
}

const History = () => {
  const { user } = useAuth()
  // Una cuenta compra y vende: si el modo fotógrafo está activo, el
  // historial muestra ambos lados (lo que contrataste y lo que prestaste).
  const isArtist = user?.role === 'artist'
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [compras, ventas] = await Promise.all([
        fetchClientBookings(),
        isArtist ? fetchArtistBookings() : Promise.resolve([]),
      ])
      const merged = [
        ...ventas.map((b) => ({ ...b, origin: 'venta' })),
        ...compras.map((b) => ({ ...b, origin: 'compra' })),
      ]
      // Evita duplicados si ambos servicios cayeron al mismo fallback local
      const seen = new Set()
      const unique = merged.filter((b) => {
        if (seen.has(b.id)) return false
        seen.add(b.id)
        return true
      })
      setItems(unique)
      setLoading(false)
    }
    load()
  }, [isArtist])

  const rateBooking = async (bookingId) => {
    const input = window.prompt('Califica la sesión de 1 a 5 estrellas:')
    const rating = Number(input)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return
    try {
      await saveBookingRating(bookingId, rating)
      setItems((current) => current.map((booking) => (
        booking.id === bookingId ? { ...booking, rating } : booking
      )))
    } catch (error) {
      window.alert(error?.response?.data?.detail || error.message || 'No se pudo guardar la calificación.')
    }
  }

  const contactOf = (b) => (
    b.origin === 'venta'
      ? { id: b.clientId, name: b.clientName }
      : { id: b.photographerId, name: b.photographerName }
  )

  return (
    <div className="min-h-[100dvh] bg-black">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="border-b border-zinc-900 pb-6">
          <p className="text-xs font-semibold tracking-widest text-red-400">
            {isArtist ? 'CUENTA • COMPRAR Y VENDER' : 'PANEL • MIS CONTRATACIONES'}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-white">Historial de Servicios</h1>
          <p className="mt-2 text-sm text-zinc-400">
            {isArtist
              ? 'Todas tus contrataciones como cliente y tus servicios prestados como fotógrafo, en un solo lugar.'
              : 'Todas tus contrataciones, pagos y estados en un solo lugar.'}
          </p>
        </div>

        {loading ? (
          <div className="mt-10 flex flex-col items-center py-16">
            <div className="h-8 w-8 rounded-full border-2 border-zinc-800 border-t-red-600 animate-spin" />
            <p className="mt-3 text-sm text-zinc-500">Cargando historial...</p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-900 bg-zinc-950">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/40 border-b border-zinc-900">
                <tr className="text-xs tracking-widest text-zinc-500">
                  <th className="text-left px-4 py-3">ID</th>
                  {isArtist && <th className="text-left px-4 py-3">TIPO</th>}
                  <th className="text-left px-4 py-3">{isArtist ? 'PERSONA' : 'FOTÓGRAFO'}</th>
                  <th className="text-left px-4 py-3">SERVICIO</th>
                  <th className="text-left px-4 py-3">FECHA</th>
                  <th className="text-left px-4 py-3">UBICACIÓN</th>
                  <th className="text-left px-4 py-3">VALOR</th>
                  {isArtist && <th className="text-left px-4 py-3">GANANCIA NETA</th>}
                  <th className="text-left px-4 py-3">ESTADO</th>
                  <th className="text-left px-4 py-3">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {items.map((b) => {
                  const isVenta = b.origin === 'venta'
                  const contact = contactOf(b)
                  return (
                    <tr key={b.id} className="hover:bg-zinc-900/20 transition-colors">
                      <td className="px-4 py-4 text-zinc-500 font-mono text-xs">#{b.id}</td>
                      {isArtist && (
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${originBadge[b.origin]}`}>
                            {isVenta ? 'Venta' : 'Compra'}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-4">
                        <p className="font-medium text-white">
                          {isVenta ? b.clientName : b.photographerName}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {isVenta ? b.clientEmail : b.specialty}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-white">{b.service}</p>
                        <p className="text-xs text-zinc-500 line-clamp-1">{b.message}</p>
                      </td>
                      <td className="px-4 py-4 text-zinc-300 whitespace-nowrap">{b.date}</td>
                      <td className="px-4 py-4 text-zinc-300">{b.location}</td>
                      <td className="px-4 py-4">
                        <p className="text-white font-semibold">
                          ${(b.base_price ?? b.price ?? 0).toLocaleString('es-CO')} COP
                        </p>
                        {isVenta && (
                          <p className="text-xs text-red-300">
                            Comisión: -${(b.platform_fee ?? 0).toLocaleString('es-CO')} COP
                          </p>
                        )}
                      </td>
                      {isArtist && (
                        <td className="px-4 py-4">
                          {isVenta ? (
                            <p className="text-emerald-300 font-semibold">
                              ${(b.artist_payout ?? 0).toLocaleString('es-CO')} COP
                            </p>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadge[b.status] || statusBadge.Pendiente}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col items-start gap-2">
                          <Link
                            to={`/chat?contactId=${contact.id}&name=${encodeURIComponent(contact.name || '')}`}
                            className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
                          >
                            Abrir chat →
                          </Link>
                          {!isVenta && b.status === 'Finalizada' && (
                            <button
                              type="button"
                              onClick={() => rateBooking(b.id)}
                              className="text-xs font-medium text-amber-300 hover:text-amber-200"
                            >
                              {b.rating ? `${b.rating}/5 guardada` : 'Calificar'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {items.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-sm text-zinc-400">Aún no hay registros en tu historial.</p>
                <Link
                  to="/explorar"
                  className="mt-3 inline-block text-sm font-semibold text-red-400 hover:text-red-300"
                >
                  Explorar fotógrafos →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default History
