"""
Collaborations App - Views
"""

from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.db.models import Q, F

from .models import Application, TeamInvitation, Connection, Notification
from opportunities.models import Opportunity
from .serializers import (
    ApplicationSerializer,
    ApplicationCreateSerializer,
    ApplicationUpdateSerializer,
    TeamInvitationSerializer,
    ConnectionSerializer,
    NotificationSerializer
)


# =============================================================================
# APPLICATION VIEWS
# =============================================================================

class ApplicationListCreateView(generics.ListCreateAPIView):
    """
    GET: List user's applications
    POST: Apply to an opportunity
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ApplicationCreateSerializer
        return ApplicationSerializer
    
    def get_queryset(self):
        return Application.objects.filter(
            applicant=self.request.user
        ).select_related('opportunity')
    
    def perform_create(self, serializer):
        application = serializer.save(applicant=self.request.user)
        
        # Update opportunity application count atomically to prevent race conditions
        Opportunity.objects.filter(pk=application.opportunity.pk).update(
            total_applications=F('total_applications') + 1
        )
        
        # Create notification for opportunity owner
        Notification.objects.create(
            user=application.opportunity.created_by,
            type=Notification.Type.APPLICATION,
            title='New Application',
            message=f'{self.request.user.get_full_name() or self.request.user.email} applied to {application.opportunity.title}',
            link=f'/opportunities/{application.opportunity.id}/applications',
            related_user=self.request.user
        )


class ApplicationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Get application details
    PUT/PATCH: Update application (withdraw or update status)
    DELETE: Withdraw application
    """
    
    queryset = Application.objects.select_related('opportunity', 'applicant')
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ApplicationUpdateSerializer
        return ApplicationSerializer
    
    def get_queryset(self):
        user = self.request.user
        # Users can see their own applications or applications to their opportunities
        return Application.objects.filter(
            Q(applicant=user) | Q(opportunity__created_by=user)
        )


class OpportunityApplicationsView(generics.ListAPIView):
    """List all applications for an opportunity (owner only)."""
    
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        opportunity_id = self.kwargs['opportunity_id']
        return Application.objects.filter(
            opportunity_id=opportunity_id,
            opportunity__created_by=self.request.user
        ).select_related('applicant')


class StartupApplicationsView(generics.ListAPIView):
    """List all applications for a startup's opportunities (founder only)."""
    
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        startup_id = self.kwargs['startup_id']
        # Get all applications for this startup's opportunities where user is founder
        return Application.objects.filter(
            opportunity__startup_id=startup_id,
            opportunity__startup__founder=self.request.user
        ).select_related('applicant', 'opportunity')


class ApplicationStatusUpdateView(APIView):
    """
    Update application status (for founders).
    
    Actions: accept, reject, shortlist
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        action = request.data.get('action')  # 'accept', 'reject', 'shortlist'
        feedback = request.data.get('feedback', '')
        
        try:
            application = Application.objects.get(pk=pk)
        except Application.DoesNotExist:
            return Response(
                {'error': 'Application not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verify user is opportunity owner
        if application.opportunity.created_by != request.user:
            return Response(
                {'error': 'Not authorized to update this application'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate action
        valid_actions = {
            'accept': Application.Status.ACCEPTED,
            'reject': Application.Status.REJECTED,
            'shortlist': Application.Status.SHORTLISTED
        }
        
        if action not in valid_actions:
            return Response(
                {'error': f'Invalid action. Must be one of: {", ".join(valid_actions.keys())}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update application
        application.status = valid_actions[action]
        if feedback:
            application.feedback = feedback
        application.save()
        
        # Create notification for applicant
        status_messages = {
            'accept': 'Your application has been accepted!',
            'reject': 'Your application has been rejected.',
            'shortlist': 'Your application has been shortlisted!'
        }
        
        Notification.objects.create(
            user=application.applicant,
            type=Notification.Type.APPLICATION,
            title=f'Application {action.title()}ed',
            message=status_messages.get(action),
            link=f'/applications/{application.id}',
            related_user=request.user
        )
        
        return Response(
            {
                'message': f'Application {action}ed successfully',
                'application': ApplicationSerializer(application).data
            },
            status=status.HTTP_200_OK
        )


# =============================================================================
# TEAM INVITATION VIEWS
# =============================================================================

class TeamInvitationListCreateView(generics.ListCreateAPIView):
    """
    GET: List received invitations
    POST: Send an invitation
    """
    
    serializer_class = TeamInvitationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return TeamInvitation.objects.filter(
            invitee=self.request.user,
            status='pending'
        ).select_related('inviter', 'startup', 'opportunity')
    
    def perform_create(self, serializer):
        serializer.save(inviter=self.request.user)
        
        # Create notification for invitee
        invitation = serializer.instance
        Notification.objects.create(
            user=invitation.invitee,
            type=Notification.Type.INVITATION,
            title='Team Invitation',
            message=f'{self.request.user.get_full_name() or self.request.user.email} invited you to join their team',
            link='/invitations',
            related_user=self.request.user
        )


class TeamInvitationResponseView(APIView):
    """Accept or decline an invitation."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        action = request.data.get('action')  # 'accept' or 'decline'
        
        try:
            invitation = TeamInvitation.objects.get(
                pk=pk,
                invitee=request.user,
                status='pending'
            )
        except TeamInvitation.DoesNotExist:
            return Response(
                {'error': 'Invitation not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if action == 'accept':
            invitation.status = TeamInvitation.Status.ACCEPTED
            invitation.responded_at = timezone.now()
            invitation.save()
            
            # Add user to startup if applicable
            if invitation.startup:
                from startups.models import StartupMember
                StartupMember.objects.create(
                    startup=invitation.startup,
                    user=request.user,
                    role=invitation.role or 'member'
                )
            
            return Response({'message': 'Invitation accepted'})
        
        elif action == 'decline':
            invitation.status = TeamInvitation.Status.DECLINED
            invitation.responded_at = timezone.now()
            invitation.save()
            return Response({'message': 'Invitation declined'})
        
        return Response(
            {'error': 'Invalid action'},
            status=status.HTTP_400_BAD_REQUEST
        )


# =============================================================================
# CONNECTION VIEWS
# =============================================================================

class ConnectionListCreateView(generics.ListCreateAPIView):
    """
    GET: List user's connections
    POST: Send connection request
    """
    
    serializer_class = ConnectionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        return Connection.objects.filter(
            Q(requester=user) | Q(receiver=user),
            status='accepted'
        ).select_related('requester', 'receiver')
    
    def post(self, request):
        receiver_id = request.data.get('receiver_id')
        
        if not receiver_id:
            return Response(
                {'error': 'receiver_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if receiver_id == request.user.id:
            return Response(
                {'error': 'Cannot connect with yourself'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if connection already exists
        existing = Connection.objects.filter(
            Q(requester=request.user, receiver_id=receiver_id) |
            Q(requester_id=receiver_id, receiver=request.user)
        ).first()
        
        if existing:
            return Response(
                {'error': 'Connection already exists', 'status': existing.status},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        connection = Connection.objects.create(
            requester=request.user,
            receiver_id=receiver_id
        )
        
        # Create notification
        Notification.objects.create(
            user_id=receiver_id,
            type=Notification.Type.CONNECTION,
            title='Connection Request',
            message=f'{request.user.get_full_name() or request.user.email} wants to connect',
            link='/connections',
            related_user=request.user
        )
        
        return Response(
            ConnectionSerializer(connection).data,
            status=status.HTTP_201_CREATED
        )


class ConnectionRequestsView(generics.ListAPIView):
    """List pending connection requests."""
    
    serializer_class = ConnectionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Connection.objects.filter(
            receiver=self.request.user,
            status='pending'
        ).select_related('requester')


class ConnectionResponseView(APIView):
    """Accept or decline a connection request."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, pk):
        action = request.data.get('action')  # 'accept' or 'decline'
        
        try:
            connection = Connection.objects.get(
                pk=pk,
                receiver=request.user,
                status='pending'
            )
        except Connection.DoesNotExist:
            return Response(
                {'error': 'Connection request not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if action == 'accept':
            connection.status = Connection.Status.ACCEPTED
            connection.save()
            
            # Update connection counts atomically to prevent race conditions
            from users.models import Profile
            Profile.objects.filter(user=connection.requester).update(
                total_connections=F('total_connections') + 1
            )
            Profile.objects.filter(user=connection.receiver).update(
                total_connections=F('total_connections') + 1
            )
            
            return Response({'message': 'Connection accepted'})
        
        elif action == 'decline':
            connection.delete()
            return Response({'message': 'Connection declined'})
        
        return Response(
            {'error': 'Invalid action'},
            status=status.HTTP_400_BAD_REQUEST
        )


# =============================================================================
# NOTIFICATION VIEWS
# =============================================================================

class NotificationListView(generics.ListAPIView):
    """List user's notifications."""
    
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(
            user=self.request.user
        ).order_by('-created_at')[:50]


class NotificationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Get notification details
    PATCH: Update notification (mark as read)
    DELETE: Delete notification
    """
    
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class NotificationMarkReadView(APIView):
    """Mark notifications as read."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        notification_ids = request.data.get('ids', [])
        
        if notification_ids:
            Notification.objects.filter(
                user=request.user,
                id__in=notification_ids
            ).update(is_read=True)
        else:
            # Mark all as read
            Notification.objects.filter(
                user=request.user,
                is_read=False
            ).update(is_read=True)
        
        return Response({'message': 'Notifications marked as read'})


class UnreadNotificationCountView(APIView):
    """Get count of unread notifications."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).count()
        return Response({'count': count})
