// src/lib/logger.js
import { config } from "./config.js"

const LOG_LEVELS = {
	error: 0,
	warn: 1,
	info: 2,
	debug: 3
}

class Logger {
	constructor (level = "info") {
		this.level = LOG_LEVELS[level] ?? LOG_LEVELS.info
	}

	#shouldLog (level) {
		return LOG_LEVELS[level] <= this.level
	}

	#formatMessage (level, message, meta = {}) {
		const timestamp = new Date().toISOString()
		const emoji = {
			error: "❌",
			warn: "⚠️",
			info: "ℹ️",
			debug: "🐛"
		}[level]

		if (config.NODE_ENV === "production") {
			return JSON.stringify({
				timestamp,
				level,
				message,
				...meta
			})
		} else {
			const metaStr = Object.keys(meta).length > 0 ?
				"\n" + JSON.stringify(meta, null, 2) : ""
			return `${emoji} ${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`
		}
	}

	error (message, meta) {
		if (this.#shouldLog("error")) {
			console.error(this.#formatMessage("error", message, meta))
		}
	}

	warn (message, meta) {
		if (this.#shouldLog("warn")) {
			console.warn(this.#formatMessage("warn", message, meta))
		}
	}

	info (message, meta) {
		if (this.#shouldLog("info")) {
			console.log(this.#formatMessage("info", message, meta))
		}
	}

	debug (message, meta) {
		if (this.#shouldLog("debug")) {
			console.log(this.#formatMessage("debug", message, meta))
		}
	}

	time (label) {
		const start = Date.now()
		return () => {
			const duration = Date.now() - start
			this.debug(`Timer: ${label}`, { duration: `${duration}ms` })
			return duration
		}
	}

	request (req, res, duration) {
		const { method, path, ip } = req
		const status = res.statusCode

		const level = status >= 500 ? "error" :
			status >= 400 ? "warn" : "info"

		this[level](`${method} ${path}`, {
			status,
			ip,
			duration: `${duration}ms`,
			userAgent: req.headers["user-agent"]
		})
	}
}

export const logger = new Logger(config.LOG_LEVEL)
