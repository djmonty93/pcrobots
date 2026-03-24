FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json README.md ./
COPY apps ./apps
COPY packages ./packages
COPY runners ./runners
RUN apk add --no-cache python3
RUN ln -sf /usr/bin/python3 /usr/bin/python
RUN npm ci
RUN npm run build
CMD ["npm", "run", "start", "--workspace", "@pcrobots/worker"]
