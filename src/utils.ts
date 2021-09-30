import { TireSeed, MethodInPath } from './models'

/**
 * Sleep
 * @param ms number 
 * @returns {Promise<void>}
 */
export const sleep = (ms: number): Promise<void> => new Promise<void>(r => setTimeout(() => r(), ms))

const removeEscapedCharacters = (str: string): string => {
	// eslint-disable-next-line no-control-regex
	if (str) return str.replace(/\u0000/g, '')
	return str
} 

/**
 * Keep only the last pair of parentheses
 * /a/b/{c}/{d}/{e} => /a/b/{e}
 * @param str string
 * @returns {string} Cut string
 */
export const cutOffPath = (str: string): string => {
	const matched = str.match(/{/g)
	if (matched) {
		const parts = str.split('/')
		const len = parts.length
		let j = 0
		const result = []
		for (let i = 0; i < len; i++) {
			const part = parts[i]
			if (part.includes('{') && j < matched.length - 1) {
				j++
			} else {
				result.push(part)
			}
		}
		return result.join('/')
	}
	return str
}

/**
 * Format YApi's JSON to Tire's data
 * @param data any YApi's JSON
 * @returns {TireSeed[]} The data Tire want
 */
export const formatJSON = (data: any): TireSeed[] => {
	const result: TireSeed[] = []
	for (const d of data) {
		const list = d.list
		for (const l of list) {
			const inner: TireSeed = {
				path: '/' + MethodInPath[l.method] + cutOffPath(l.path),
				originalPath: l.path,
				content: {
					request: removeEscapedCharacters(l.req_body_other),
					response: removeEscapedCharacters(l.res_body),
					method: l.method,
				}
			}
			result.push(inner)
		}
	}
	return result
}