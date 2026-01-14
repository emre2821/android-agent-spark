# Web build stage
FROM node:18-slim AS web-builder
WORKDIR /opt/app/apps/web-app
COPY apps/web-app/package*.json ./
RUN npm install
COPY apps/web-app/ ./
RUN npm run build

# Web dev/runtime stage (used by docker-compose for hot reload)
FROM node:18-slim AS web-dev
WORKDIR /opt/app/apps/web-app
COPY apps/web-app/package*.json ./
RUN npm install
COPY apps/web-app/ ./
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]

# Server runtime stage
FROM node:18-slim AS server
WORKDIR /opt/app/services/nodejs-server
COPY services/nodejs-server/package*.json ./
RUN npm install
COPY services/nodejs-server/ ./
COPY --from=web-builder /opt/app/apps/web-app/dist ../web-dist
ENV PORT=3001
EXPOSE 3001
CMD ["npm", "run", "start"]
