"""
Collaborations App - Serializers
"""

from rest_framework import serializers
from django.utils import timezone
from .models import Application, TeamInvitation, Connection, Notification
from users.serializers import UserListSerializer


class ApplicationSerializer(serializers.ModelSerializer):
    """Full serializer for Application model."""
    
    applicant = UserListSerializer(read_only=True)
    opportunity_title = serializers.CharField(source='opportunity.title', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Application
        fields = [
            'id', 'opportunity', 'opportunity_title', 'applicant',
            'cover_letter', 'resume_url', 'portfolio_url',
            'status', 'status_display', 'feedback', 'rating',
            'applied_at', 'updated_at', 'reviewed_at'
        ]
        read_only_fields = ['applicant', 'applied_at', 'updated_at', 'reviewed_at']


class ApplicationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating applications.

    Backwards-compatible: accepts `startup` (int) when frontend provides a startup
    id — in that case we attempt to resolve a single open opportunity for that
    startup. Also accept `resume_link` / `portfolio_link` as aliases for client
    fields.
    """

    # Accept startup as a write-only convenience field (frontend legacy)
    startup = serializers.IntegerField(write_only=True, required=False)
    resume_link = serializers.CharField(write_only=True, required=False)
    portfolio_link = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Application
        fields = ['opportunity', 'startup', 'cover_letter', 'resume_url', 'portfolio_url', 'resume_link', 'portfolio_link']

    def validate(self, attrs):
        # Map alias fields to canonical names
        if attrs.get('resume_link') and not attrs.get('resume_url'):
            attrs['resume_url'] = attrs.pop('resume_link')
        if attrs.get('portfolio_link') and not attrs.get('portfolio_url'):
            attrs['portfolio_url'] = attrs.pop('portfolio_link')

        # If startup provided but opportunity not, try to resolve
        startup_id = attrs.pop('startup', None)
        if startup_id and not attrs.get('opportunity'):
            from startups.models import Opportunity
            opportunities = Opportunity.objects.filter(startup_id=startup_id, status='open')
            if opportunities.count() == 1:
                attrs['opportunity'] = opportunities.first().id
            elif opportunities.count() == 0:
                raise serializers.ValidationError({'startup': 'No open opportunities found for this startup. Please select an opportunity.'})
            else:
                raise serializers.ValidationError({'startup': 'Multiple opportunities found — submit using a specific opportunity id.'})

        if not attrs.get('opportunity'):
            raise serializers.ValidationError({'opportunity': 'This field is required. Please provide an opportunity id.'})

        return attrs


class ApplicationUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating application status (by opportunity owner)."""
    
    class Meta:
        model = Application
        fields = ['status', 'feedback', 'rating']
    
    def update(self, instance, validated_data):
        instance.reviewed_at = timezone.now()
        return super().update(instance, validated_data)


class TeamInvitationSerializer(serializers.ModelSerializer):
    """Serializer for team invitations."""
    
    inviter = UserListSerializer(read_only=True)
    invitee = UserListSerializer(read_only=True)
    startup_name = serializers.CharField(source='startup.name', read_only=True)
    opportunity_title = serializers.CharField(source='opportunity.title', read_only=True)
    
    class Meta:
        model = TeamInvitation
        fields = [
            'id', 'inviter', 'invitee', 'invitee_id',
            'startup', 'startup_name', 'opportunity', 'opportunity_title',
            'role', 'message', 'status',
            'created_at', 'responded_at', 'expires_at'
        ]
        read_only_fields = ['inviter', 'created_at', 'responded_at']
    
    invitee_id = serializers.IntegerField(write_only=True)


class ConnectionSerializer(serializers.ModelSerializer):
    """Serializer for connections."""
    
    requester = UserListSerializer(read_only=True)
    receiver = UserListSerializer(read_only=True)
    
    class Meta:
        model = Connection
        fields = ['id', 'requester', 'receiver', 'status', 'created_at', 'updated_at']
        read_only_fields = ['requester', 'created_at', 'updated_at']


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for notifications."""
    
    related_user = UserListSerializer(read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'type', 'type_display', 'title', 'message', 'link',
            'related_user', 'is_read', 'created_at'
        ]
        read_only_fields = ['type', 'title', 'message', 'link', 'related_user', 'created_at']


class InterestSerializer(serializers.ModelSerializer):
    """Serializer for Talent/Investor interests."""

    user = UserListSerializer(read_only=True)
    startup_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = getattr(__import__('collaborations.models', fromlist=['Interest']), 'Interest')
        fields = ['id', 'user', 'startup', 'startup_id', 'type', 'message', 'created_at']
        read_only_fields = ['user', 'created_at']

    def create(self, validated_data):
        # Ensure startup is set when startup_id provided
        if 'startup_id' in validated_data and not validated_data.get('startup'):
            from startups.models import Startup
            validated_data['startup'] = Startup.objects.get(pk=validated_data.pop('startup_id'))
        return super().create(validated_data)
