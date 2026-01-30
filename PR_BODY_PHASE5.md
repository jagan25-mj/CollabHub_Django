Phase 5 — Core UX fixes, Interest flows, Unified Home & Explore

Summary:
- Fixed skill add/remove API mismatches (frontend ↔ backend)
- Fixed application submission by enforcing Opportunity-based applications (legacy `startup` payload still supported with validation)
- Introduced unified Home page with role-based rendering (/app/home)
- Added Explore Startups (/app/explore-startups) with talent/investor interest actions
- Implemented Interest model + APIs with founder notifications
- Added Startup Updates (founder posts → startup detail + home feed)
- Replaced blocking alert() with toast-based UX across app

Backend:
- New Interest model + migration
- New interest & updates endpoints
- Improved validation & permissions
- Query optimizations (select_related / prefetch_related)

Frontend:
- New `home.html` and `explore-startups.html`
- Updated `startup-detail`, `profile`, `network`, dashboards
- Non-blocking toast UX

Tests & CI:
- Added Django unit tests for applications, skills, interests
- CI workflow to run tests on push/PR

Follow-ups:
- Add more backend unit tests (edge cases)
- Add Playwright/Cypress E2E tests (stubs included)

Notes: migrations included (run `python manage.py migrate` before deploying).