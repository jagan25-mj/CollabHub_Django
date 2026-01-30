"""
Recommendations and Activity Feed API Views
"""

import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework import serializers, status
from django.core.cache import cache

from recommendations.services import RecommendationService
from recommendations.models import ActivityEvent, Feed

logger = logging.getLogger(__name__)


class RecommendationPagination(PageNumberPagination):
    page_size = 10


# ============================================================================
# SERIALIZERS
# ============================================================================

class RecommendationSerializer(serializers.Serializer):
    """Generic recommendation serializer"""
    id = serializers.IntegerField()
    name = serializers.CharField(max_length=255, required=False)
    title = serializers.CharField(max_length=255, required=False)
    tagline = serializers.CharField(required=False)
    description = serializers.CharField(required=False)
    type = serializers.SerializerMethodField()

    def get_type(self, obj):
        if 'name' in obj:
            return 'startup'
        elif 'title' in obj:
            return 'opportunity'
        else:
            return 'user'


class ActivityEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.get_full_name', read_only=True)
    actor_avatar = serializers.CharField(source='actor.profile.profile_photo_url', read_only=True)
    action_display = serializers.CharField(source='get_action_type_display', read_only=True)
    
    class Meta:
        model = ActivityEvent
        fields = [
            'id', 'actor', 'actor_name', 'actor_avatar',
            'action_type', 'action_display', 'description',
            'content_type', 'object_id', 'is_public',
            'created_at'
        ]
        read_only_fields = fields


# ============================================================================
# VIEWS
# ============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recommendations_view(request):
    """
    GET /api/v1/recommendations/
    
    Returns personalized recommendations based on user role.
    
    Query Parameters:
    - type: 'startup', 'opportunity', 'talent' (default: auto-detect from role)
    - limit: number of recommendations (default: 5, max: 20)
    """
    try:
        user = request.user
        rec_type = request.query_params.get('type')
        limit = min(int(request.query_params.get('limit', 5)), 20)

        recommendations = []
        recommendation_type = None

        # Auto-detect recommendations based on user role
        if not rec_type:
            role = user.role if hasattr(user, 'role') else None
            if role == 'talent':
                rec_type = 'startup'
            elif role == 'founder':
                rec_type = 'talent'
            elif role == 'investor':
                rec_type = 'startup'
            else:
                rec_type = 'startup'  # Default

        # Get recommendations based on type
        if rec_type == 'startup':
            recommendations = RecommendationService.get_startup_recommendations_for_talent(user, limit)
            recommendation_type = 'startup'
        elif rec_type == 'opportunity':
            recommendations = RecommendationService.get_opportunity_recommendations_for_talent(user, limit)
            recommendation_type = 'opportunity'
        elif rec_type == 'talent':
            recommendations = RecommendationService.get_talent_recommendations_for_founder(user, limit)
            recommendation_type = 'user'

        return Response({
            'type': recommendation_type,
            'count': len(recommendations),
            'recommendations': recommendations
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching recommendations: {e}", exc_info=True)
        return Response(
            {'error': 'Failed to fetch recommendations'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def activity_feed_view(request):
    """
    GET /api/v1/feed/
    
    Returns a paginated activity feed personalized for the user.
    
    Includes:
    - Actions from followed users
    - Actions from saved/followed startups
    - Recent applications
    - Community highlights
    
    Query Parameters:
    - page: page number (default: 1)
    - type: filter by event type (e.g., 'startup_created', 'application_submitted')
    """
    try:
        user = request.user
        event_type = request.query_params.get('type')

        # Check cache first
        cache_key = f'feed:{user.id}:page:{request.query_params.get("page", 1)}'
        if event_type:
            cache_key += f':type:{event_type}'

        cached_feed = cache.get(cache_key)
        if cached_feed:
            return Response(cached_feed, status=status.HTTP_200_OK)

        # Build feed query
        from startups.models import Startup, SavedStartup

        # Get events from various sources
        feed_events = ActivityEvent.objects.select_related('actor').filter(
            is_public=True
        )

        # Filter by user interests (optional)
        if event_type:
            feed_events = feed_events.filter(action_type=event_type)

        # Get events from:
        # 1. Saved/followed startups
        saved_startups = SavedStartup.objects.filter(user=user).values_list('startup_id', flat=True)
        followed_startups = Startup.objects.filter(
            followedstartup__user=user
        ).values_list('id', flat=True)

        interested_startup_ids = list(saved_startups) + list(followed_startups)

        if interested_startup_ids:
            # Get events related to interested startups
            startup_events = ActivityEvent.objects.filter(
                action_type__in=['startup_created', 'startup_updated', 'opportunity_created'],
                object_id__in=interested_startup_ids
            )
        else:
            startup_events = ActivityEvent.objects.none()

        # 2. Recent popular events
        popular_events = ActivityEvent.objects.filter(
            action_type__in=['startup_created', 'opportunity_created']
        ).order_by('-created_at')[:20]

        # Combine and deduplicate
        combined_ids = set(startup_events.values_list('id', flat=True)) | set(
            popular_events.values_list('id', flat=True)
        )

        feed_events = ActivityEvent.objects.filter(
            id__in=list(combined_ids)
        ).order_by('-created_at')

        # Paginate
        paginator = RecommendationPagination()
        paginated_events = paginator.paginate_queryset(feed_events, request)

        serializer = ActivityEventSerializer(paginated_events, many=True)
        result = paginator.get_paginated_response(serializer.data).data

        # Cache result
        cache.set(cache_key, result, 300)  # 5 minute cache

        return Response(result, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching activity feed: {e}", exc_info=True)
        return Response(
            {'error': 'Failed to fetch feed'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_activity_view(request, user_id):
    """
    GET /api/v1/users/<user_id>/activity/
    
    Returns activity feed for a specific user (public activity only).
    """
    try:
        from users.models import User

        user_obj = User.objects.get(id=user_id)
        
        # Get public activities
        activities = ActivityEvent.objects.filter(
            actor=user_obj,
            is_public=True
        ).select_related('actor').order_by('-created_at')

        # Paginate
        paginator = RecommendationPagination()
        paginated = paginator.paginate_queryset(activities, request)

        serializer = ActivityEventSerializer(paginated, many=True)
        return paginator.get_paginated_response(serializer.data)

    except Exception as e:
        logger.error(f"Error fetching user activity: {e}", exc_info=True)
        return Response(
            {'error': 'Failed to fetch user activity'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
