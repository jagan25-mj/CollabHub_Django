from django.contrib import admin
from recommendations.models import ActivityEvent, Feed


@admin.register(ActivityEvent)
class ActivityEventAdmin(admin.ModelAdmin):
    list_display = ('actor', 'action_type', 'created_at', 'is_public')
    list_filter = ('action_type', 'is_public', 'created_at')
    search_fields = ('actor__email', 'description')
    readonly_fields = ('created_at', 'content_type', 'object_id')
    
    fieldsets = (
        ('Actor', {'fields': ('actor',)}),
        ('Action', {'fields': ('action_type', 'description')}),
        ('Object Reference', {'fields': ('content_type', 'object_id')}),
        ('Visibility', {'fields': ('is_public',)}),
        ('Timestamps', {'fields': ('created_at',)}),
    )


@admin.register(Feed)
class FeedAdmin(admin.ModelAdmin):
    list_display = ('user', 'last_activity_id', 'last_updated')
    readonly_fields = ('user', 'last_updated')
    search_fields = ('user__email',)
