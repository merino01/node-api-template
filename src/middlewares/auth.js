/**
 * Middleware de autenticación
 */
export const requireAuth = async ({ req }) => {
	const authHeader = req.headers.authorization
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		const error = new Error("Token de autenticación requerido")
		error.status = 401
		throw error
	}
}

/**
 * Middleware de validación de admin
 */
export const requireAdmin = async ({ req }) => {
	const authHeader = req.headers.authorization
	// Simular verificación de rol admin
	if (!authHeader || !authHeader.includes("admin")) {
		const error = new Error("Permisos de administrador requeridos")
		error.status = 403
		throw error
	}
}
