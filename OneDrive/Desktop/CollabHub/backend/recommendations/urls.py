"""
Recommendations and Activity Feed URLs
"""

from django.urls import path
from recommendations.views import (
    recommendations_view,
    activity_feed_view,
    user_activity_view,
)

app_name = 'recommendations'

urlpatterns = [
    # Recommendations
    path('recommendations/', recommendations_view, name='recommendations'),
    
    # Activity Feed
    path('feed/', activity_feed_view, name='feed'),
    
    # User Activity
    path('users/<int:user_id>/activity/', user_activity_view, name='user-activity'),
]
