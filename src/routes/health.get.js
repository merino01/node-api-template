/**
 * GET /health
 * Health check endpoint
 */

export default defineEventHandler(async () => ({
	status: "ok",
	timestamp: new Date().toISOString(),
	uptime: process.uptime(),
	version: process.env.npm_package_version || "unknown"
}))
