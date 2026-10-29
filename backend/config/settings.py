import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


INSTALLED_APPS = [
    "rest_framework",
    "corsheaders",
    "routing",
]


MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
ROOT_URLCONF = "config.urls"
DATABASES = {}


WSGI_APPLICATION = "config.wsgi.application"


LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
}


DEBUG = os.getenv("DJANGO_DEBUG", "true").lower() == "true"
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "development-only-change-this-key-before-deployment")
if not DEBUG and (
    len(SECRET_KEY) < 50 or SECRET_KEY.startswith(("development-only", "replace-with"))
):
    raise ImproperlyConfigured("Set DJANGO_SECRET_KEY in production")
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,testserver").split(",")
CORS_ALLOWED_ORIGINS = os.getenv(
    "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")
CSRF_TRUSTED_ORIGINS = os.getenv("CSRF_TRUSTED_ORIGINS", "http://localhost:5173").split(",")
GRAPHHOPPER_API_KEY = os.getenv("GRAPHHOPPER_API_KEY", "")
GRAPHHOPPER_PROFILE = os.getenv("GRAPHHOPPER_PROFILE", "truck")
OPEN_METEO_API_KEY = os.getenv("OPEN_METEO_API_KEY", "")
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "weather-routing",
        "OPTIONS": {"MAX_ENTRIES": 2000},
    }
}
REST_FRAMEWORK.update(
    {
        "EXCEPTION_HANDLER": "routing.exceptions.handler",
        "DEFAULT_AUTHENTICATION_CLASSES": [],
        "UNAUTHENTICATED_USER": None,
        "UNAUTHENTICATED_TOKEN": None,
        "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.AnonRateThrottle"],
        "DEFAULT_THROTTLE_RATES": {"anon": "30/min"},
    }
)
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

    if os.getenv("TRUST_PROXY", "false").lower() == "true":
        SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
