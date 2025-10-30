import { access, constants, readdir, stat } from "node:fs/promises"
import { join, resolve, dirname, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { Router } from "express"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROUTER_DIR = join(__dirname, "..", "routes")

const ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"]
const PARAM_SEGMENT_RE = /^\[(\.\.\.)?([^\]]+)\]$/
const FILE_METHOD_RE = /\.(get|post|put|delete|patch|options|head)$/i

function parseRouteFromFileName (nameWithoutExt, basePath) {
	if (nameWithoutExt === "index") {
		return basePath || "/"
	}

	if (nameWithoutExt.includes(".")) {
		const parts = nameWithoutExt.split(".")
		const resourceName = parts[0]

		if (resourceName === "index") {
			return basePath || "/"
		}

		const paramMatch = resourceName.match(PARAM_SEGMENT_RE)
		if (paramMatch) {
			const isSpread = Boolean(paramMatch[1])
			const paramName = paramMatch[2]
			if (isSpread) {
				return `${basePath}/*`
			}
			return `${basePath}/:${paramName}`
		}

		return basePath ? `${basePath}/${resourceName}` : `/${resourceName}`
	}

	const paramMatch = nameWithoutExt.match(PARAM_SEGMENT_RE)
	if (paramMatch) {
		const isSpread = Boolean(paramMatch[1])
		const paramName = paramMatch[2]
		if (isSpread) {
			return `${basePath}/*`
		}
		return `${basePath}/:${paramName}`
	}

	return basePath ? `${basePath}/${nameWithoutExt}` : `/${nameWithoutExt}`
}

function parseHttpMethods (nameWithoutExt) {
	const match = nameWithoutExt.match(FILE_METHOD_RE)
	if (!match) {
		return []
	}

	const method = match[1].toUpperCase()
	if (ALLOWED_METHODS.includes(method)) {
		return [method]
	}

	return []
}

function cleanRoutePath (routePath) {
	return routePath.replace(/\/+/g, "/").replace(/\/$/, "") || "/"
}

function logRoute (method, routePath, filePath) {
	console.log(`📁 Loaded route: ${method.padEnd(6)} ${routePath} -> ${relative(join(__dirname, ".."), filePath)}`)
}

function registerSingleRoute ({ router, method, routePath, handler, filePath, middlewares }) {
	const cleanPath = cleanRoutePath(routePath)

	try {
		// Si hay middlewares definidos, usar defineEventHandler
		if (middlewares && Object.keys(middlewares).length > 0) {
			handler = defineEventHandler(handler, middlewares)
		}

		if (method === "ALL") {
			router.all(cleanPath, handler)
		} else {
			router[method.toLowerCase()](cleanPath, handler)
		}
		logRoute(method, cleanPath, filePath)
	} catch (error) {
		console.error(`❌ Error registering ${method} ${cleanPath}:`, error.message)
	}
}

function extractMiddlewares (module) {
	const middlewares = {}
	if (module.onRequest) {
		middlewares.onRequest = module.onRequest
	}
	if (module.onBeforeResponse) {
		middlewares.onBeforeResponse = module.onBeforeResponse
	}
	if (module.onError) {
		middlewares.onError = module.onError
	}
	return middlewares
}

function registerSpecificMethods ({ router, module, routePath, httpMethods, fullPath }) {
	const middlewares = extractMiddlewares(module)

	for (const method of httpMethods) {
		const handler = module.default || module[method]
		if (handler) {
			registerSingleRoute({ router, method, routePath, handler, filePath: fullPath, middlewares })
		}
	}
}

function registerAllMethods ({ router, module, routePath, fullPath }) {
	const middlewares = extractMiddlewares(module)

	for (const method of ALLOWED_METHODS) {
		if (module[method]) {
			registerSingleRoute({
				router,
				method,
				routePath,
				handler: module[method],
				filePath: fullPath,
				middlewares
			})
		}
	}

	const hasMethodExports = ALLOWED_METHODS.some((m) => module[m])
	if (module.default && !hasMethodExports) {
		registerSingleRoute({
			router,
			method: "ALL",
			routePath,
			handler: module.default,
			filePath: fullPath,
			middlewares
		})
	}
}

async function processRouteFile ({ fullPath, basePath, fileName, router }) {
	const nameWithoutExt = fileName.replace(".js", "")
	const routePath = parseRouteFromFileName(nameWithoutExt, basePath)
	const httpMethods = parseHttpMethods(nameWithoutExt)

	try {
		const module = await import(`file://${fullPath}`)

		if (httpMethods.length > 0) {
			registerSpecificMethods({ router, module, routePath, httpMethods, fullPath })
		} else {
			registerAllMethods({ router, module, routePath, fullPath })
		}
	} catch (error) {
		console.error(`❌ Error loading route ${fullPath}:`, error.message)
	}
}

async function scanDirectory ({ dir, basePath = "", router }) {
	const items = await readdir(dir)

	for (const item of items) {
		const fullPath = join(dir, item)
		const itemStat = await stat(fullPath)

		if (itemStat.isDirectory()) {
			await scanDirectory({
				dir: fullPath,
				basePath: `${basePath}/${item}`,
				router
			})
		} else if (item.endsWith(".js")) {
			await processRouteFile({
				fullPath,
				basePath,
				fileName: item,
				router
			})
		}
	}
}

export async function createApiRouter () {
	const router = Router()
	const apiDir = resolve(__dirname, ROUTER_DIR)

	try {
		await access(apiDir, constants.F_OK)
	} catch {
		console.warn(`📁 API directory not found: ${apiDir}`)
		return router
	}

	await scanDirectory({ dir: apiDir, router })

	return router
}
