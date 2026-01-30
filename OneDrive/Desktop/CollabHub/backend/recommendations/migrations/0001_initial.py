"""
Initial migration for recommendations app
"""

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('contenttypes', '0002_remove_content_type_name'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ActivityEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action_type', models.CharField(choices=[('startup_created', 'Startup Created'), ('startup_updated', 'Startup Updated'), ('opportunity_created', 'Opportunity Posted'), ('opportunity_updated', 'Opportunity Updated'), ('application_submitted', 'Application Submitted'), ('application_accepted', 'Application Accepted'), ('startup_saved', 'Startup Saved'), ('startup_followed', 'Startup Followed'), ('investor_interest', 'Investor Interest Shown'), ('connection_made', 'Connection Made'), ('update_posted', 'Update Posted'), ('message_sent', 'Message Sent')], db_index=True, max_length=30)),
                ('object_id', models.PositiveIntegerField()),
                ('description', models.TextField(blank=True, help_text='Human-readable description of the action')),
                ('is_public', models.BooleanField(default=True, help_text='Whether this event should appear in public feeds')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('actor', models.ForeignKey(help_text='User who performed the action', on_delete=django.db.models.deletion.CASCADE, related_name='activity_events', to=settings.AUTH_USER_MODEL)),
                ('content_type', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='contenttypes.contenttype')),
            ],
            options={
                'verbose_name_plural': 'Activity Events',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='Feed',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('last_activity_id', models.BigIntegerField(default=0, help_text='ID of the last activity the user saw')),
                ('last_updated', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='feed', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name_plural': 'Feeds',
            },
        ),
        migrations.AddIndex(
            model_name='activityevent',
            index=models.Index(fields=['-created_at'], name='recommendations_activityevent_created_at_idx'),
        ),
        migrations.AddIndex(
            model_name='activityevent',
            index=models.Index(fields=['actor', '-created_at'], name='recommendations_activityevent_actor_created_at_idx'),
        ),
        migrations.AddIndex(
            model_name='activityevent',
            index=models.Index(fields=['action_type', '-created_at'], name='recommendations_activityevent_action_type_created_at_idx'),
        ),
    ]
