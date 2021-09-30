FROM node:10-alpine

WORKDIR /app

COPY . /app

RUN npm install typescript@4.3.5 -g --registry https://registry.npm.taobao.org
RUN npm install -g npm-cli-login --registry https://registry.npm.taobao.org
RUN npm install --registry https://registry.npm.taobao.org

EXPOSE 8080

CMD npm run serve