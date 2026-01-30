"""
ASGI config for collabhub project.

Supports both HTTP (REST API) and WebSocket (Real-time features) protocols.
"""

import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'collabhub.settings')

# Get the base ASGI application
django_asgi_app = get_asgi_application()

# Import routing after Django is setup
from collabhub import routing

application = ProtocolTypeRouter({
    # HTTP and WebSocket protocol handling
    'http': django_asgi_app,
    'websocket': AuthMiddlewareStack(
        URLRouter(
            routing.websocket_urlpatterns
        )
    ),
})
