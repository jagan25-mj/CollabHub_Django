"""
Django settings for collabhub project.

CollabHub - A collaboration platform for connecting students, founders, 
talents, and investors with opportunities.

Architecture Decisions:
- SQLite for simplicity (hackathon-ready, no external DB setup)
- DRF for clean REST API architecture
- Simple JWT for stateless authentication
- CORS enabled for frontend-backend separation
- Modular apps for separation of concerns
"""

import os
from pathlib import Path
from datetime import timedelta

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# =============================================================================
# SECURITY SETTINGS
# =============================================================================

# SECURITY WARNING: keep the secret key used in production secret!
# In production, set via environment variable
SECRET_KEY = os.environ.get(
    'SECRET_KEY',
    'django-insecure-collabhub-dev-key-change-in-production-abc123xyz'
)

# SECURITY WARNING: don't run with debug turned on in production!
# Only DEBUG=True in development - NEVER in production
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

# In production, set specific allowed hosts - NEVER use wildcard
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# =============================================================================
# HTTPS/SECURITY SETTINGS (Production-Grade)
# =============================================================================

# Only enforce HTTPS in production (when DEBUG=False)
if not DEBUG:
    # Force HTTPS redirection
    SECURE_SSL_REDIRECT = True
    
    # Cookie security
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    CSRF_COOKIE_HTTPONLY = True
    SESSION_COOKIE_HTTPONLY = True
    
    # Security headers
    SECURE_BROWSER_XSS_FILTER = True
    X_FRAME_OPTIONS = 'DENY'  # Prevent clickjacking
    SECURE_CONTENT_SECURITY_POLICY = {
        'default-src': ("'self'",),
        'style-src': ("'self'", "'unsafe-inline'"),  # Allow inline for framework
        'script-src': ("'self'", "'unsafe-inline'"),  # Allow inline for framework
        'img-src': ("'self'", 'data:', 'https:'),
    }
    
    # HSTS (HTTP Strict Transport Security)
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True


# =============================================================================
# APPLICATION DEFINITION
# =============================================================================

INSTALLED_APPS = [
    # ASGI Server (must be first)
    'daphne',
    
    # Django Core
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party apps
    'rest_framework',                    # Django REST Framework
    'rest_framework_simplejwt',          # JWT Authentication
    'rest_framework_simplejwt.token_blacklist',  # Token blacklisting for logout
    'corsheaders',                       # CORS support
    'django_filters',                    # Filtering for API
    'channels',                          # WebSockets (Phase 4)
    
    # CollabHub Apps (modular architecture)
    'users.apps.UsersConfig',            # User management & profiles
    'startups.apps.StartupsConfig',      # Startup management
    'opportunities.apps.OpportunitiesConfig',  # Hackathons, internships, projects
    'collaborations.apps.CollaborationsConfig',  # Applications & team matching
    'messaging.apps.MessagingConfig',    # Direct messaging system
    'recommendations.apps.RecommendationsConfig',  # Phase 5: Recommendations & Activity Feed
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # CORS - must be first
    'collabhub.middleware.RequestIdMiddleware',  # Add request ID for tracing
    'collabhub.middleware.StructuredLoggingMiddleware',  # Structured logging
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'collabhub.middleware.ErrorContextMiddleware',  # Error context for debugging
]

ROOT_URLCONF = 'collabhub.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'collabhub.wsgi.application'


# =============================================================================
# DATABASE - SQLite (simple, no external dependencies)
# =============================================================================

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# =============================================================================
# PASSWORD VALIDATION
# =============================================================================

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# =============================================================================
# INTERNATIONALIZATION
# =============================================================================

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# =============================================================================
# STATIC FILES (CSS, JavaScript, Images)
# =============================================================================

STATIC_URL = 'static/'
STATICFILES_DIRS = [
    BASE_DIR / 'static',
    BASE_DIR.parent / 'frontend',  # Serve frontend files
]
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files (user uploads)
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Frontend directory for templates
FRONTEND_DIR = BASE_DIR.parent / 'frontend'



# =============================================================================
# DEFAULT PRIMARY KEY FIELD TYPE
# =============================================================================

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# =============================================================================
# CUSTOM USER MODEL
# =============================================================================

AUTH_USER_MODEL = 'users.User'


# =============================================================================
# DJANGO REST FRAMEWORK CONFIGURATION
# =============================================================================

REST_FRAMEWORK = {
    # Use JWT as default authentication
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    
    # Default permission - require authentication
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    
    # Filtering and pagination
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    
    # Pagination
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    
    # Throttling (rate limiting)
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour'
    },
}


# =============================================================================
# JWT CONFIGURATION (Simple JWT)
# =============================================================================

SIMPLE_JWT = {
    # Token lifetimes
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    
    # Token rotation
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    
    # Algorithm
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    
    # Token types
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    
    # User identification
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}


# =============================================================================
# CORS CONFIGURATION (Cross-Origin Resource Sharing)
# =============================================================================

# Production: Use restricted origins - NEVER allow all
# Development: Allow localhost and 127.0.0.1 for testing
CORS_ALLOWED_ORIGINS = os.environ.get(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000,http://localhost:8000,http://127.0.0.1:3000,http://127.0.0.1:8000'
).split(',')

# Legacy setting - OVERRIDE if CORS_ALLOWED_ORIGINS is set
# In production, this should NEVER be True
CORS_ALLOW_ALL_ORIGINS = False

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

CORS_ALLOW_METHODS = ['DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT']


# =============================================================================
# CHANNELS CONFIGURATION (WebSockets for Real-Time Features)
# =============================================================================

ASGI_APPLICATION = 'collabhub.asgi.application'

# Detect if Redis is available
REDIS_AVAILABLE = True
try:
    import redis
    redis.Redis(host=os.getenv('REDIS_HOST', 'localhost'), 
                port=int(os.getenv('REDIS_PORT', 6379)), 
                socket_connect_timeout=1).ping()
except Exception:
    REDIS_AVAILABLE = False

# Channel layer configuration - use Redis if available, fallback to in-memory
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer' if REDIS_AVAILABLE else 'channels.layers.InMemoryChannelLayer',
        'CONFIG': {
            'hosts': [(os.getenv('REDIS_HOST', 'localhost'), int(os.getenv('REDIS_PORT', 6379)))],
        } if REDIS_AVAILABLE else {}
    }
}

# =============================================================================
# CACHING CONFIGURATION (Redis-backed cache with fallback)
# =============================================================================

if REDIS_AVAILABLE:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': f"redis://{os.getenv('REDIS_HOST', 'localhost')}:{os.getenv('REDIS_PORT', 6379)}/1",
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            },
            'KEY_PREFIX': 'collabhub',
            'TIMEOUT': 300,  # 5 minutes default
        }
    }
else:
    # Fallback to local memory cache
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'collabhub-cache',
        }
    }

# Cache TTLs for different data types
CACHE_TTL = {
    'STARTUP_LIST': 300,  # 5 minutes
    'SEARCH_RESULTS': 600,  # 10 minutes
    'RECOMMENDATIONS': 1800,  # 30 minutes
    'FEED': 300,  # 5 minutes
    'USER_PROFILE': 600,  # 10 minutes
}

# =============================================================================
# LOGGING CONFIGURATION (Structured logging)
# =============================================================================

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(name)s %(levelname)s %(message)s',
        },
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
    },
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'simple' if DEBUG else 'json',
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'collabhub.log',
            'maxBytes': 1024 * 1024 * 10,  # 10 MB
            'backupCount': 10,
            'formatter': 'json' if not DEBUG else 'verbose',
        },
        'error_file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'collabhub_errors.log',
            'maxBytes': 1024 * 1024 * 10,
            'backupCount': 10,
            'formatter': 'json' if not DEBUG else 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': True,
        },
        'django.request': {
            'handlers': ['console', 'error_file'],
            'level': 'ERROR',
            'propagate': False,
        },
        'collabhub': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
    },
}

# Ensure logs directory exists
os.makedirs(BASE_DIR / 'logs', exist_ok=True)
