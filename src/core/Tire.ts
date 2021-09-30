/* eslint-disable @typescript-eslint/no-explicit-any */
import * as JSON5 from 'json5'
import JsonToTS from 'json-to-ts'
import { Content, NodeType, TireSeed, RootName, TIRE_ROOT, TOP_LEVEL_NAMESPACE } from './models'
import { beautfy, getInnerItemInArray, isArray, isObject, schemaToTs } from './utils'

class TireNode {
	public part: string
	public children: Map<string, TireNode>
	public path?: string
	public content?: Content

	constructor(
		part: string,
		path?: string,
		content?: Content
	) {
		this.path = path
		this.part = part
		this.content = content
		this.children = new Map()
	}

	get type() {
		if (this.part === TIRE_ROOT) return NodeType.Root
		if (this.path && !this.children.size && this.content) return NodeType.ChildNode
		if (this.path && this.children.size && this.content) return NodeType.ParentNode
		if (!this.path && this.children.size && !this.content) return NodeType.Namespace
	}

	get arrayChildren() {
		if (this.children.size === 0) return []
		return Array.from(this.children.values())
	}
}

const parser = (data: any, rootName: RootName) => {
	let result = ''

	// Data is Object
	if (isObject(data)) {
		if (data['$schema']) {
			result = schemaToTs(data, rootName)
		} else if (data['data'] !== null) {
			/**
			 * some data like this,
			 * {
			 * 	"data": null
			 * 	"result": true
			 * }
			 * do not deal it
			 */
			result = JsonToTS(data, { rootName }).join('')
		}
	} else if (isArray(data)) {
		const ret = getInnerItemInArray(data)
		// Data like: [Object...]
		if (ret) {
			const { item, arrayStr } = ret
			if (isObject(item)) {
				result = JsonToTS(item, { rootName })
					.map((s) => {
						const target = `interface ${rootName}`
						if (s.includes(target)) {
							const content = s.split(target)[1]
							return `
								interface Item ${content}
								type ${rootName} = Item${arrayStr};
								`
						}
						return s
					})
					.join(';')
			} else {
				// Data is basic type in Array
				result = `type ${rootName} = ${typeof item}${arrayStr};`
			}
		}
	} else {
		// Data is basic type
		result = `type ${rootName} = ${typeof data};`
	}
	return result
}

const parseRes = (node: TireNode) => {
	let result = ''
	if (!node.content) return result
	const content = node.content.response
	if (content) {
		try {
			const res = JSON5.parse(content)
			let data
			if (Object.prototype.hasOwnProperty.call(res, 'data')) {
				const d = res.data
				if (d === null) return result = ''
				data = res.data
			} else {
				data = res
			}
			result = parser(data, RootName.RES)
		} catch (error) {
			console.error(`The response data of ${node.path} is incorrect. ` + error)
			throw new Error(`The response data of ${node.path} is incorrect. Please edit it to meet the JSON format and try again!`)
		}
	}
	return result
}

const parseReq = (node: TireNode) => {
	let result = ''
	if (!node.content) return result
	const content = node.content.request
	if (content) {
		try {
			const req = JSON5.parse(content)	
			result = parser(req, RootName.REQ)
		} catch (error) {
			console.error(`The request form data of ${node.path} is incorrect. \n` + error, )
			throw new Error(`The request form data of ${node.path} is incorrect. Please edit it to meet the JSON format and try again!`)
		}
	}	
	return result
}

const printNamespace = (node: TireNode) => {
	if (node.type === NodeType.Root) {
		return printChildren(node)
	}
	const prefix = TOP_LEVEL_NAMESPACE.includes(node.part) ? 'export' : ''
	const namespace = `${prefix} namespace ${node.part} \{ `
		+ printChildren(node)
		+ ' };'
	return namespace
}

const printParentNode = (node: TireNode) => {
	const parent = `namespace ${node.part} { `
		+ printChildNode(node, true) 
		+ printChildren(node)
		+ ' }'
	return parent
}

const printChildNode = (node: TireNode, hasWrapper = false) => {
	let row = parseReq(node) + ';' + parseRes(node)
	if (!hasWrapper) {
		row = `namespace ${node.part} \{ ${row} \};`
	}
	
	const child = `
	\/\*\*
	 \* \@description Response Interface
	 \* \@method ${node.content?.method}
	 \* \@path ${node.path ? node.path : '' }
	 \*\/
	${row}
	`
	return child
}

const printChildren = (node: TireNode) => {
	let result = ''
	for (const child of node.arrayChildren) {
		result += printNode(child)
	}
	return result
} 

const printNode = (node: TireNode) => {
	if (node.type === NodeType.ParentNode) return printParentNode(node)
	if (node.type === NodeType.ChildNode) return printChildNode(node)
	if (node.type === NodeType.Namespace) return printNamespace(node) 
	if (node.type === NodeType.Root) return printChildren(node)
	return ''
}

export default class Tire {
	public root: TireNode
	public result: string

	constructor() {
		this.root = new TireNode(TIRE_ROOT)
		this.result = ''
	}

	insert(seed: TireSeed): void {
		let node = this.root
		const parts = seed.path.split('/').filter(v => !!v)
		for (const part of parts) {
			const p = beautfy(part)
			let childNode = node.children.get(p)
			if (!childNode) {
				childNode = new TireNode(p)
				node.children.set(p, childNode)
			}
			node = childNode
		}
		node.content = seed.content
		node.path = seed.originalPath
	}

	traverse(node: TireNode): void {
		if (node.type === NodeType.Root) {
			this.result = `
				/* eslint-disable */
				${printNode(node)}
			` 
		}
	}

	build(): void {
		this.traverse(this.root)    
	}
}