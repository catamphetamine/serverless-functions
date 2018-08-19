export default class Router {
	constructor(functions) {
		this.functions = functions
	}

	match(method, path) {
		const matchingPathFunctions = this.functions.map(_ => this.matchFunctionByPath(_, path)).filter(_ => _)
		if (matchingPathFunctions.length === 0) {
			return {
				error: {
					statusCode: 404,
					message: 'Not found'
				}
			}
		}
		const matchingMethodFunction = matchingPathFunctions.filter(_ => _.func.method === method)[0]
		if (matchingMethodFunction) {
			return {
				func: matchingMethodFunction.func,
				pathParameters: matchingMethodFunction.pathParameters
			}
		}
		// Returns "405 Method not allowed"
		// along with the "Allow" HTTP header (e.g. "Allow: GET, POST, HEAD")
		// if the path does exist but no function for the HTTP request method exists.
		// https://stackoverflow.com/questions/35387209/which-status-to-return-for-request-to-invalid-url-for-different-http-methods
		return {
			error: {
				statusCode: 405,
				headers: {
					'Allow': matchingPathFunctions.map(_ => _.func.method).join(', ')
				},
				message: 'Method not allowed'
			}
		}
	}

	matchFunctionByPath = (func, path) => {
		const pathParts = path.split('/')
		const funcPathParts = func.path.split('/')
		if (pathParts.length !== funcPathParts.length) {
			return
		}
		const parameters = {}
		let i = 0
		while (i < pathParts.length) {
			const pathPart = pathParts[i]
			const funcPathPart = funcPathParts[i]
			if (funcPathPart.indexOf('{') === 0) {
				const parameterName = funcPathPart.slice(1, -1)
				const parameterValue = pathPart
				parameters[parameterName] = parameterValue
			} else if (pathPart !== funcPathPart) {
				return
			}
			i++
		}
		return {
			func,
			pathParameters: parameters
		}
	}
}