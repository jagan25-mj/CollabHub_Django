# COLLABHUB VERIFICATION CHECKLIST

**Project:** CollabHub SaaS Platform  
**Version:** Production Ready v1.0  
**Date:** January 30, 2026

---

## 📋 PRE-DEPLOYMENT VERIFICATION

Complete this checklist BEFORE deploying to production.

### Phase 1: Code Quality ✅/❌

- [ ] No `alert()` statements in frontend code
  - Command: `grep -r "alert(" frontend/ --include="*.html" --include="*.js"`
  - Expected: No results
  
- [ ] No console.log() in production code
  - Command: `grep -r "console\.log" frontend/ --include="*.js" | grep -v "//"`
  - Expected: No results (except in comments)
  
- [ ] No hardcoded API URLs (all use environment variables)
  - Command: `grep -r "http://localhost" frontend/ --include="*.js"`
  - Expected: No results
  
- [ ] No database passwords in code
  - Command: `grep -r "PASSWORD\|password\|pwd" backend/ --include="*.py" | grep -v "#"`
  - Expected: No results with actual passwords
  
- [ ] No TODO/FIXME comments in critical files
  - Command: `grep -r "TODO\|FIXME" backend/ --include="*.py"`
  - Expected: Minimal or none in production code

### Phase 2: Security Settings ✅/❌

- [ ] DEBUG = False in production settings
  - Check: `/backend/collabhub/settings.py` line ~30
  - Command: `grep "DEBUG" backend/collabhub/settings.py`
  - Expected: `DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'`
  
- [ ] SECRET_KEY is environment-based (not hardcoded)
  - Check: `/backend/collabhub/settings.py` line ~32
  - Command: `grep "SECRET_KEY" backend/collabhub/settings.py | head -1`
  - Expected: `SECRET_KEY = os.getenv('SECRET_KEY')`
  
- [ ] CORS_ALLOW_ALL_ORIGINS = False
  - Check: `/backend/collabhub/settings.py` line ~120
  - Command: `grep "CORS_ALLOW_ALL_ORIGINS" backend/collabhub/settings.py`
  - Expected: `CORS_ALLOW_ALL_ORIGINS = False` OR not present (defaults to False)
  
- [ ] CORS_ALLOWED_ORIGINS is environment-based
  - Check: `/backend/collabhub/settings.py` line ~121
  - Command: `grep "CORS_ALLOWED_ORIGINS" backend/collabhub/settings.py`
  - Expected: `CORS_ALLOWED_ORIGINS = os.getenv(...)`
  
- [ ] ALLOWED_HOSTS is not '*' (wildcard)
  - Check: `/backend/collabhub/settings.py` line ~40
  - Command: `grep "ALLOWED_HOSTS" backend/collabhub/settings.py`
  - Expected: Should be environment-based or specific domains
  
- [ ] HTTPS settings configured (for production)
  - Check: `/backend/collabhub/settings.py` line ~200+
  - Expected: `SECURE_SSL_REDIRECT = True`, `SECURE_HSTS_SECONDS = 31536000`

### Phase 3: Database Integrity ✅/❌

- [ ] All migrations applied
  - Command: `python manage.py migrate --dry-run`
  - Expected: `No migrations to apply`
  
- [ ] Database schema validated
  - Command: `python manage.py migrate --check`
  - Expected: `All migrations have been applied`
  
- [ ] No orphaned records
  - Command: Run in Django shell:
    ```python
    from collaborations.models import Application
    # Check for applications with missing opportunities
    Application.objects.filter(opportunity__isnull=True).count()
    # Expected: 0
    ```
  
- [ ] Foreign key constraints intact
  - Command: Check database schema:
    ```sql
    -- For SQLite:
    PRAGMA foreign_keys = ON;
    SELECT * FROM sqlite_master WHERE type='table' AND name='collaborations_application';
    ```
  - Expected: See constraints for opportunity_id, applicant_id

### Phase 4: API Endpoints ✅/❌

Complete this with server running on localhost:8000

#### Authentication ✅/❌
- [ ] POST /api/v1/auth/register/ - Can register new user
  ```bash
  curl -X POST http://localhost:8000/api/v1/auth/register/ \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"TestPass123!","role":"talent","name":"Test User"}'
  ```
  - Expected: 201 status, returns tokens

- [ ] POST /api/v1/auth/login/ - Can login
  ```bash
  curl -X POST http://localhost:8000/api/v1/auth/login/ \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"TestPass123!"}'
  ```
  - Expected: 200 status, returns access token

- [ ] POST /api/v1/auth/logout/ - Can logout
  ```bash
  curl -X POST http://localhost:8000/api/v1/auth/logout/ \
    -H "Authorization: Bearer YOUR_TOKEN"
  ```
  - Expected: 200 status

#### Startups ✅/❌
- [ ] GET /api/v1/startups/ - List startups (paginated)
  - Expected: 200 status, returns paginated list with 10 items per page

- [ ] POST /api/v1/startups/ - Create startup (founder only)
  - Expected: 201 status (founder), 403 (non-founder)

- [ ] GET /api/v1/startups/my/ - List my startups
  - Expected: 200 status, returns only user's startups

- [ ] GET /api/v1/startups/{id}/ - View startup
  - Expected: 200 status, increments view_count

#### Opportunities ✅/❌
- [ ] GET /api/v1/opportunities/ - List opportunities (paginated)
  - Expected: 200 status

- [ ] GET /api/v1/opportunities/?search=tech - Search opportunities
  - Expected: 200 status, returns filtered results

- [ ] POST /api/v1/opportunities/ - Create opportunity (creator only)
  - Expected: 201 (creator), 403 (non-creator)

#### Collaborations ✅/❌
- [ ] POST /api/v1/collaborations/applications/ - Apply to opportunity
  - Expected: 201 status, increments opportunity.total_applications atomically

- [ ] GET /api/v1/collaborations/applications/{id}/accept/ - Accept application
  - Expected: 200 status

- [ ] POST /api/v1/collaborations/connections/ - Send connection request
  - Expected: 201 status, prevents duplicate/self-connection

### Phase 5: Frontend Functionality ✅/❌

#### Pages Load ✅/❌
- [ ] /app/login - Loads without errors
  - Check: No console errors
  - Check: Form submits successfully
  
- [ ] /app/register - Registration form works
  - Try: Create new account
  - Expected: Redirects to appropriate dashboard
  
- [ ] /app/dashboard-founder - Founder dashboard loads
  - Check: Shows startups list
  - Check: Shows pending applications count
  - Check: Empty state if no startups
  
- [ ] /app/dashboard-talent - Talent dashboard loads
  - Check: Shows saved startups
  - Check: Shows applications list
  
- [ ] /app/startups - Explore startups loads
  - Check: Shows startup list
  - Check: Search works
  - Check: Pagination works
  
- [ ] /app/profile - Profile page loads
  - Check: Can edit profile
  - Check: Can add skills
  
- [ ] /app/messages - Messages page loads
  - Expected: Either working or gracefully disabled

#### Error Handling ✅/❌
- [ ] All errors show toast notifications (not alert)
  - Test: Create startup with invalid data
  - Expected: Toast appears, not alert popup
  
- [ ] Failed API calls show helpful error messages
  - Test: Try operations without authentication
  - Expected: "Not authenticated" toast (not "404" or cryptic error)
  
- [ ] Network errors are handled
  - Test: Disable network, try to load data
  - Expected: "Network error" toast, not blank page
  
- [ ] Empty states show guidance
  - Test: Create new account with no startups
  - Expected: "Create your first startup" message and button
  
- [ ] Loading states show feedback
  - Test: Create startup or save opportunity
  - Expected: Button shows "Creating..." or spinner appears

#### Navigation ✅/❌
- [ ] Navbar appears on all pages identically
  - Check: Same logo, links, user menu on every page
  
- [ ] Navbar links work
  - Test: Click each link
  - Expected: Navigate to correct page
  
- [ ] Current page highlighted in navbar
  - Test: Navigate to each page
  - Expected: Active link is bold/highlighted
  
- [ ] User dropdown menu works
  - Test: Click user icon
  - Expected: Shows Dashboard, Profile, Logout options
  
- [ ] Logout works
  - Test: Click Logout
  - Expected: Redirects to login, tokens cleared from localStorage
  
- [ ] Role-based redirects work
  - Test: Login as talent, try to access founder dashboard
  - Expected: Redirected to talent dashboard
  
- [ ] Notification bell works
  - Expected: Shows notification count if unread > 0

### Phase 6: Data Accuracy ✅/❌

#### Counters are Accurate ✅/❌
- [ ] Application count increments correctly
  - Test: Create application, check startup.total_applications
  - Try with multiple concurrent requests
  - Expected: Count matches number of applications
  
- [ ] Connection count increments correctly
  - Test: Accept connection
  - Expected: Both users' total_connections increases by 1
  
- [ ] View count increments
  - Test: View startup multiple times
  - Expected: view_count increases

#### No Duplicate Records ✅/❌
- [ ] Can't apply twice to same opportunity
  - Test: Try to apply twice
  - Expected: Error "You've already applied to this opportunity"
  
- [ ] Can't save same startup twice
  - Test: Try to save same startup twice
  - Expected: Error or gracefully handled
  
- [ ] Can't connect to same person twice
  - Test: Try to connect to same person twice
  - Expected: Error "You're already connected"

#### Data Consistency ✅/❌
- [ ] Dashboard data matches database
  - Test: Create startup, check dashboard immediately
  - Expected: New startup appears within 2 seconds
  
- [ ] Data persists after page refresh
  - Test: Create application, refresh page
  - Expected: Application still there
  
- [ ] No stale data after navigation
  - Test: Create startup, navigate away, return
  - Expected: New startup visible
  
- [ ] Permission checks are enforced
  - Test: Try to edit someone else's startup (use different user)
  - Expected: 403 Forbidden error

### Phase 7: Performance ✅/❌

- [ ] Pages load in < 2 seconds
  - Test: Measure with Network tab
  - Check: homepage, dashboard, startup list
  
- [ ] No N+1 queries
  - Test: Run Django debug toolbar
  - Expected: Startup list page doesn't do 1 + n queries
  
- [ ] Pagination works
  - Test: Go to page 2 of startup list
  - Expected: Shows items 11-20
  
- [ ] Search completes in < 1 second
  - Test: Search for "tech"
  - Expected: Results appear quickly
  
- [ ] Buttons respond immediately
  - Test: Click save/create buttons
  - Expected: Immediate feedback (loading state)

### Phase 8: Production Environment ✅/❌

- [ ] .env file exists with all variables set
  - Check: `/backend/.env` exists
  - Required vars: DEBUG, SECRET_KEY, ALLOWED_HOSTS, CORS_ALLOWED_ORIGINS
  
- [ ] .env is in .gitignore
  - Command: `grep ".env" .gitignore`
  - Expected: `.env` is listed
  
- [ ] No .env checked into git
  - Command: `git ls-files | grep .env`
  - Expected: No results
  
- [ ] Static files are collected
  - Command: `python manage.py collectstatic --dry-run --noinput`
  - Expected: No errors
  
- [ ] Database backups exist
  - Check: Backup system configured
  - Expected: Daily backups stored
  
- [ ] Logging is configured
  - Check: `/backend/collabhub/settings.py` for LOGGING
  - Expected: Logs file location specified

### Phase 9: Security Audit ✅/❌

- [ ] CORS headers are restrictive
  - Test: Try request from different origin
  - Expected: Request blocked or CORS error
  
- [ ] CSRF protection enabled
  - Check: `MIDDLEWARE` includes `CsrfViewMiddleware`
  - Expected: Yes
  
- [ ] Passwords are hashed
  - Test: Check database user table
  - Expected: No plaintext passwords
  
- [ ] Tokens can't be exposed in URLs
  - Test: Check API calls
  - Expected: Tokens in headers, not query params
  
- [ ] Rate limiting is configured
  - Command: `grep -i "throttle\|ratelimit" backend/collabhub/settings.py`
  - Expected: Throttle classes configured
  
- [ ] Admin panel is hidden from public
  - Test: Visit /admin without auth
  - Expected: 403 or login required
  
- [ ] SQL injection is prevented
  - Check: Using ORM (not raw SQL)
  - Expected: All queries use Django ORM

### Phase 10: Testing ✅/❌

- [ ] All unit tests pass
  - Command: `python manage.py test`
  - Expected: 14/14 tests pass, no failures
  
- [ ] All integration tests pass
  - Test: Go through complete user flows
  - Expected: No errors
  
- [ ] Edge cases handled
  - Test: Empty search results, network timeout, invalid input
  - Expected: Graceful handling

---

## 🚀 DEPLOYMENT CHECKLIST

Before flipping the switch to production:

### Pre-Deployment ✅/❌

- [ ] All above checks (Phase 1-10) pass ✅
- [ ] Database backed up
- [ ] Static files collected and uploaded
- [ ] .env file with production values created
- [ ] SSL certificate installed
- [ ] Domain DNS configured
- [ ] Email service configured (if needed)
- [ ] Monitoring and logging set up
- [ ] Error tracking (Sentry) configured
- [ ] CDN configured (if needed)
- [ ] Backup system tested
- [ ] Disaster recovery plan documented

### Deployment ✅/❌

- [ ] Code deployed to production server
- [ ] Environment variables set correctly
- [ ] Database migrations run
- [ ] Static files served correctly
- [ ] HTTPS redirect working
- [ ] All pages load
- [ ] Authentication works
- [ ] Create/Read/Update/Delete operations work

### Post-Deployment ✅/❌

- [ ] Monitor error logs for 24 hours
- [ ] Check performance metrics
- [ ] Verify all features working
- [ ] Monitor database backups running
- [ ] Set up alerts for critical errors
- [ ] Announce to stakeholders

---

## 📊 Fixes Status

| Fix # | Title | Priority | Status | Time | Verified |
|-------|-------|----------|--------|------|----------|
| 1 | Replace alert() with toast | 🔴 | ⬜ | 30m | ❌ |
| 2 | Race conditions → F() | 🔴 | ⬜ | 20m | ❌ |
| 3 | FTS SQLite fallback | 🔴 | ⬜ | 45m | ❌ |
| 4 | Security settings | 🔴 | ⬜ | 15m | ❌ |
| 5 | Empty states | 🟠 | ⬜ | 2-3h | ❌ |
| 6 | Loading states | 🟠 | ⬜ | 1-2h | ❌ |
| 7 | Page refresh logic | 🟠 | ⬜ | 30m | ❌ |
| 8 | Navbar component | 🟠 | ⬜ | 2-3h | ❌ |

---

## 📞 Contact & Support

**If deployment checklist fails:**

1. Check [PRODUCTION_AUDIT_REPORT.md](./PRODUCTION_AUDIT_REPORT.md) for issue details
2. Review [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for specific fixes
3. Run specific tests listed in Phase 1-10 above
4. Check error logs for exact failure reasons
5. Rollback if needed: `git revert HEAD`

**Quick Commands:**

```bash
# Run all checks
python manage.py check
python manage.py check --deploy
python manage.py test
python manage.py migrate --check

# Check frontend for issues
grep -r "alert(" frontend/ --include="*.js" --include="*.html"
grep -r "console\.log" frontend/ --include="*.js"

# Check settings
grep "DEBUG\|SECRET_KEY\|CORS\|ALLOWED_HOSTS" backend/collabhub/settings.py
```

---

**Verification Status:** ⏳ NOT YET VERIFIED (Awaiting fixes to be implemented)  
**Last Updated:** January 30, 2026  
**Next Review:** After all fixes implemented

