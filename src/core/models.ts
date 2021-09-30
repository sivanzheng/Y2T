export const TIRE_ROOT = 'TireRoot'

export const TOP_LEVEL_NAMESPACE = ['Get', 'Post', 'Put', 'Delete']

export enum NodeType {
    Root,
    Namespace,
    ParentNode,
    ChildNode,
}

export interface TireSeed {
    path: string
    originalPath: string
    content: Content
}

export interface Content {
    method: Method
    request: any
    response: any
}

export enum Method {
    Get = 'GET',
    Put = 'PUT',
    Post = 'POST',
    Delete = 'DELETE'
}

export interface GetInnerResult {
    depth: number,
    arrayStr: string,
    item: any
}

export enum RootName {
    RES = 'Res',
    REQ = 'Req'
}

export interface Schema {
	$schema: string
	properties: any
	required: string[]
	type: string
}