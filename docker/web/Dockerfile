FROM public.ecr.aws/docker/library/node:22-alpine
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json README.md ./
COPY apps ./apps
COPY packages ./packages
RUN npm ci
RUN npm run build --workspace @pcrobots/web
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "@pcrobots/web"]
