FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir --upgrade "setuptools>=82.0.0" "wheel>=0.46.2"

FROM python:3.11-slim AS runner
WORKDIR /app
RUN rm -rf /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin/uvicorn /usr/local/bin/uvicorn
COPY ./src ./src
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser
EXPOSE 5004
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "5004"]

