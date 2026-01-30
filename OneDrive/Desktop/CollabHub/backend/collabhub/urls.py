"""
CollabHub URL Configuration

Project-level URL routing that delegates to app-specific URLs.
All API endpoints are prefixed with /api/ for clear separation.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import FileResponse, HttpResponseNotFound
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
import os


def serve_frontend(request, page='index.html'):
    """Serve frontend HTML files."""
    frontend_dir = settings.BASE_DIR.parent / 'frontend'
    
    # Handle pages directory
    if page.startswith('pages/'):
        file_path = frontend_dir / page
    elif page in ['login', 'register', 'opportunities', 'profile', 'messages', 'startups', 'network',
                  'dashboard-talent', 'dashboard-founder', 'dashboard-investor', 'startup-detail']:
        file_path = frontend_dir / 'pages' / f'{page}.html'
    else:
        file_path = frontend_dir / page
    
    if file_path.exists() and file_path.is_file():
        return FileResponse(open(file_path, 'rb'), content_type='text/html')
    return HttpResponseNotFound('Page not found')


@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    """Root API endpoint with documentation."""
    return Response({
        'message': 'Welcome to CollabHub API',
        'version': '1.0.0',
        'endpoints': {
            'auth': {
                'register': '/api/v1/auth/register/',
                'login': '/api/v1/auth/login/',
                'refresh': '/api/v1/auth/refresh/',
                'logout': '/api/v1/auth/logout/',
            },
            'users': '/api/v1/users/',
            'startups': '/api/v1/startups/',
            'opportunities': '/api/v1/opportunities/',
            'applications': '/api/v1/collaborations/applications/',
            'messages': '/api/v1/messages/',
        },
        'frontend': '/app/',
        'admin': '/admin/',
        'documentation': 'See README.md for full API documentation'
    })


urlpatterns = [
    # Frontend routes
    path('', lambda r: serve_frontend(r, 'index.html'), name='home'),
    path('app/', lambda r: serve_frontend(r, 'index.html'), name='frontend_home'),
    path('app/<path:page>', serve_frontend, name='frontend_page'),
    
    # API Root
    path('api/v1/', api_root, name='api_index'),
    
    # Django Admin
    path('admin/', admin.site.urls),
    
    # API Endpoints (all prefixed with /api/v1/)
    path('api/v1/auth/', include('users.urls.auth_urls')),           # Authentication
    path('api/v1/users/', include('users.urls.user_urls')),          # User management
    path('api/v1/startups/', include('startups.urls')),              # Startups
    path('api/v1/opportunities/', include('opportunities.urls')),    # Opportunities
    path('api/v1/collaborations/', include('collaborations.urls')),  # Collaborations
    path('api/v1/messages/', include('messaging.urls')),             # Messaging
]

# Serve media and static files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # Serve frontend static files (css, js)
    urlpatterns += static('/css/', document_root=settings.BASE_DIR.parent / 'frontend' / 'css')
    urlpatterns += static('/js/', document_root=settings.BASE_DIR.parent / 'frontend' / 'js')
    urlpatterns += static('/pages/', document_root=settings.BASE_DIR.parent / 'frontend' / 'pages')


