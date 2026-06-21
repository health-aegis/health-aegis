FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.12-slim AS runner
WORKDIR /app
COPY --from=builder /install /usr/local
RUN pip install --no-cache-dir --upgrade "setuptools>=82.0.0" "wheel>=0.46.2"
COPY src/ ./src/
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser
EXPOSE 8001
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]
