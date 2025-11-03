FROM node:20-slim AS frontend
WORKDIR /opt/app/web
COPY web/package.json web/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm install; else npm install; fi
COPY web/ ./
RUN npm run build

FROM python:3.11-slim AS backend
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /opt/app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ ./app/
COPY scripts/ ./scripts/
COPY --from=frontend /opt/app/web/dist ./web-dist
RUN mkdir -p data
EXPOSE 8000
CMD ["python", "-m", "app.cli", "runserver", "--host", "0.0.0.0", "--port", "8000"]
