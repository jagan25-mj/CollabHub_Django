Playwright E2E — CollabHub (phase 5)

Quickstart (local):

1. Start backend (in project root):
   cd OneDrive/Desktop/CollabHub/backend
   python -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py runserver

2. In a separate terminal run:
   cd OneDrive/Desktop/CollabHub/frontend/e2e
   npm ci
   npx playwright install
   npm run test:e2e
   - npm i -D @playwright/test
   - npx playwright install

2. Add a script to package.json:
   "test:e2e": "playwright test"

3. Start the Django dev server (run migrations + create test users/data) and run:
   npm run test:e2e

Suggested tests (already stubbed here):
- profile.spec.ts -> add/remove skill
- startup.spec.ts -> apply to opportunity, express interest, post update

I can add concrete Playwright tests in a follow-up once you confirm the preferred runner.