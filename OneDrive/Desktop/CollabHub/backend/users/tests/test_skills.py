from django.test import TestCase
from rest_framework.test import APIClient
from users.models import get_user_model, Skill, UserSkill

User = get_user_model()


class UserSkillsAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='bob', email='b@example.com', password='pass')
        self.client.force_authenticate(self.user)
        self.skill = Skill.objects.create(name='Django', category='framework')

    def test_add_skill_by_id(self):
        res = self.client.post('/api/v1/users/me/skills/', {'skill_id': self.skill.id, 'proficiency': 'advanced'}, format='json')
        self.assertIn(res.status_code, (200, 201))
        self.assertTrue(UserSkill.objects.filter(user=self.user, skill=self.skill).exists())

    def test_add_skill_by_name_creates_skill(self):
        res = self.client.post('/api/v1/users/me/skills/', {'name': 'FastAPI', 'proficiency': 'intermediate'}, format='json')
        self.assertIn(res.status_code, (200, 201))
        self.assertTrue(Skill.objects.filter(name__iexact='FastAPI').exists())

    def test_delete_user_skill_detail(self):
        us = UserSkill.objects.create(user=self.user, skill=self.skill, proficiency='beginner')
        res = self.client.delete(f'/api/v1/users/me/skills/{us.id}/')
        self.assertEqual(res.status_code, 204)
        self.assertFalse(UserSkill.objects.filter(id=us.id).exists())
