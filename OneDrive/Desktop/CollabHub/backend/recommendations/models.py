"""
Activity Feed Models

Tracks all user actions for creating a real-time activity feed across the platform.
Supports personalized, role-aware feeds with efficient pagination and caching.
"""

from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from django.utils import timezone


class ActivityEvent(models.Model):
    """
    Generic activity event model that tracks all user actions.
    
    Uses Django's ContentType framework for flexibility to reference any model.
    """

    # Activity types
    EVENT_TYPES = [
        ('startup_created', 'Startup Created'),
        ('startup_updated', 'Startup Updated'),
        ('opportunity_created', 'Opportunity Posted'),
        ('opportunity_updated', 'Opportunity Updated'),
        ('application_submitted', 'Application Submitted'),
        ('application_accepted', 'Application Accepted'),
        ('startup_saved', 'Startup Saved'),
        ('startup_followed', 'Startup Followed'),
        ('investor_interest', 'Investor Interest Shown'),
        ('connection_made', 'Connection Made'),
        ('update_posted', 'Update Posted'),
        ('message_sent', 'Message Sent'),
    ]

    # Who performed the action
    actor = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='activity_events',
        help_text="User who performed the action"
    )

    # What type of action
    action_type = models.CharField(
        max_length=30,
        choices=EVENT_TYPES,
        db_index=True
    )

    # Generic reference to the object involved
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')

    # Additional context (JSON or text)
    description = models.TextField(
        blank=True,
        help_text="Human-readable description of the action"
    )

    # Metadata for feed filtering
    is_public = models.BooleanField(
        default=True,
        help_text="Whether this event should appear in public feeds"
    )

    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['actor', '-created_at']),
            models.Index(fields=['action_type', '-created_at']),
        ]
        verbose_name_plural = "Activity Events"

    def __str__(self):
        return f"{self.actor} {self.get_action_type_display()} at {self.created_at}"

    @classmethod
    def create_event(cls, actor, action_type, content_object, description="", is_public=True):
        """
        Factory method for creating activity events.
        
        This ensures consistency and catches errors early.
        """
        try:
            event = cls.objects.create(
                actor=actor,
                action_type=action_type,
                content_type=ContentType.objects.get_for_model(content_object),
                object_id=content_object.pk,
                description=description,
                is_public=is_public,
            )
            
            # Invalidate feed cache for relevant users
            cls._invalidate_feed_cache(actor)
            
            return event
        except Exception as e:
            # Log but don't crash if activity creation fails
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to create activity event: {e}")
            return None

    @staticmethod
    def _invalidate_feed_cache(user):
        """Invalidate feed cache when activity is created"""
        from django.core.cache import cache
        cache.delete(f"rec:feed:{user.id}")


class Feed(models.Model):
    """
    Cached feed state for each user.
    
    This helps with efficient pagination and reduces DB queries.
    """

    user = models.OneToOneField(
        'users.User',
        on_delete=models.CASCADE,
        related_name='feed'
    )

    last_activity_id = models.BigIntegerField(
        default=0,
        help_text="ID of the last activity the user saw"
    )

    last_updated = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        verbose_name_plural = "Feeds"

    def __str__(self):
        return f"{self.user}'s Feed"

    @classmethod
    def get_or_create_feed(cls, user):
        """Get or create a feed for a user"""
        feed, created = cls.objects.get_or_create(user=user)
        return feed
