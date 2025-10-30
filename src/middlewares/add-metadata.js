/**
 * Middleware para agregar metadata de respuesta
 */
export const addResponseMetadata = async ({ req }, result) => {
	if (result && typeof result === "object") {
		return {
			...result,
			meta: {
				requestId: Math.random().toString(36).substring(7),
				path: req.path,
				method: req.method
			}
		}
	}
	return result
}
