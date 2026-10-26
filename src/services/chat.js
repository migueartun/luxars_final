import api from './api'

/**
 * Chat 1:1 cliente ↔ fotógrafo.
 * Todo vive en el backend: no hay datos locales ni semillas de demo.
 */

const normalizeList = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.results)) return data.results
  return []
}

export const getConversations = async () => {
  try {
    const res = await api.get('chat/conversations/')
    return normalizeList(res.data)
  } catch (err) {
    console.warn('No se pudieron cargar las conversaciones:', err?.message)
    return []
  }
}

export const getMessages = async (conversationId) => {
  if (!conversationId) return []
  try {
    const res = await api.get(`chat/messages/${conversationId}/`)
    return normalizeList(res.data)
  } catch (err) {
    console.warn('No se pudieron cargar los mensajes:', err?.message)
    return []
  }
}

/** Envía el mensaje al backend y devuelve el mensaje persistido. */
export const sendMessage = async (conversationId, text) => {
  const res = await api.post('chat/messages/', {
    receiver_id: conversationId,
    content: text,
  })
  return res.data
}

/**
 * El id de conversación en el backend es el id del otro usuario,
 * así que iniciar un chat con un contacto no requiere crear nada.
 */
export const ensureConversationForContact = async (contactId) => String(contactId)

/** El GET de mensajes ya marca como leídos los mensajes recibidos. */
export const markAsRead = async (conversationId) => {
  if (!conversationId) return
  try {
    await api.get(`chat/messages/${conversationId}/`)
  } catch {
    // sin conexión: el contador de no leídas se refresca en el próximo polling
  }
}
