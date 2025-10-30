declare global {
	/**
	 * Define un manejador de eventos para rutas de la API
	 * @param handler Función que maneja la petición HTTP
	 * @returns Middleware de Express configurado con logging y manejo de errores
	 */
	function defineEventHandler(
		handler: (context: {
			req: import('express').Request
			res: import('express').Response
			query: Record<string, any>
			params: Record<string, any>
			body: any
		}) => Promise<any> | any
	): import('express').RequestHandler

	namespace globalThis {
		var defineEventHandler: typeof globalThis.defineEventHandler
	}
}

export {}