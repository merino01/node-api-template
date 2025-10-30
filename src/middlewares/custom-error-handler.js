/**
 * Middleware de manejo de errores personalizado
 */
export const customErrorHandler = async (context, error) => {
	if (error.status === 401) {
		return {
			error: "No autorizado",
			message: "Token de autenticación inválido o faltante",
			code: "AUTH_REQUIRED",
			status: 401
		}
	}

	if (error.status === 403) {
		return {
			error: "Prohibido",
			message: "No tienes permisos para acceder a este recurso",
			code: "FORBIDDEN",
			status: 403
		}
	}

	if (error.status === 429) {
		return {
			error: "Demasiadas peticiones",
			message: "Has excedido el límite de peticiones por minuto",
			code: "RATE_LIMIT_EXCEEDED",
			status: 429
		}
	}

	return null // Dejar que otros errores se manejen por defecto
}
