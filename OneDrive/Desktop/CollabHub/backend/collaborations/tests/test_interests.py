from django.test import TestCase
from rest_framework.test import APIClient
from users.models import get_user_model
from startups.models import Startup
from collaborations.models import Interest, Notification

User = get_user_model()


class InterestFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.talent = User.objects.create_user(username='talent', email='t@example.com', password='pass', role='talent')
        self.investor = User.objects.create_user(username='inv', email='i@example.com', password='pass', role='investor')
        self.founder = User.objects.create_user(username='founder', email='f@example.com', password='pass', role='founder')
        self.startup = Startup.objects.create(name='NotifyCo', industry='saas', founder=self.founder, description='x')

    def test_talent_can_express_interest_and_founder_notified(self):
        self.client.force_authenticate(self.talent)
        res = self.client.post(f'/api/v1/startups/{self.startup.id}/interest/', {'message': 'I\'d love to help'}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertTrue(Interest.objects.filter(user=self.talent, startup=self.startup, type='talent').exists())
        # Notification created for founder
        self.assertTrue(Notification.objects.filter(user=self.founder, related_user=self.talent).exists())

    def test_investor_interest_unique_constraint(self):
        self.client.force_authenticate(self.investor)
        url = f'/api/v1/startups/{self.startup.id}/investor-interest/'
        res1 = self.client.post(url, {'message': 'Interested'}, format='json')
        self.assertEqual(res1.status_code, 201)
        res2 = self.client.post(url, {'message': 'Still interested'}, format='json')
        # second attempt should fail due to unique constraint
        self.assertIn(res2.status_code, (400, 409))
