"""
Intelligent Recommendation Service

Rule-based recommendations engine that provides personalized suggestions
for talents, founders, and investors based on their activity, skills, 
and interests.

This is v1 - rule-based. ML can be added in Phase 6.
"""

import logging
from typing import List, Dict, Any
from datetime import timedelta
from django.utils import timezone
from django.core.cache import cache
from django.db.models import Q, Count, F, ExpressionWrapper, FloatField
from django.db.models.functions import Coalesce

logger = logging.getLogger(__name__)


class RecommendationService:
    """
    Service for generating intelligent recommendations.
    
    Recommendations are rule-based and personalized per role:
    - Talents: Recommended startups and opportunities
    - Founders: Recommended talents and investors
    - Investors: Recommended startups
    """

    # Cache keys for different recommendation types
    CACHE_KEYS = {
        'startup_for_talent': 'rec:startup:talent:{user_id}',
        'opportunity_for_talent': 'rec:opp:talent:{user_id}',
        'talent_for_founder': 'rec:talent:founder:{user_id}',
        'startup_for_investor': 'rec:startup:investor:{user_id}',
        'feed': 'rec:feed:{user_id}',
    }

    @staticmethod
    def get_startup_recommendations_for_talent(user, limit=5):
        """
        Recommend startups for a talent based on:
        1. Skills match with startup needs
        2. Recently viewed opportunities from similar startups
        3. Previously applied startups (avoid duplicates)
        """
        from startups.models import Startup, SavedStartup
        from collaborations.models import Application

        cache_key = RecommendationService.CACHE_KEYS['startup_for_talent'].format(user_id=user.id)
        cached = cache.get(cache_key)
        if cached:
            return cached

        try:
            # Get startups user has already engaged with
            saved_startups = SavedStartup.objects.filter(user=user).values_list('startup_id', flat=True)
            applied_startups = Application.objects.filter(applicant=user).values_list(
                'opportunity__startup_id', flat=True
            ).distinct()

            # Get user's skills
            user_skills = set(user.profile.skills.values_list('id', flat=True))

            # Find startups with matching skill requirements
            if user_skills:
                # Startups that need skills the user has
                recommended = Startup.objects.filter(
                    is_active=True
                ).exclude(
                    id__in=saved_startups
                ).exclude(
                    id__in=applied_startups
                ).annotate(
                    skill_match=Count('required_skills', filter=Q(required_skills__in=user_skills))
                ).filter(
                    skill_match__gt=0
                ).order_by('-skill_match', '-created_at')[:limit]
            else:
                # If no skills, recommend trending startups
                recent_date = timezone.now() - timedelta(days=30)
                recommended = Startup.objects.filter(
                    is_active=True,
                    created_at__gte=recent_date,
                ).exclude(
                    id__in=saved_startups
                ).annotate(
                    popularity=Coalesce(Count('savedstartup'), 0) + Coalesce(Count('followedstartup'), 0)
                ).order_by('-popularity', '-created_at')[:limit]

            result = list(recommended.values(
                'id', 'name', 'tagline', 'industry', 'logo_url', 'created_at'
            ))
            cache.set(cache_key, result, 1800)  # 30 min cache
            return result

        except Exception as e:
            logger.error(f"Error generating startup recommendations: {e}")
            return []

    @staticmethod
    def get_talent_recommendations_for_founder(user, limit=5):
        """
        Recommend talents for a founder based on:
        1. Skills matching open opportunities
        2. Successful previous applicants
        3. Activity recency (recently active talents)
        """
        from users.models import Profile
        from collaborations.models import Application
        from startups.models import Startup

        cache_key = RecommendationService.CACHE_KEYS['talent_for_founder'].format(user_id=user.id)
        cached = cache.get(cache_key)
        if cached:
            return cached

        try:
            # Get founder's startups
            founder_startups = Startup.objects.filter(founder=user)
            
            # Get talents who applied to founder's opportunities (high signal)
            high_quality_talents = Application.objects.filter(
                opportunity__startup__in=founder_startups,
                status__in=['accepted', 'shortlisted']
            ).values_list('applicant_id', flat=True).distinct()[:limit]

            if high_quality_talents:
                # Show recently active high-quality talents first
                recommended = Profile.objects.filter(
                    user_id__in=high_quality_talents
                ).order_by('-user__last_login')

            else:
                # If no history, recommend recently active talents with matching skills
                required_skills = set()
                for startup in founder_startups:
                    required_skills.update(startup.required_skills.values_list('id', flat=True))

                if required_skills:
                    recommended = Profile.objects.filter(
                        skills__in=required_skills
                    ).annotate(
                        skill_match=Count('skills', filter=Q(skills__in=required_skills))
                    ).order_by('-skill_match', '-user__last_login')[:limit]
                else:
                    recent_date = timezone.now() - timedelta(days=30)
                    recommended = Profile.objects.filter(
                        user__date_joined__gte=recent_date
                    ).order_by('-user__last_login')[:limit]

            result = list(recommended.values(
                'user_id', 'user__first_name', 'user__last_name', 
                'bio', 'profile_photo_url', 'location'
            ))
            cache.set(cache_key, result, 1800)
            return result

        except Exception as e:
            logger.error(f"Error generating talent recommendations: {e}")
            return []

    @staticmethod
    def get_startup_recommendations_for_investor(user, limit=5):
        """
        Recommend startups for an investor based on:
        1. Industry interest match
        2. Traction signals (followers, saves, applications)
        3. Update activity (active founders)
        4. Recent application activity (engagement signal)
        """
        from startups.models import Startup, SavedStartup

        cache_key = RecommendationService.CACHE_KEYS['startup_for_investor'].format(user_id=user.id)
        cached = cache.get(cache_key)
        if cached:
            return cached

        try:
            # Exclude already saved/followed startups
            saved_startups = SavedStartup.objects.filter(user=user).values_list('startup_id', flat=True)
            followed_startups = Startup.objects.filter(
                followedstartup__user=user
            ).values_list('id', flat=True)

            recent_date = timezone.now() - timedelta(days=30)

            # Score startups by traction signals
            recommended = Startup.objects.filter(
                is_active=True,
                updated_at__gte=recent_date  # Active in last 30 days
            ).exclude(
                id__in=saved_startups
            ).exclude(
                id__in=followed_startups
            ).annotate(
                # Traction score: followers + saves + recent applications
                traction_score=ExpressionWrapper(
                    Count('followedstartup', distinct=True) * 2 +  # Weight follows higher
                    Count('savedstartup', distinct=True) +
                    Count('updates', distinct=True),
                    output_field=FloatField()
                ),
                recent_activity=Count(
                    'opportunities__application',
                    filter=Q(opportunities__application__created_at__gte=recent_date),
                    distinct=True
                )
            ).order_by('-traction_score', '-recent_activity', '-updated_at')[:limit]

            result = list(recommended.values(
                'id', 'name', 'tagline', 'industry', 'logo_url',
                'founder__user__first_name', 'founder__user__last_name'
            ))
            cache.set(cache_key, result, 1800)
            return result

        except Exception as e:
            logger.error(f"Error generating investor startup recommendations: {e}")
            return []

    @staticmethod
    def get_opportunity_recommendations_for_talent(user, limit=5):
        """
        Recommend opportunities for a talent based on:
        1. Skills match
        2. Interests (saved/followed startups)
        3. Similar to previously applied opportunities
        """
        from opportunities.models import Opportunity
        from collaborations.models import Application

        cache_key = RecommendationService.CACHE_KEYS['opportunity_for_talent'].format(user_id=user.id)
        cached = cache.get(cache_key)
        if cached:
            return cached

        try:
            # Get opportunities already applied to
            applied_opps = Application.objects.filter(applicant=user).values_list('opportunity_id', flat=True)

            # Get user's interests (startups they follow/save)
            interested_startups = Startup.objects.filter(
                Q(savedstartup__user=user) | Q(followedstartup__user=user)
            ).values_list('id', flat=True).distinct()

            user_skills = user.profile.skills.all()

            # Find opportunities that match skills or are from interested startups
            recommended = Opportunity.objects.filter(
                is_active=True
            ).exclude(
                id__in=applied_opps
            ).filter(
                Q(required_skills__in=user_skills) | Q(startup_id__in=interested_startups)
            ).annotate(
                skill_match=Count('required_skills', filter=Q(required_skills__in=user_skills)),
                from_interested_startup=Count('startup', filter=Q(startup_id__in=interested_startups))
            ).order_by('-skill_match', '-from_interested_startup', '-created_at')[:limit]

            result = list(recommended.values(
                'id', 'title', 'description', 'opp_type', 'startup__name',
                'startup__logo_url', 'created_at'
            ))
            cache.set(cache_key, result, 1800)
            return result

        except Exception as e:
            logger.error(f"Error generating opportunity recommendations: {e}")
            return []

    @staticmethod
    def invalidate_recommendations(user_id):
        """Invalidate all cached recommendations for a user"""
        keys_to_delete = [
            RecommendationService.CACHE_KEYS['startup_for_talent'].format(user_id=user_id),
            RecommendationService.CACHE_KEYS['opportunity_for_talent'].format(user_id=user_id),
            RecommendationService.CACHE_KEYS['talent_for_founder'].format(user_id=user_id),
            RecommendationService.CACHE_KEYS['startup_for_investor'].format(user_id=user_id),
            RecommendationService.CACHE_KEYS['feed'].format(user_id=user_id),
        ]
        cache.delete_many(keys_to_delete)
        logger.debug(f"Invalidated recommendations cache for user {user_id}")
