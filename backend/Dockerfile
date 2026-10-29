FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 UV_COMPILE_BYTECODE=1
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY . .
RUN useradd --create-home app && chown -R app:app /app
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s CMD ["/app/.venv/bin/python", "-c", "import os, urllib.request; urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8000/api/health/',headers={'Host':os.getenv('DJANGO_ALLOWED_HOSTS','localhost').split(',')[0],'X-Forwarded-Proto':'https'}),timeout=4)"]
CMD ["/bin/sh", "-c", "exec uv run gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --threads 4 --timeout 300 --access-logfile -"]
