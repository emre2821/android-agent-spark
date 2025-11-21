# Web build stage
FROM node:18-slim AS web-builder
WORKDIR /opt/app/web
COPY web/package*.json ./
RUN npm install
COPY web/ ./
RUN npm run build

# Web dev/runtime stage (used by docker-compose for hot reload)
FROM node:18-slim AS web-dev
WORKDIR /opt/app/web
COPY web/package*.json ./
RUN npm install
COPY web/ ./
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]

# Server runtime stage
FROM node:18-slim AS server
WORKDIR /opt/app/server
COPY server/package*.json ./
RUN npm install
COPY server/ ./
COPY --from=web-builder /opt/app/web/dist ../web-dist
ENV PORT=3001
EXPOSE 3001
CMD ["npm", "run", "start"]
