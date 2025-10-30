/**
 * Middleware de rate limiting básico
 * Sería recomendable mover este estado a un almacenamiento externo (como Redis)
 */
const requestCounts = new Map()
const RATE_LIMIT_WINDOW_MS = 1000 * 60 // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 10

export const rateLimit = async ({ req }) => {
	const ip = req.ip || req.connection.remoteAddress
	const now = Date.now()
	const windowStart = now - RATE_LIMIT_WINDOW_MS

	if (!requestCounts.has(ip)) {
		requestCounts.set(ip, [])
	}

	const requests = requestCounts.get(ip).filter((time) => time > windowStart)
	requests.push(now)
	requestCounts.set(ip, requests)

	if (requests.length > MAX_REQUESTS_PER_WINDOW) {
		const error = new Error("Demasiadas peticiones")
		error.status = 429
		throw error
	}
}
