import { z } from "zod"

// Middleware para validar body
export const validateBody = (schema) => async (context) => {
	try {
		const validatedData = await schema.parseAsync(context.body)
		return {
			...context,
			body: validatedData,
			_validated: { body: true }
		}
	} catch (error) {
		const validationError = new Error("Validation failed")
		validationError.status = 400
		validationError.details = formatZodErrors(error)
		throw validationError
	}
}

// Middleware para validar query params
export const validateQuery = (schema) => async (context) => {
	try {
		const validatedQuery = await schema.parseAsync(context.query)
		return {
			...context,
			query: validatedQuery,
			_validated: { ...context._validated, query: true }
		}
	} catch (error) {
		const validationError = new Error("Invalid query parameters")
		validationError.status = 400
		validationError.details = formatZodErrors(error)
		throw validationError
	}
}

// Middleware para validar params
export const validateParams = (schema) => async (context) => {
	try {
		const validatedParams = await schema.parseAsync(context.params)
		return {
			...context,
			params: validatedParams,
			_validated: { ...context._validated, params: true }
		}
	} catch (error) {
		const validationError = new Error("Invalid URL parameters")
		validationError.status = 400
		validationError.details = formatZodErrors(error)
		throw validationError
	}
}

// Formatear errores de Zod para respuesta limpia
export const formatZodErrors = (zodError) => zodError.errors.map((error) => ({
	field: error.path.join("."),
	message: error.message,
	code: error.code,
	received: error.received
}))

// Helper para crear respuestas consistentes
export const createResponse = {
	success: (data, message = "Success") => ({
		success: true,
		message,
		data
	}),

	error: (message, details = null) => ({
		success: false,
		message,
		...(details && { details })
	})
}
