ARG PYTHON_VERSION=3.14.10
FROM python:${PYTHON_VERSION}-slim

ENV PYTHONUNBUFFERED=1 \
    SLA_HOST=0.0.0.0

WORKDIR /app

COPY requirements.txt .
RUN python -m pip install --no-cache-dir -r requirements.txt \
    && python -m pip check

COPY main.py log_format.py ./

EXPOSE 8090
CMD ["python", "-m", "main"]
