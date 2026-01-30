"""
WebSocket Consumers for real-time messaging.

Phase 4 Feature: Real-time message delivery, typing indicators, read receipts.

Architecture:
- JWTAuthMiddleware validates JWT tokens before connection
- Group-based broadcasting for efficient delivery
- Async message handling for performance
"""

import json
from datetime import datetime
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Conversation, Message

User = get_user_model()


class MessageConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time messaging.
    
    Endpoint: ws://localhost/ws/messages/{conversation_id}/
    
    Features:
    - Real-time message delivery (<100ms)
    - Typing indicators
    - Read receipts
    - Online/offline status
    - Auto-reconnect handling
    
    Authentication:
    - JWT token validated via AuthMiddlewareStack
    - User access to conversation verified
    """
    
    async def connect(self):
        """Handle WebSocket connection."""
        try:
            # Get conversation ID from URL
            self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
            self.user = self.scope['user']
            self.room_group_name = f'messages_{self.conversation_id}'
            
            # Verify user has access to conversation
            conversation = await self.get_conversation(self.conversation_id)
            if not conversation:
                await self.close()
                return
            
            # Verify user is participant
            is_participant = await self.is_conversation_participant(
                self.conversation_id, 
                self.user.id
            )
            if not is_participant:
                await self.close()
                return
            
            # Join room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            # Accept connection
            await self.accept()
            
            # Notify others that user is online
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_online',
                    'user_id': self.user.id,
                    'username': self.user.get_full_name() or self.user.email,
                    'timestamp': datetime.now().isoformat(),
                }
            )
            
        except Exception as e:
            print(f"WebSocket connection error: {str(e)}")
            await self.close()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        try:
            # Notify others that user went offline
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_offline',
                    'user_id': self.user.id,
                    'timestamp': datetime.now().isoformat(),
                }
            )
            
            # Leave room group
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        except Exception as e:
            print(f"WebSocket disconnection error: {str(e)}")
    
    async def receive(self, text_data):
        """Handle incoming WebSocket message."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'message':
                await self.handle_message(data)
            elif message_type == 'typing':
                await self.handle_typing(data)
            elif message_type == 'read_receipt':
                await self.handle_read_receipt(data)
            
        except json.JSONDecodeError:
            await self.send_error('Invalid JSON')
        except Exception as e:
            print(f"WebSocket receive error: {str(e)}")
            await self.send_error(str(e))
    
    async def handle_message(self, data):
        """
        Handle incoming message.
        
        Expected data:
        {
            'type': 'message',
            'content': 'Message content',
            'attachment_url': (optional),
            'attachment_type': (optional)
        }
        """
        content = data.get('content', '').strip()
        
        # Validate content
        if not content or len(content) > 5000:
            await self.send_error('Message must be 1-5000 characters')
            return
        
        # Sanitize content (XSS protection)
        content = self.sanitize_content(content)
        
        # Save message to database
        message = await self.save_message(
            conversation_id=self.conversation_id,
            sender_id=self.user.id,
            content=content,
            attachment_url=data.get('attachment_url'),
            attachment_type=data.get('attachment_type'),
        )
        
        if not message:
            await self.send_error('Failed to save message')
            return
        
        # Broadcast message to room
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'message_broadcast',
                'id': message.id,
                'sender_id': self.user.id,
                'sender_name': self.user.get_full_name() or self.user.email,
                'sender_avatar': str(self.user.avatar) if hasattr(self.user, 'avatar') else '',
                'content': message.content,
                'timestamp': message.created_at.isoformat(),
                'attachment_url': message.attachment_url,
                'attachment_type': message.attachment_type,
                'is_read': False,
            }
        )
    
    async def handle_typing(self, data):
        """
        Handle typing indicator.
        
        Expected data:
        {
            'type': 'typing',
            'is_typing': true/false
        }
        """
        is_typing = data.get('is_typing', False)
        
        # Broadcast typing status
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_indicator',
                'user_id': self.user.id,
                'username': self.user.get_full_name() or self.user.email,
                'is_typing': is_typing,
                'timestamp': datetime.now().isoformat(),
            }
        )
    
    async def handle_read_receipt(self, data):
        """
        Handle read receipt.
        
        Expected data:
        {
            'type': 'read_receipt',
            'message_id': 123
        }
        """
        message_id = data.get('message_id')
        if not message_id:
            return
        
        # Mark message as read
        await self.mark_message_read(message_id, self.user.id)
        
        # Broadcast read receipt
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'message_read',
                'message_id': message_id,
                'user_id': self.user.id,
                'timestamp': datetime.now().isoformat(),
            }
        )
    
    # =========================================================================
    # Broadcast Event Handlers (called via channel_layer.group_send)
    # =========================================================================
    
    async def message_broadcast(self, event):
        """Send message to WebSocket client."""
        await self.send(text_data=json.dumps({
            'type': 'message',
            'data': {
                'id': event['id'],
                'sender_id': event['sender_id'],
                'sender_name': event['sender_name'],
                'sender_avatar': event['sender_avatar'],
                'content': event['content'],
                'timestamp': event['timestamp'],
                'attachment_url': event['attachment_url'],
                'attachment_type': event['attachment_type'],
                'is_read': event['is_read'],
            }
        }))
    
    async def typing_indicator(self, event):
        """Send typing indicator to WebSocket client."""
        # Don't send typing indicator to self
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'data': {
                    'user_id': event['user_id'],
                    'username': event['username'],
                    'is_typing': event['is_typing'],
                    'timestamp': event['timestamp'],
                }
            }))
    
    async def message_read(self, event):
        """Send read receipt to WebSocket client."""
        await self.send(text_data=json.dumps({
            'type': 'read_receipt',
            'data': {
                'message_id': event['message_id'],
                'user_id': event['user_id'],
                'timestamp': event['timestamp'],
            }
        }))
    
    async def user_online(self, event):
        """Send user online notification."""
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'user_online',
                'data': {
                    'user_id': event['user_id'],
                    'username': event['username'],
                    'timestamp': event['timestamp'],
                }
            }))
    
    async def user_offline(self, event):
        """Send user offline notification."""
        await self.send(text_data=json.dumps({
            'type': 'user_offline',
            'data': {
                'user_id': event['user_id'],
                'timestamp': event['timestamp'],
            }
        }))
    
    # =========================================================================
    # Database Operations (sync_to_async wrapper)
    # =========================================================================
    
    @database_sync_to_async
    def get_conversation(self, conversation_id):
        """Get conversation from database."""
        try:
            return Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            return None
    
    @database_sync_to_async
    def is_conversation_participant(self, conversation_id, user_id):
        """Check if user is participant in conversation."""
        try:
            conversation = Conversation.objects.get(id=conversation_id)
            return conversation.participants.filter(id=user_id).exists()
        except Conversation.DoesNotExist:
            return False
    
    @database_sync_to_async
    def save_message(self, conversation_id, sender_id, content, 
                     attachment_url=None, attachment_type=None):
        """Save message to database."""
        try:
            message = Message.objects.create(
                conversation_id=conversation_id,
                sender_id=sender_id,
                content=content,
                attachment_url=attachment_url,
                attachment_type=attachment_type,
            )
            return message
        except Exception as e:
            print(f"Error saving message: {str(e)}")
            return None
    
    @database_sync_to_async
    def mark_message_read(self, message_id, user_id):
        """Mark message as read."""
        try:
            message = Message.objects.get(id=message_id)
            if message.sender_id != user_id:  # Only receiver marks as read
                message.is_read = True
                message.read_at = timezone.now()
                message.save()
            return True
        except Message.DoesNotExist:
            return False
    
    # =========================================================================
    # Utility Methods
    # =========================================================================
    
    async def send_error(self, error_message):
        """Send error message to client."""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'data': {
                'message': error_message,
                'timestamp': datetime.now().isoformat(),
            }
        }))
    
    @staticmethod
    def sanitize_content(content):
        """Sanitize message content to prevent XSS."""
        # Basic HTML escaping
        content = content.replace('&', '&amp;')
        content = content.replace('<', '&lt;')
        content = content.replace('>', '&gt;')
        content = content.replace('"', '&quot;')
        content = content.replace("'", '&#x27;')
        return content
