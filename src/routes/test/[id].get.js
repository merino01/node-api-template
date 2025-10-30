import {
	addResponseMetadata,
	addTimestamp,
	rateLimit,
	customErrorHandler
} from "../../middlewares/index.js"

export const onRequest = rateLimit
export const onBeforeResponse = [
	addTimestamp,
	addResponseMetadata
]
export const onError = [customErrorHandler]

export default defineEventHandler(({ params }) => {
	const { id } = params

	return {
		id,
		name: "John Doe",
		email: "john.doe@example.com"
	}
})
