Playwright/Cypress tests (stub)

This folder contains E2E test stubs for the Phase 5 flows. To run these locally:

1. Install node and the test runner of your choice (Playwright recommended):
   - npm init -y
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