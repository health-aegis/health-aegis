FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.11-slim AS runner
WORKDIR /app
COPY --from=builder /install /usr/local
COPY ./src ./src
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser
EXPOSE 5005
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "5005"]
