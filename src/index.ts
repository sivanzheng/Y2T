/* eslint-disable no-mixed-spaces-and-tabs */
/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs'
import path from 'path'
import http from 'http'
import url, { URL } from 'url'
import prettier from 'prettier'
import * as JSON5 from 'json5'
import { spawn } from 'promisify-child-process'
import Tire from './core/Tire'
import { Project } from './models'
import { formatJSON, sleep } from './utils'

const configJSON = fs.readFileSync('config.json', 'utf8')
if (!configJSON) throw new Error('config.json Not Found')
const config = JSON.parse(configJSON)

let working = false

const getConfig = (pid: string) => {
	const tokens = config['tokens'] as Project[]
	const t = tokens.find(v => v.pid === pid)
	if (!t) throw new Error('Invaild Project!')
	return t
}

const generate = (json: any, projectID: string) => {
	console.log('before generate')
	const projectConfig = getConfig(projectID)
	const data = formatJSON(json)
	const t = new Tire()
	for (const d of data) {
		t.insert(d)
	}
	t.build()
	const formated = prettier.format(t.result, { parser: 'babel-ts' })
				
	const indexFileName = 'index.d.ts'
	const generatedPath = path.resolve(__dirname, '../generated') 
	const isExist = fs.existsSync(generatedPath)
	if (!isExist) fs.mkdirSync(generatedPath)
	const p = (fileName: string) => path.resolve(__dirname, `../generated/${fileName}`)
	fs.writeFile(p(indexFileName), formated, (err) => {
		if (err) {
			console.error(err)
			return false
		}
		console.log(`${indexFileName} created !`)
	})

	const packageFileName = 'package.json'
	const version = `1.0.0-${new Date().getTime()}`
	const packageJson = {
		name: `@types/${projectConfig.name}`,
		version: `${version}`,
		main: 'index.d.ts',
		author: 'y2t',
		license: 'MIT'
	}
	fs.writeFile(
		p(packageFileName),
		JSON.stringify(packageJson, null, 4),
		(err) => {
			if (err) {
				console.error(err)
				return false
			}
			console.log(`${packageFileName} created !`)
		},
	)
	return `@types/${projectConfig.name}@${version}` 
}

const getAPI = (projectID: string): Promise<any> => {
	console.log('project id: ', projectID)
	const projectConfig = getConfig(projectID)
	return new Promise((resolve, reject) => {
		const requestURL = new URL(url.format({
			protocol: config.protocol,
			hostname: config.hostname,
			pathname: config.pathname,
			query: {
				type: 'json',
				status: 'all',
				token: projectConfig.token,
				pid: projectConfig.pid,
			}
		}))
		http.get(
			requestURL,
			(res) => {
				let data = ''
				res.on('data', chunk => {
					data += chunk
				})
				res.on('end', () => {
					const result = JSON5.parse(data)
					console.log('data fetch end')
					resolve(result)
				})
			}
		).on('error', (err) => {
			reject(err)
		})
	})
}

const server = http.createServer(async (req, res) => {
	console.log('request: ', req.url)
	if (!req.url) {
		res.end('Awesome Y2T!')
		return
	}
	switch (true) {
	case req.url.startsWith('/list'): {
		const list = config['tokens'].map((c: Project) => ({
			pid: c.pid,
			desc: c.desc,
			name: c.name
		}))
		res.statusCode = 200
		res.setHeader('Content-type', 'text/html;charset=utf8')
		res.end(JSON.stringify(list))
		break
	}
	case req.url.startsWith('/generate?pid='): {
		if (working) {
			res.end('The server is busy, please try again later.')
			return
		}

		const pid = req.url.split('?pid=')[1]
		if (!pid) {
			res.statusCode = 400
			res.statusMessage = 'Invalid Project ID!'
			res.end('Invalid Project ID!')
		}

		const work = async () => {
			try {
				working = true
				const apis = await getAPI(pid)
				const tag = generate(apis, pid)
				console.log('generated!')
	
				const { stdout, stderr } = await spawn(
					'npm run publish:shell',
					[],
					{
						stdio: 'inherit',
						encoding: 'utf8',
						shell: true,
						env: {
							...process.env,
							REGISTRY: `${config.registry}`,
							USERNAME: `${config.username}`,
							PASSWORD: `${config.password}`,
							EMAIL: `${config.email}`
						},
					}
				)
				working = false 
				console.log(stdout)
				console.log(stderr)
				console.log('--------------published--------------')
				console.log(tag)
				return ({
					statusCode: 200,
					statusMessage: 'Success',
					data: tag
				})
			} catch (error) {
				return ({
					statusCode: 500,
					statusMessage: 'Internal Error',
					data: (error as Error).message,
				})
			}
		}

		const timeout = async () => {
			await sleep(10 * 1000)
			return ({
				statusCode: 500,
				statusMessage: 'Timeout',
				data: 'Network connection timed out',
			})
		}
		const ret = await Promise.race([
			timeout(),
			work()
		])
		
		res.statusCode = ret.statusCode
		res.statusMessage = ret.statusMessage
		res.end(ret.data)
		
		working = false
		break
	}
	default:
		res.writeHead(200, { 'Content-Type': 'text/html' })
		res.end('Awesome Y2T!')
		return
	}
})

server.listen(config.port)
console.log(`server is running at http://0.0.0.0:${config.port}/`)