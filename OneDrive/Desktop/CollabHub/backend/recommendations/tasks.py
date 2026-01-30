"""
Async Task Abstraction for Background Jobs

This provides a Django-native abstraction that works without Celery,
but can be easily swapped to Celery in production.

For now, we use a simple in-process queue for development.
"""

import logging
import json
from datetime import datetime
from typing import Callable, Any, Dict
from queue import Queue
import threading

logger = logging.getLogger(__name__)


class TaskQueue:
    """
    Simple in-process task queue.
    Can be replaced with Celery for production.
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._queue = Queue()
                    cls._instance._start_worker()
        return cls._instance

    def _start_worker(self):
        """Start background worker thread"""
        worker = threading.Thread(target=self._process_queue, daemon=True)
        worker.start()
        logger.info("Task queue worker started")

    def _process_queue(self):
        """Process tasks from queue"""
        while True:
            try:
                task_func, args, kwargs = self._queue.get()
                self._execute_task(task_func, args, kwargs)
            except Exception as e:
                logger.error(f"Error processing task: {e}", exc_info=True)

    @staticmethod
    def _execute_task(task_func: Callable, args: tuple, kwargs: dict):
        """Execute a task safely"""
        try:
            logger.debug(f"Executing task: {task_func.__name__}")
            result = task_func(*args, **kwargs)
            logger.debug(f"Task {task_func.__name__} completed: {result}")
            return result
        except Exception as e:
            logger.error(f"Task {task_func.__name__} failed: {e}", exc_info=True)
            return None

    def enqueue(self, func: Callable, *args, **kwargs):
        """
        Add a task to the queue.
        
        Usage:
            task_queue.enqueue(send_notification, user_id=123, message="Hello")
        """
        self._queue.put((func, args, kwargs))
        logger.debug(f"Task enqueued: {func.__name__}")


# Global task queue instance
task_queue = TaskQueue()


# ============================================================================
# NOTIFICATION TASKS
# ============================================================================

def send_notification_async(user_id: int, title: str, message: str, notification_type: str = 'info'):
    """
    Async task to send a notification.
    
    This task:
    - Creates a notification record
    - Sends WebSocket message to user
    - Prevents duplicates
    """
    try:
        from django.utils import timezone
        from users.models import User
        from collaborations.models import Notification
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        import asyncio

        user = User.objects.get(id=user_id)

        # Check for duplicates within last 5 seconds
        recent = Notification.objects.filter(
            recipient=user,
            title=title,
            created_at__gte=timezone.now() - timezone.timedelta(seconds=5)
        ).count()

        if recent > 0:
            logger.debug(f"Skipped duplicate notification for {user.email}")
            return None

        # Create notification
        notification = Notification.objects.create(
            recipient=user,
            title=title,
            message=message,
            notification_type=notification_type,
        )

        # Send WebSocket message
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"user_{user_id}",
            {
                "type": "notification.message",
                "title": title,
                "message": message,
                "notification_id": notification.id,
                "notification_type": notification_type,
                "timestamp": datetime.now().isoformat(),
            }
        )

        logger.info(f"Notification sent to {user.email}: {title}")
        return notification.id

    except Exception as e:
        logger.error(f"Failed to send notification: {e}", exc_info=True)
        return None


def create_activity_event_async(actor_id: int, action_type: str, object_model: str, 
                                object_id: int, description: str = "", is_public: bool = True):
    """
    Async task to create an activity event for the feed.
    """
    try:
        from django.contrib.contenttypes.models import ContentType
        from django.apps import apps
        from recommendations.models import ActivityEvent
        from users.models import User

        actor = User.objects.get(id=actor_id)
        
        # Get the content type and object
        model_class = apps.get_model(object_model.split('.')[0], object_model.split('.')[1])
        content_type = ContentType.objects.get_for_model(model_class)
        
        # Create activity event
        event = ActivityEvent.objects.create(
            actor=actor,
            action_type=action_type,
            content_type=content_type,
            object_id=object_id,
            description=description,
            is_public=is_public,
        )

        logger.info(f"Activity event created: {action_type} by {actor.email}")
        return event.id

    except Exception as e:
        logger.error(f"Failed to create activity event: {e}", exc_info=True)
        return None


# ============================================================================
# PUBLIC API - Use these functions in views/signals
# ============================================================================

def notify_user(user_id: int, title: str, message: str, notification_type: str = 'info'):
    """
    Queue a notification to be sent asynchronously.
    
    This function returns immediately. The notification is sent in the background.
    
    Usage:
        notify_user(123, "New Application", "You have a new application!")
    """
    task_queue.enqueue(send_notification_async, user_id, title, message, notification_type)


def log_activity(actor_id: int, action_type: str, object_model: str, object_id: int, 
                description: str = "", is_public: bool = True):
    """
    Queue an activity event to be logged asynchronously.
    
    Usage:
        log_activity(123, 'startup_created', 'startups.Startup', 456, "Created my first startup")
    """
    task_queue.enqueue(
        create_activity_event_async,
        actor_id,
        action_type,
        object_model,
        object_id,
        description,
        is_public
    )
