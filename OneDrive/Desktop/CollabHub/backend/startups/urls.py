"""
Startups App - URL Configuration
"""

from django.urls import path
from .views import (
    StartupListCreateView,
    StartupDetailView,
    MyStartupsView,
    StartupMemberView,
    StartupUpdateView,
    SaveStartupView,
    FollowStartupView,
    MySavedStartupsView,
    MyFollowingStartupsView
)

urlpatterns = [
    # Startup CRUD
    path('', StartupListCreateView.as_view(), name='startup_list'),
    path('<int:pk>/', StartupDetailView.as_view(), name='startup_detail'),
    
    # My startups
    path('my/', MyStartupsView.as_view(), name='my_startups'),
    path('my/saved/', MySavedStartupsView.as_view(), name='my_saved_startups'),
    path('my/following/', MyFollowingStartupsView.as_view(), name='my_following_startups'),
    
    # Save/Follow
    path('<int:pk>/save/', SaveStartupView.as_view(), name='save_startup'),
    path('<int:pk>/follow/', FollowStartupView.as_view(), name='follow_startup'),
    
    # Team members
    path('<int:pk>/members/', StartupMemberView.as_view(), name='startup_members'),
    
    # Updates
    path('<int:pk>/updates/', StartupUpdateView.as_view(), name='startup_updates'),
]
