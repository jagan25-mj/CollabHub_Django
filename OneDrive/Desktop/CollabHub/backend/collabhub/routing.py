"""
WebSocket routing for CollabHub real-time features.

Maps WebSocket URLs to their respective consumers.
Phase 4 Feature: Real-time messaging with typing indicators and read receipts.
"""

from django.urls import path, re_path
from messaging.consumers import MessageConsumer

websocket_urlpatterns = [
    # WebSocket endpoint for real-time messaging
    # Pattern: /ws/messages/{conversation_id}/
    # Authentication: JWT via AuthMiddlewareStack
    # Features: Real-time messages, typing indicators, read receipts, online status
    re_path(r'ws/messages/(?P<conversation_id>\d+)/$', MessageConsumer.as_asgi()),
]
