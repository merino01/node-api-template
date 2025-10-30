import express from "express"
import { createApiRouter } from "./lib/route-loader.js"
import { defineEventHandler } from "./lib/define-event-handler.js"

globalThis.defineEventHandler = defineEventHandler

const app = express()
app.use(express.json())

const apiRouter = await createApiRouter()
app.use(apiRouter)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
	console.log(`🚀 Server running on http://localhost:${PORT}`)
})
