/**
 * Ejecuta una lista de middlewares en secuencia
 */
async function executeMiddlewares (middlewares, context, result = null) {
	if (!middlewares || !Array.isArray(middlewares)) {
		return result
	}

	let currentResult = result
	for (const middleware of middlewares) {
		if (typeof middleware === "function") {
			const middlewareResult = await middleware(context, currentResult)
			if (middlewareResult !== undefined) {
				currentResult = middlewareResult
			}
		}
	}
	return currentResult
}

/**
 * Ejecuta middlewares de error en secuencia hasta que uno maneje el error
 */
async function executeErrorMiddlewares (middlewares, context, error) {
	if (!middlewares || !Array.isArray(middlewares)) {
		return null
	}

	for (const middleware of middlewares) {
		if (typeof middleware === "function") {
			try {
				const handledError = await middleware(context, error)
				if (handledError) {
					return handledError
				}
			} catch (middlewareError) {
				console.error("Error en middleware onError:", middlewareError.message)
			}
		}
	}
	return null
}

/**
 * Maneja errores y middlewares de error
 */
async function handleError (error, context, onError, start) {
	const duration = Date.now() - start
	const { req, res } = context

	// Intentar con middlewares de error (puede ser array o función única)
	const errorMiddlewares = Array.isArray(onError) ? onError : (onError ? [onError] : [])
	const handledError = await executeErrorMiddlewares(errorMiddlewares, context, error)

	if (handledError) {
		const method = req.method.toUpperCase()
		console.error(`${method} ${req.path} - ${duration}ms - ERROR (handled): `, error.message)
		res.status(handledError.status || 500).json(handledError)
		return
	}

	console.error(`${req.method.toUpperCase()} ${req.path} - ${duration}ms - ERROR: `, error.message)
	console.error(error.stack)
	res.status(error.status || 500).json({
		error: error.message || "Internal Server Error"
	})
}

/**
 * Crea un manejador de eventos con soporte para middlewares
 * @param {Function} handler - El manejador principal del evento
 * @param {Object} middlewares - Middlewares opcionales (onRequest, onBeforeResponse, onError)
 *                              Cada middleware puede ser una función o un array de funciones
 */
export function defineEventHandler (handler, middlewares = {}) {
	const { onRequest, onBeforeResponse, onError } = middlewares

	return async (req, res) => {
		const start = Date.now()
		const { method, path } = req
		const context = {
			req,
			res,
			query: req.query,
			params: req.params,
			body: req.body
		}

		try {
			// Ejecutar middlewares onRequest (puede ser array o función única)
			const requestMiddlewares = Array.isArray(onRequest) ? onRequest : (onRequest ? [onRequest] : [])
			await executeMiddlewares(requestMiddlewares, context)

			// Ejecutar el handler principal
			let result = await handler(context)

			// Ejecutar middlewares onBeforeResponse (puede ser array o función única)
			const responseMiddlewares = Array.isArray(onBeforeResponse)
				? onBeforeResponse
				: (onBeforeResponse ? [onBeforeResponse] : [])
			const modifiedResult = await executeMiddlewares(responseMiddlewares, context, result)
			if (modifiedResult !== undefined) {
				result = modifiedResult
			}

			const duration = Date.now() - start
			console.log(`${method.toUpperCase()} ${path} - ${duration}ms - 200`)

			if (result !== undefined) {
				res.json(result)
			}
		} catch (error) {
			await handleError(error, context, onError, start)
		}
	}
}
