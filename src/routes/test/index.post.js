export default defineEventHandler(({ body }) => {
	const { name, email } = body

	const newTest = { name, email }
	// Guardar en bd
	return { message: "Test created successfully", test: newTest }
})
