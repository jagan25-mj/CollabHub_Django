from django.test import TestCase
from rest_framework.test import APIClient
from django.urls import reverse
from users.models import get_user_model
from startups.models import Startup
from opportunities.models import Opportunity
from collaborations.models import Application

User = get_user_model()


class ApplicationCreationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.applicant = User.objects.create_user(username='applicant', email='a@example.com', password='pass')
        self.founder = User.objects.create_user(username='founder', email='f@example.com', password='pass')

        # Startup and opportunities
        self.startup = Startup.objects.create(name='Acme', industry='tech', founder=self.founder, description='x')
        self.opp_single = Opportunity.objects.create(startup=self.startup, title='Single', type='internship', status='open')
        self.opp_other = Opportunity.objects.create(startup=self.startup, title='Other', type='internship', status='open')

        self.client.force_authenticate(self.applicant)

    def test_apply_with_opportunity_succeeds(self):
        url = reverse('application_list')
        payload = {'opportunity': self.opp_single.id, 'cover_letter': 'hello'}
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertTrue(Application.objects.filter(applicant=self.applicant, opportunity=self.opp_single).exists())

    def test_apply_with_startup_single_opportunity_legacy_payload(self):
        # create a new startup with only one open opportunity
        s = Startup.objects.create(name='Solo', industry='tech', founder=self.founder, description='x')
        o = Opportunity.objects.create(startup=s, title='Only', type='job', status='open')
        url = reverse('application_list')
        res = self.client.post(url, {'startup': s.id, 'cover_letter': 'hi'}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertTrue(Application.objects.filter(applicant=self.applicant, opportunity=o).exists())

    def test_apply_with_startup_multiple_opps_returns_400(self):
        url = reverse('application_list')
        # startup created in setUp has two open opportunities
        res = self.client.post(url, {'startup': self.startup.id, 'cover_letter': 'hi'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('startup', res.data)
