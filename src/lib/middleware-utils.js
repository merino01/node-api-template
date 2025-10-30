/**
 * Helper para crear middlewares reutilizables
 */
export function createMiddleware ({ onRequest, onBeforeResponse, onError } = {}) {
	return { onRequest, onBeforeResponse, onError }
}

/**
 * Combina múltiples middlewares en uno solo
 */
export function combineMiddlewares (...middlewares) {
	const combined = {
		onRequest: [],
		onBeforeResponse: [],
		onError: []
	}

	for (const middleware of middlewares) {
		if (middleware.onRequest) {
			if (Array.isArray(middleware.onRequest)) {
				combined.onRequest.push(...middleware.onRequest)
			} else {
				combined.onRequest.push(middleware.onRequest)
			}
		}

		if (middleware.onBeforeResponse) {
			if (Array.isArray(middleware.onBeforeResponse)) {
				combined.onBeforeResponse.push(...middleware.onBeforeResponse)
			} else {
				combined.onBeforeResponse.push(middleware.onBeforeResponse)
			}
		}

		if (middleware.onError) {
			if (Array.isArray(middleware.onError)) {
				combined.onError.push(...middleware.onError)
			} else {
				combined.onError.push(middleware.onError)
			}
		}
	}

	return combined
}
