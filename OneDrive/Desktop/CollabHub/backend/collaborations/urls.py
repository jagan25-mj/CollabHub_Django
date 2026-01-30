"""
Collaborations App - URL Configuration
"""

from django.urls import path
from .views import (
    ApplicationListCreateView,
    ApplicationDetailView,
    ApplicationStatusUpdateView,
    OpportunityApplicationsView,
    StartupApplicationsView,
    TeamInvitationListCreateView,
    TeamInvitationResponseView,
    ConnectionListCreateView,
    ConnectionRequestsView,
    ConnectionResponseView,
    NotificationListView,
    NotificationDetailView,
    NotificationMarkReadView,
    UnreadNotificationCountView
)

urlpatterns = [
    # Applications
    path('applications/', ApplicationListCreateView.as_view(), name='application_list'),
    path('applications/<int:pk>/', ApplicationDetailView.as_view(), name='application_detail'),
    path('applications/<int:pk>/status/', ApplicationStatusUpdateView.as_view(), name='application_status'),
    path('opportunities/<int:opportunity_id>/applications/', OpportunityApplicationsView.as_view(), name='opportunity_applications'),
    path('startups/<int:startup_id>/applications/', StartupApplicationsView.as_view(), name='startup_applications'),
    path('startups/<int:startup_id>/interest/', ExpressInterestView.as_view(), name='express_interest'),
    path('startups/<int:startup_id>/investor-interest/', InvestorInterestView.as_view(), name='investor_interest'),
    path('startups/<int:startup_id>/interests/', StartupInterestsView.as_view(), name='startup_interests'),
    
    # Team Invitations
    path('invitations/', TeamInvitationListCreateView.as_view(), name='invitation_list'),
    path('invitations/<int:pk>/respond/', TeamInvitationResponseView.as_view(), name='invitation_respond'),
    
    # Connections
    path('connections/', ConnectionListCreateView.as_view(), name='connection_list'),
    path('connections/requests/', ConnectionRequestsView.as_view(), name='connection_requests'),
    path('connections/<int:pk>/respond/', ConnectionResponseView.as_view(), name='connection_respond'),
    
    # Notifications
    path('notifications/', NotificationListView.as_view(), name='notification_list'),
    path('notifications/<int:pk>/', NotificationDetailView.as_view(), name='notification_detail'),
    path('notifications/read/', NotificationMarkReadView.as_view(), name='notification_read'),
    path('notifications/count/', UnreadNotificationCountView.as_view(), name='notification_count'),
]
