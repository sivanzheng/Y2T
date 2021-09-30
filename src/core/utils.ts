import { GetInnerResult, Schema, RootName } from './models'
/**
 * Remove unnecessary symbols, "{" "}" "?" .
 * @param part Clean string
 * @returns {string} Formated string
 */
export const formatPart = (part: string): string => part.replace(/{|}|\?/g, '')

/**
 * Make first letter to be upper case
 * @param str string
 * @returns {string} Formated string
 */
export const firstLetterUpperCase = (str: string): string => str.slice(0,1).toUpperCase() +str.slice(1)
 
/**
 * Beautfy String
 * @param str string
 * @returns {string} Beautfied String
 */
export const beautfy = (str: string): string => firstLetterUpperCase(formatPart(str))

/**
 * Flatten array, get innermost element
 * @param data 
 * @returns {null | GetInnerResult} If this data structure is supported, return the innermost element
 */
export const getInnerItemInArray = (data: any): null | GetInnerResult => {
	if (!data || !Array.isArray(data)) return null
	let depth = 0
	let tmp = data 
	let item = null
	let arrayStr = ''
	while (Array.isArray(tmp) && tmp[0]) {
		const itemsIsArray = tmp.map(v => Object.prototype.toString.call(v))
		const isSame = itemsIsArray.every(v => v === itemsIsArray[0])
		if (!isSame) throw new Error(`Data structure not yet supported: ${data}`)
		depth++
		arrayStr += '[]'
		item = tmp[0]
		tmp = tmp[0]
	}
	return { depth, item, arrayStr }
}

/**
 * @param data 
 * @returns {boolean} is Array
 */
export const isArray = (data: any): boolean => Object.prototype.toString.call(data) === '[object Array]'

/**
 * @param data 
 * @returns {boolean} is Object
 */
export const isObject = (data: any): boolean => Object.prototype.toString.call(data) === '[object Object]'

/**
 * Replace invalid type by schema
 * @param str string 
 * @returns {string} Formated string
 */
export const toBasicType = (str: string): string => str.replace('array', '[]').replace('integer', 'number')

/**
 * Convert request schema to TypeScript Interface
 * @param req RequestSchema
 * @returns {string} interface string
 */
export const schemaToTs = (data: Schema, rootName: RootName): string => {
	let result = ''
	const properties = data.properties
	const keys = Object.keys(properties)
	const hasErrCode = keys.includes('errorCode')
	const hasData = keys.includes('data')
	if (hasErrCode && hasData) {
		result += `type ${rootName} =  ${properties['data'].type};`
		return result
	}
	result = `interface ${rootName} {`
	for (const key in properties) {
		result += `${key}: ${toBasicType(properties[key].type)};`
	}
	
	result += '}'
	return result
}