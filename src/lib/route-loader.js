import { access, constants, readdir, stat } from "node:fs/promises"
import { join, dirname, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { Router } from "express"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROUTER_DIR = join(__dirname, "..", "routes")
const MODULES_DIR = join(__dirname, "..", "modules")

const ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"]
const PARAM_SEGMENT_RE = /^\[(\.\.\.)?([^\]]+)\]$/
const MODULE_PROXY_RE = /^\[module\]$/
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

function logRoute (method, routePath, filePath, modulePrefix = "") {
	const prefix = modulePrefix ? `[${modulePrefix}] ` : ""
	const relativePath = relative(join(__dirname, ".."), filePath)
	console.log(`📁 ${prefix}Loaded route: ${method.padEnd(6)} ${routePath} -> ${relativePath}`)
}

function registerSingleRoute ({ router, method, routePath, handler, filePath, middlewares, modulePrefix }) {
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
		logRoute(method, cleanPath, filePath, modulePrefix)
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

function registerSpecificMethods ({ router, module, routePath, httpMethods, fullPath, modulePrefix }) {
	const middlewares = extractMiddlewares(module)

	for (const method of httpMethods) {
		const handler = module.default || module[method]
		if (handler) {
			registerSingleRoute({
				router,
				method,
				routePath,
				handler,
				filePath: fullPath,
				middlewares,
				modulePrefix
			})
		}
	}
}

function registerAllMethods ({ router, module, routePath, fullPath, modulePrefix }) {
	const middlewares = extractMiddlewares(module)

	for (const method of ALLOWED_METHODS) {
		if (module[method]) {
			registerSingleRoute({
				router,
				method,
				routePath,
				handler: module[method],
				filePath: fullPath,
				middlewares,
				modulePrefix
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
			middlewares,
			modulePrefix
		})
	}
}

async function moduleExists (moduleName) {
	try {
		const modulePath = join(MODULES_DIR, moduleName)
		await access(modulePath, constants.F_OK)
		const moduleStat = await stat(modulePath)
		return moduleStat.isDirectory()
	} catch {
		return false
	}
}

async function getAvailableModules () {
	try {
		const modules = await readdir(MODULES_DIR)
		const availableModules = []

		for (const moduleName of modules) {
			if (await moduleExists(moduleName)) {
				availableModules.push(moduleName)
			}
		}

		return availableModules
	} catch {
		return []
	}
}

async function createModuleProxy (proxyHandler, basePath) {
	return async (req, res, next) => {
		const urlParts = req.path.replace(basePath, "").split("/").filter(Boolean)
		const moduleName = urlParts[0]

		if (!moduleName) {
			return res.status(400).json({
				success: false,
				message: "Module name is required"
			})
		}

		const moduleExistsFlag = await moduleExists(moduleName)
		if (!moduleExistsFlag) {
			return res.status(404).json({
				success: false,
				message: `Module '${moduleName}' not found`,
				availableModules: await getAvailableModules()
			})
		}

		const context = {
			req,
			res,
			params: {
				module: moduleName,
				...req.params
			},
			query: req.query,
			body: req.body,
			moduleName,
			remainingPath: "/" + urlParts.slice(1).join("/"),
			basePath,
			method: req.method
		}

		try {
			const result = await proxyHandler(context)

			if (!res.headersSent && result !== undefined) {
				res.json(result)
			}
		} catch (error) {
			if (!res.headersSent) {
				const status = error.status || 500
				res.status(status).json({
					success: false,
					message: error.message,
					...(error.details && { details: error.details })
				})
			}
		}
	}
}

async function processRouteFile ({ fullPath, basePath, fileName, router, modulePrefix }) {
	const nameWithoutExt = fileName.replace(".js", "")
	const routePath = parseRouteFromFileName(nameWithoutExt, basePath)
	const httpMethods = parseHttpMethods(nameWithoutExt)

	const isModuleProxy = MODULE_PROXY_RE.test(nameWithoutExt)

	try {
		const module = await import(`file://${fullPath}`)

		if (isModuleProxy) {
			const proxyHandler = module.default || module.handler
			if (!proxyHandler) {
				console.error(`❌ Module proxy ${fullPath} must export a default function or handler`)
				return
			}

			const proxyMiddleware = await createModuleProxy(proxyHandler, routePath)
			const proxyPath = `${routePath}/:module/*`

			if (httpMethods.length > 0) {
				for (const method of httpMethods) {
					router[method.toLowerCase()](proxyPath, proxyMiddleware)
					logRoute(method, proxyPath, fullPath, `${modulePrefix || "global"}-proxy`)
				}
			} else {
				router.use(proxyPath, proxyMiddleware)
				logRoute("ALL", proxyPath, fullPath, `${modulePrefix || "global"}-proxy`)
			}
		} else {
			if (httpMethods.length > 0) {
				registerSpecificMethods({
					router,
					module,
					routePath,
					httpMethods,
					fullPath,
					modulePrefix
				})
			} else {
				registerAllMethods({
					router,
					module,
					routePath,
					fullPath,
					modulePrefix
				})
			}
		}
	} catch (error) {
		console.error(`❌ Error loading route ${fullPath}:`, error.message)
	}
}

async function scanDirectory ({ dir, basePath = "", router, modulePrefix }) {
	const items = await readdir(dir)

	for (const item of items) {
		const fullPath = join(dir, item)
		const itemStat = await stat(fullPath)

		if (itemStat.isDirectory()) {
			await scanDirectory({
				dir: fullPath,
				basePath: `${basePath}/${item}`,
				router,
				modulePrefix
			})
		} else if (item.endsWith(".js")) {
			await processRouteFile({
				fullPath,
				basePath,
				fileName: item,
				router,
				modulePrefix
			})
		}
	}
}

async function scanModuleRoutes (router) {
	try {
		await access(MODULES_DIR, constants.F_OK)
		console.log(`🔍 Scanning modules directory: ${relative(join(__dirname, ".."), MODULES_DIR)}`)

		const modules = await readdir(MODULES_DIR)
		let moduleCount = 0

		for (const moduleName of modules) {
			const modulePath = join(MODULES_DIR, moduleName)
			const moduleStat = await stat(modulePath)

			if (!moduleStat.isDirectory()) {continue}

			const routesPath = join(modulePath, "routes")

			try {
				await access(routesPath, constants.F_OK)
				console.log(`📦 Loading routes for module: ${moduleName}`)

				// Las rutas del módulo se montan con el prefijo del nombre del módulo
				const moduleBasePath = `/api/${moduleName}`

				await scanDirectory({
					dir: routesPath,
					basePath: moduleBasePath,
					router,
					modulePrefix: moduleName
				})

				moduleCount++
			} catch {
				console.log(`⚠️  Module '${moduleName}' has no routes directory, skipping`)
			}
		}

		if (moduleCount > 0) {
			console.log(`✅ Successfully loaded routes from ${moduleCount} module(s)`)
		} else {
			console.log("⚠️  No modules with routes found")
		}
	} catch {
		console.log(`⚠️  Modules directory not found: ${relative(join(__dirname, ".."), MODULES_DIR)}`)
	}
}

async function scanGlobalRoutes (router) {
	try {
		await access(ROUTER_DIR, constants.F_OK)
		console.log(`🔍 Scanning global routes directory: ${relative(join(__dirname, ".."), ROUTER_DIR)}`)

		await scanDirectory({ dir: ROUTER_DIR, router, modulePrefix: "global" })

		console.log("✅ Global routes loaded")
	} catch {
		console.log(`⚠️  Global routes directory not found: ${relative(join(__dirname, ".."), ROUTER_DIR)}`)
	}
}

export async function createApiRouter () {
	console.log("🚀 Starting route loader...")
	const router = Router()

	await scanGlobalRoutes(router)
	await scanModuleRoutes(router)

	console.log("🎉 Route loading completed!")
	return router
}
