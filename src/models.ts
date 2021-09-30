export enum Method {
    Get = 'GET',
    Put = 'PUT',
    Post = 'POST',
    Delete = 'DELETE'
}

export interface Project {
    pid: string
    desc: string
    token: string,
    name: string
}

export const MethodInPath: { [key: string]: string }  = {
	GET: 'Get',
	POST: 'Post',
	PUT: 'Put',
	DELETE: 'Delete'
}

export interface Content {
    method: Method
    request: any
    response: any
}

export interface TireSeed {
    path: string
    originalPath: string
    content: Content
}