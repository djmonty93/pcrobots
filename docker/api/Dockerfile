FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json README.md ./
COPY apps ./apps
COPY packages ./packages
COPY runners ./runners
RUN apk add --no-cache docker-cli lua5.4 python3
RUN ln -sf /usr/bin/python3 /usr/bin/python
RUN ln -sf /usr/bin/lua5.4 /usr/bin/lua
RUN npm ci
RUN npm run build
EXPOSE 3001
CMD ["npm", "run", "start", "--workspace", "@pcrobots/api"]

