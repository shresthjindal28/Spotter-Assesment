# Weather Truck Routing API

See the [project README](../README.md) for full setup, API contracts, risk calculations, provider limitations, tests and deployment instructions.

```sh
uv sync --frozen
cp .env.example .env
uv run python manage.py migrate
uv run python manage.py collectstatic --noinput
uv run python manage.py runserver
```

Set `GRAPHHOPPER_API_KEY` in `.env` and select a profile enabled for your account. The default is `truck`.

Health checks: http://127.0.0.1:8000/api/health/ and http://127.0.0.1:8000/health/.

```sh
uv run python manage.py check
uv run python manage.py test
uv run ruff check .
uv run ruff format --check .
```
