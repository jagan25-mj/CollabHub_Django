# Generated migration: add Interest model
from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings

class Migration(migrations.Migration):

    initial = False

    dependencies = [
        ('collaborations', '0003_application_application_applica_737f06_idx_and_more'),
        ('startups', '0003_opportunity_opportuniti_created_d4611f_idx_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Interest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('type', models.CharField(choices=[('talent', 'Talent Interest'), ('investor', 'Investor Interest')], max_length=20)),
                ('message', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('startup', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='interests', to='startups.startup')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='interests', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'interests', 'ordering': ['-created_at']},
        ),
        migrations.AddIndex(
            model_name='interest',
            index=models.Index(fields=['startup', '-created_at'], name='collab_interest_startu_3b1c4b_idx'),
        ),
        migrations.AddIndex(
            model_name='interest',
            index=models.Index(fields=['user', '-created_at'], name='collab_interest_user__3f2d9b_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='interest',
            unique_together={('user', 'startup', 'type')},
        ),
    ]
