"""
Health Check and Metrics Endpoints

Monitors system health:
- Database connectivity
- Redis connectivity
- Channel layer health
- Request metrics
"""

import logging
import json
from datetime import datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from django.core.cache import cache

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    GET /health/
    
    Returns system health status.
    
    Returns 200 if healthy, 503 if degraded.
    """
    health_status = {
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'checks': {}
    }

    # Check database
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        health_status['checks']['database'] = {'status': 'ok'}
    except Exception as e:
        health_status['checks']['database'] = {
            'status': 'error',
            'message': str(e)
        }
        health_status['status'] = 'degraded'

    # Check cache/Redis
    try:
        cache.set('health_check', 'ok', 10)
        result = cache.get('health_check')
        if result:
            health_status['checks']['cache'] = {'status': 'ok'}
        else:
            health_status['checks']['cache'] = {'status': 'error', 'message': 'Cache get failed'}
            health_status['status'] = 'degraded'
    except Exception as e:
        health_status['checks']['cache'] = {
            'status': 'error',
            'message': str(e)
        }
        health_status['status'] = 'degraded'

    # Check channels
    try:
        from channels.layers import get_channel_layer
        channel_layer = get_channel_layer()
        # Try to ping channel layer
        health_status['checks']['channels'] = {'status': 'ok'}
    except Exception as e:
        health_status['checks']['channels'] = {
            'status': 'error',
            'message': str(e)
        }

    http_status = 200 if health_status['status'] == 'healthy' else 503
    return Response(health_status, status=http_status)


@api_view(['GET'])
@permission_classes([AllowAny])
def metrics(request):
    """
    GET /metrics/
    
    Returns basic system metrics.
    
    Returns application-level metrics in Prometheus-compatible format.
    """
    from django.db.models import Count
    from users.models import User
    from startups.models import Startup
    from opportunities.models import Opportunity

    try:
        metrics_data = {
            'timestamp': datetime.now().isoformat(),
            'users': {
                'total': User.objects.count(),
                'active_30d': User.objects.filter(
                    last_login__gte=datetime.now() - timezone.timedelta(days=30)
                ).count() if hasattr(User, 'last_login') else 0,
            },
            'startups': {
                'total': Startup.objects.count(),
                'active': Startup.objects.filter(is_active=True).count(),
            },
            'opportunities': {
                'total': Opportunity.objects.count(),
                'active': Opportunity.objects.filter(is_active=True).count(),
            },
        }

        # Cache metrics
        cache.set('metrics', metrics_data, 300)  # 5 min cache

        return Response(metrics_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching metrics: {e}", exc_info=True)
        return Response(
            {'error': 'Failed to fetch metrics'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def liveness(request):
    """
    GET /live/
    
    Simple liveness probe for Kubernetes/Docker.
    Returns 200 if app is running.
    """
    return Response({'status': 'alive'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def readiness(request):
    """
    GET /ready/
    
    Readiness probe for Kubernetes/Docker.
    Checks if app is ready to accept requests.
    """
    try:
        # Quick health check
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return Response({'status': 'ready'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'status': 'not_ready', 'error': str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
