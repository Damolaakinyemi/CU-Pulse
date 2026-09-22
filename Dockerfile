# CU Pulse: one container serving the API and the built frontend.

FROM node:22-slim AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8000 CUPULSE_UPDATE_HOURS=24
WORKDIR /app/api
COPY api/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY api/app ./app
COPY api/pipeline ./pipeline
COPY api/data/processed ./data/processed
COPY --from=web /web/dist /app/web/dist
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
