FROM node:22.23.1-bookworm-slim

WORKDIR /app

ARG NPM_REGISTRY=https://registry.npmjs.org

COPY package.json ./

RUN npm config set registry "${NPM_REGISTRY}" \
  && npm install --no-audit --no-fund

COPY . .

EXPOSE 3000 8787

CMD ["npm", "run", "server"]
