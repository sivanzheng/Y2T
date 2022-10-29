# Y2T
### YApi to TypeScript

Generate TypeScript type definition file by YApi JSON.
 
根据后端在 YApi 文档中提供的 [RESTful](http://www.ruanyifeng.com/blog/2014/05/restful_api.html) API，生成对应的由 [Namespaces](https://www.typescriptlang.org/docs/handbook/namespaces.html) 组织层级的前端可用的 TypeScript 定义文件，并自动将定义文件发布至指定 NPM 仓库，通过在项目中安装定义文件使用服务接口类型。

## 序言

> 其他自动生成服务接口定义文件的方式目前不太契合我司当前项目，使用起来对当前项目侵入型较大，所以实现了这个服务，目前在项目中已使用一段时间，现在开源出来为有同样需要的同学提供一种思路，同时欢迎 Issue 和 Pull Request。

## 用法

### 项目配置
在 [config.json](./config.json) 中的 `tokens` 字段中配置好所需的内容
``` json
{
    "username": "<YOUR_GIT_USERNAME>",
    "password": "<YOUR_GIT_PASSWORD>",
    "email": "<YOUR_GIT_EMAIL>",
    "registry": "<YOUR_GIT_REPOSITORY_REGISTRY>",
    "protocol": "<YOUR_YAPI_SERVICE_PROTOCOL>",
    "hostname": "<YOUR_YAPI_SERVICE_HOSTNAME>",
    "projectUrl": "<YOUR_PROJECT_URL_IN_YAPI_SERVICE>",
    "tokens": [
        {
            "pid": "<YOUR_PROJECT_ID>",
            "desc": "<YOUR_PROJECT_DESCRIPTION>",
            "name": "<YOUR_PROJECT_NAME>",
            "token": "<YOUR_PROJECT_TOKEN>"
        }
    ]
}
```
工程相关的配置可以在【项目】- 【设置】-【token配置】中找到。由于

###### __*每个项目都有唯一的标识 token ，用户可以使用这个 token 值来请求项目 openapi。为确保项目内数据的安全性和私密性，请勿轻易将该 token 暴露给项目组外用户。*__ ######

`token` 可以进行加密存储在相关配置中心，或者写入服务器环境变量等，不一定要存放在 `config` 文件中，修改 `index.ts` 中读取配置的相关代码即可。

### 请求服务
> 部署至服务器之后 `localhost:8080` 改为服务器地址即可

- `npm install`
- `npm run serve`
- 请求 `http://localhost:8080/list` ，查询已配置的mock项目。
- 根据 `Project ID`，请求 `http://localhost:8080/generate?pid=<Project_ID>`，Y2T 服务将会生成 ts 定义文件，并自动上传至 `YOUR_GIT_REPOSITORY_REGISTRY`。
- 等待服务返回 `npm` 包名，`npm i <RESPONSE> --save-dev`
- 直接在项目中 `import` 使用

> 如果不想发布至 `npm` ，直接将 [publish.sh](publish.sh) 所有内容注释掉，生成好的定义文件在 `./generated` 下，可以直接使用 index.d.ts 文件


### 钉钉机器人

接入钉钉机器人 [Y2T-Robot](https://github.com/ShiverZheng/Y2T-Robot) 提升使用感受

## 实现

### 需求分析

日常开发过程中接到新的开发需求之后，前后端协商好所需的数据结构，后端同学在 `YApi` 中编写好接口文档，前端根据 `mock` 文档进行开发，由于后端接口数据接口可能经常变动，手动编写接口定义文件十分繁琐，可能会导致前后端数据结构定义不一致的情况出现，而且大量编写接口定义文件为前端工作带来了一定的压力，从解放前端生产力并大幅提高项目代码质量尽量避免出现 `any` 的角度出发，实现了自动化生成接口定义文件的 Y2T 服务。

### 实现思路

想要生成定义文件，第一步一定是获取 YApi 的数据，在【项目】-【数据管理】中我们可以看到 YApi 提供 `JSON` 格式的数据手动导出，由于想要实现自动化，所以需要获取导出数据的接口，在查看[ YApi 接口文档](https://hellosean1025.github.io/yapi/openapi.html)后，并没有发现相应的开放接口 `api`，后面在 YApi 提供的 `sm2tsservice` 服务的配置文件中找到了可以调用的接口，为我们实现自动化提供了铺垫。

### 选型

生成定义文件更好的方法应该是由后端服务生成相关定义文件，目前因为工作分工权限原因，就只能从分析 YApi 导出的 json 文件出发，下面来看一下 YApi 导出的 json 结构。
```json
[
  {
    "index": 0,
    "name": "接口分类",
    "desc": "接口分类",
    "add_time": 111111111,
    "up_time": 111111111,
    "list": [
      {
        "query_path": {
          "path": "/api/y2t/option",
          "params": []
        },
        "edit_uid": 0,
        "status": "done",
        "type": "static",
        "req_body_is_json_schema": false,
        "res_body_is_json_schema": false,
        "api_opened": false,
        "index": 0,
        "tag": [],
        "_id": 1,
        "method": "GET",
        "catid": 2,
        "title": "接口名称",
        "path": "/api/y2t/option",
        "project_id": 1,
        "req_params": [],
        "res_body_type": "raw",
        "uid": 3,
        "add_time": 111111111,
        "up_time": 111111111,
        "req_query": [],
        "req_headers": [],
        "req_body_form": [],
        "__v": 0,
        "markdown": "",
        "desc": "",
        "res_body": "{\n    \"result\": true,\n    \"errorCode\": null,\n    \"errorMsg\": null,\n    \"data\": [\n        {\n            \"platformId\": 1,\n            \"label\": \"Y2T\",\n            \"parentPlatformId\": null\n        }\n    ]\n}"
      }
    ]
  }
]
```

整体数据结构为一个数组，每一个分类为一个数组元素，`list` 下为该分类下的接口信息，也就是我们需要的数据，这里有我们生成定义文件必须的 `path`、 `method`、 `res_body`、 `req_params` 等字段。

那么如何生成一种较好的可用的层级结构？我们期望的是这样的：

```typescript
    namespace A {
        namespace Aa {
            interface B {
                p1: number
                p2: string
            }
        }
        namespace Ab {
            interface C {
                p1: number
                p2: number
            }
        }
    }
```
通过 `namespace` 组织层级结构，可以很好的遵循 `RESTful` 风格，前端在查找所需的 `interface` 的时候只需要从顶层开始根据 `url` ，配合 ts 的提示就可以很快的定位到所需的接口。

上述的层级结构就很像如下的[树](https://zh.wikipedia.org/zh-hk/%E6%A0%91_(%E6%95%B0%E6%8D%AE%E7%BB%93%E6%9E%84))的结构：
![binary_tree](./README.IMG/binary_tree.png)

在这里我们使用 [Trie(前缀树)](https://zh.wikipedia.org/wiki/Trie) 的数据结构去构建。

在计算机科学中 `Trie` 又称前缀树或字典树，是一种有序树，用于保存关联数组，其中的键通常是字符串。与二叉查找树不同，键不是直接保存在节点中，而是由节点在树中的位置决定。一个节点的所有子孙都有相同的前缀，也就是这个节点对应的字符串，而根节点对应空字符串。一般情况下，不是所有的节点都有对应的值，只有叶子节点和部分内部节点所对应的键才有相关的值。

`Trie` 典型应用是用于快速检索（最长前缀匹配），自动补全，拼写检查，统计，排序和保存大量的字符串，所以经常被搜索引擎系统用于文本词频统计，搜索提示等场景。它的优点是最大限度地减少无谓的字符串比较，查询效率比较高。

![tire](README.IMG/trie.png)

通常情况下，`Trie` 树的高度 n 要远大于搜索字符串的长度 m ，故查找操作的时间复杂度通常为 O(m) ，最坏情况下（当字符串非常长）的时间复杂度才为 O(n) 。

在这里查找 `aba` 我们只需要经过 `1-2-5`、 `1-2-6-11` 就可以找到。

`Tire` 更多的被用于单词的匹配，每一个字母被当作一个节点，那么对于 `/api/y2t/list` 这样的 URL，似乎不是非常匹配，其实我们将 URL 对 `/` 进行 `split` 就可以得到 `['', 'api', 'y2t', 'list']`，这样就可以插入到节点中去了。

Golang 中著名的框架的 [gin](https://github.com/gin-gonic/gin) 的路由实现部分就用到了 [Tree](https://github.com/gin-gonic/gin/blob/master/tree.go)。


###  代码实现


#### 流程

一整个完成的流程如下

* 处理请求，获取 project id
* 请求 YApi，获取 json 文件
* 预处理 json 文件，格式化为 Tire 所需格式 TireSeed
* 初始化 Tire
* 将所有 TireSeed 插入 Tire
* 对 Tire 进行深度优先遍历，并打印节点
* 使用 Prettier 对结果进行代码格式化
* 保存至本地
* 触发自动化发布流程
* 返回 NPM 包名与版本号

#### Tire

下面我们定义 TireNode
```typescript
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
}
```

    part: string 记录拆分后的路径块，重要的节点信息。

    children: Map<string, TireNode> 通过哈希表记录子节点，key 为 part，value 为 TireNode。

    path: string 当前的完整路径。

    content: Content 节点保存的接口信息。

下面定义Tire

```typescript
export default class Tire {
	public root: TireNode
	public result: string

	constructor() {
		this.root = new TireNode(TIRE_ROOT)
		this.result = ''
	}

	insert(seed: TireSeed): void {}

	traverse(node: TireNode): void {}
}
```
    root: TireNode 根节点

    result: string 保存生成后的 .d.ts 文件的字符串

    insert(seed: TireSeed): void {} 对树进行插入

	traverse(node: TireNode): void {} 由于需要打印出深层级结构所以在这里对树进行深度优先遍历 DFS

具体代码实现请参考 [Tire.ts](src/core/Tire.ts)

拿到 `YApi` `JSON` 会使用 [formatJSON](src/utils.ts) 进行预处理，对其中多余的字段精简，对非法字符进行过滤修改，最后变成 `TireSeed`（种子）的数据结构。

```typescript
interface TireSeed {
    path: string
    originalPath: string
    content: Content
}
```

#### 自动化发布

自动化发布的流程就是登录 `NPM` 账号，然后执行发布命令，现在问题就是如何实现自动化登录，在我们执行 `npm login` 之后需要输入 `username`、  `password`、 `email` 等信息。目前有以下方式可供参考：

1、使用 [Expect](https://www.nist.gov/services-resources/software/expect) 自动完成交互式命令实现。

2、通过 `authToken` 的方式，一行命令直接登录指定 NPM 仓库。

> `authToken` 是 `NPM` 用户登陆仓库时，由 `NPM` 仓库生成返回给客户端，记录到客户端的 `~/.npmrc` 中的。
> 
> 首先，设置 `NPM` 仓库 `npm set registry <registry-url>` 交互式登录仓库，输入用户名、密码、邮箱。
> 
> `npm login` 登录完成后，打开用户目录的 `~/.npmrc`

> 
```
// npm.pingpongx.org/:_authToken=xxxx
registry=http://npm.xxx.org
```
> 通过这些信息在脚本中执行
> `npm config set //<registry-url>/:_authToken <authToken>`
> 就可以实现登录 NPM 的效果。

3、使用 [npm-cli-login](https://github.com/postmanlabs/npm-cli-login) 

第一种方法需要配置 `shell` 插件，第二种方法需要先登录容器手动登录一次，所以我们这里直接使用 `npm-cli-login` 登录。

解决了登录问题之后只需要编写成 shell 脚本
```shell
file="/generated/index.d.ts"

if [ -f "$file" ]
then
    echo "$file found."
else 
    echo "$file not found."
    exit 1
fi

npm set registry $REGISTRY
npm-cli-login -u $USERNAME -p $PASSWORD -e $EMAIL -r $REGISTRY
npm publish --registry=$REGISTRY /usr/src/app/generated/

```
然后在 `node` 中通过 `child-process` 的 [spawn](https://nodejs.org/api/child_process.html) 来执行，为了避免使用回调编程，这边使用了 [promisify-child-process](https://github.com/jcoreio/promisify-child-process#readme)。


## 推荐用法

* 请使用 `npm install --save-dev`，安装至 `devDependencies`。
* 安装后最好手动删除 `major` 版本锁 `^`，直接锁死版本，可防止自动安装定义文件与开发版本不一致的情况。
* 由于 `namespace` 根据 `path` 生成，可能会出现嵌套过深的问题，可以在项目定义 `models.ts` 的地方，使用 `type` 为需要的结构起别名。
```typescript
import { Get } from '@types/y2t'

export type Item = Get.Api.Y2T.Option.Item
export type List = Item[]
```