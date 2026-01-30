"""
Structured Logging Middleware

Logs all requests/responses with structured JSON for production monitoring.
Includes request ID tracking, performance metrics, and error logging.
"""

import logging
import json
import uuid
import time
from datetime import datetime

logger = logging.getLogger(__name__)


class RequestIdMiddleware:
    """
    Adds request ID to all requests for tracing.
    Stores in request.id for use in views/serializers.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Generate request ID
        request.id = str(uuid.uuid4())
        
        # Store request start time for duration calculation
        request.start_time = time.time()

        response = self.get_response(request)
        
        return response


class StructuredLoggingMiddleware:
    """
    Logs all requests with structured JSON output.
    
    Logs include:
    - Request ID (for tracing)
    - User ID
    - Method and path
    - Response status
    - Duration
    - Errors (if any)
    """

    def __init__(self, get_response):
        self.get_response = get_response
        # Paths to exclude from logging (too noisy)
        self.exclude_paths = {
            '/health/',
            '/live/',
            '/ready/',
            '/static/',
            '/media/',
        }

    def __call__(self, request):
        # Skip logging for excluded paths
        if any(request.path.startswith(path) for path in self.exclude_paths):
            return self.get_response(request)

        # Extract useful info
        request_id = getattr(request, 'id', str(uuid.uuid4()))
        start_time = getattr(request, 'start_time', time.time())
        
        # Handle both WSGI and ASGI requests
        try:
            user_id = request.user.id if hasattr(request, 'user') and request.user.is_authenticated else None
        except AttributeError:
            # ASGI context where user not yet available
            user_id = None
            
        method = request.method
        path = request.path
        remote_addr = self._get_client_ip(request)

        try:
            response = self.get_response(request)
        except Exception as e:
            # Log error
            duration = time.time() - start_time
            self._log_request(
                request_id, user_id, method, path, remote_addr,
                500, duration, error=str(e)
            )
            raise

        # Log successful request
        duration = time.time() - start_time
        status_code = response.status_code
        self._log_request(
            request_id, user_id, method, path, remote_addr,
            status_code, duration
        )

        # Add request ID to response headers for client-side tracing
        response['X-Request-ID'] = request_id

        return response

    @staticmethod
    def _get_client_ip(request):
        """Extract client IP from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    @staticmethod
    def _log_request(request_id, user_id, method, path, remote_addr, status_code, duration, error=None):
        """Log request with structured format"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'request_id': request_id,
            'user_id': user_id,
            'method': method,
            'path': path,
            'remote_addr': remote_addr,
            'status_code': status_code,
            'duration_ms': round(duration * 1000, 2),
            'level': 'ERROR' if error else ('WARNING' if status_code >= 400 else 'INFO'),
        }

        if error:
            log_entry['error'] = error

        # Log as JSON
        logger.info(json.dumps(log_entry))


class ErrorContextMiddleware:
    """
    Adds error context to requests for better error tracking.
    Captures information about the request when an error occurs.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            response = self.get_response(request)
            return response
        except Exception as e:
            # Log detailed error context
            error_context = {
                'timestamp': datetime.now().isoformat(),
                'method': request.method,
                'path': request.path,
                'user_id': request.user.id if request.user.is_authenticated else None,
                'remote_addr': request.META.get('REMOTE_ADDR'),
                'error_type': type(e).__name__,
                'error_message': str(e),
            }

            logger.error(
                f"Request error: {e}",
                extra={'context': error_context},
                exc_info=True
            )
            raise
