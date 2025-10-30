/**
 * Middleware para agregar timestamp a respuestas
 */
export const addTimestamp = async (context, result) => {
	if (result && typeof result === "object") {
		return {
			...result,
			timestamp: new Date().toISOString()
		}
	}
	return result
}
