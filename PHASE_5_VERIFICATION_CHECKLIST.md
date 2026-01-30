# Phase 5 Verification Checklist
## Complete System Validation Before Production Deployment

**Phase:** 5 - Advanced Features, Scaling & Intelligence  
**Status:** ✅ Ready for Verification  
**Date:** Implementation Complete  
**Checklist Version:** 1.0

---

## Pre-Deployment Validation (30 minutes)

### 1. Code Quality Checks ✓

- [ ] **All files present**
  ```bash
  find recommendations/ -name "*.py" | sort
  # Should show: models.py, views.py, services.py, tasks.py, etc.
  ```

- [ ] **No syntax errors**
  ```bash
  python -m py_compile recommendations/*.py
  python -m py_compile collabhub/health.py
  python -m py_compile collabhub/middleware.py
  python -m py_compile startups/search.py
  # Should complete without errors
  ```

- [ ] **Imports working**
  ```bash
  python manage.py shell << EOF
  from recommendations.models import ActivityEvent, Feed
  from recommendations.services import RecommendationService
  from recommendations.tasks import TaskQueue
  from recommendations.views import recommendations_view
  from collabhub.health import health_check
  from collabhub.middleware import RequestIdMiddleware
  from startups.search import search_startups
  print("✓ All imports successful")
  EOF
  ```

- [ ] **Settings valid**
  ```bash
  python manage.py check
  # Output: "System check identified no issues"
  ```

---

### 2. Database Migrations ✓

- [ ] **Migrations created**
  ```bash
  ls -la recommendations/migrations/
  # Should show: 0001_initial.py, __init__.py
  ```

- [ ] **Migration file valid**
  ```bash
  python manage.py sqlmigrate recommendations 0001
  # Should show CREATE TABLE statements
  ```

- [ ] **Migrations apply cleanly**
  ```bash
  python manage.py migrate recommendations --plan
  # Should show "recommendations | 0001_initial | Create model ActivityEvent"
  ```

- [ ] **No duplicate migrations**
  ```bash
  ls recommendations/migrations/ | grep "\.py$" | wc -l
  # Should be: 2 (0001_initial.py and __init__.py)
  ```

---

### 3. Configuration Validation ✓

- [ ] **Redis detection working**
  ```bash
  python manage.py shell << EOF
  from django.conf import settings
  print(f"Redis available: {settings.REDIS_AVAILABLE}")
  print(f"Cache backend: {settings.CACHES['default']['BACKEND']}")
  EOF
  ```

- [ ] **Channel layers configured**
  ```bash
  python manage.py shell << EOF
  from django.conf import settings
  print(f"Channels backend: {settings.CHANNEL_LAYERS['default']['BACKEND']}")
  EOF
  ```

- [ ] **Logging config valid**
  ```bash
  python manage.py shell << EOF
  import logging
  logger = logging.getLogger('collabhub')
  logger.info("Test log entry")
  # Should appear in logs/collabhub.log
  EOF
  ```

- [ ] **Cache TTLs defined**
  ```bash
  python manage.py shell << EOF
  from django.conf import settings
  print(f"CACHE_TTL keys: {list(settings.CACHE_TTL.keys())}")
  # Should show: STARTUP_LIST, RECOMMENDATIONS, USER_PROFILE, etc.
  EOF
  ```

---

## Deployment (30 minutes)

### 4. Safe Deployment Steps ✓

- [ ] **Backup database**
  ```bash
  # PostgreSQL
  pg_dump collabhub_db > backup_$(date +%Y%m%d_%H%M%S).sql
  
  # SQLite
  cp db.sqlite3 db.sqlite3.backup
  ```

- [ ] **Backup Redis (if using)**
  ```bash
  redis-cli BGSAVE
  ```

- [ ] **Run migrations**
  ```bash
  python manage.py migrate recommendations
  # Output: "Applying recommendations.0001_initial... OK"
  ```

- [ ] **Verify migrations applied**
  ```bash
  python manage.py showmigrations recommendations
  # Output: "recommendations.0001_initial ✓"
  ```

- [ ] **Restart application**
  ```bash
  # Development
  Ctrl+C in Django runserver, then restart
  
  # Production
  systemctl restart collabhub
  # or: supervisorctl restart collabhub
  # or: docker restart collabhub
  ```

- [ ] **Verify startup**
  ```bash
  # Check logs
  tail -f logs/collabhub.log
  # Should NOT show errors
  ```

---

## Post-Deployment Testing (45 minutes)

### 5. Endpoint Testing ✓

**Health Checks:**
```bash
# /health/ endpoint
curl http://localhost:8000/health/ -s | jq .
# Expected: { "status": "healthy", "checks": {...} }

# /metrics/ endpoint  
curl http://localhost:8000/metrics/ -s | jq .
# Expected: { "users": N, "startups": N, ... }

# /live/ endpoint
curl http://localhost:8000/live/ -s | jq .
# Expected: { "status": "alive" }

# /ready/ endpoint
curl http://localhost:8000/ready/ -s | jq .
# Expected: { "status": "ready" } or 503 if DB down
```

**API Authentication Needed:**
```bash
# Get auth token (adjust based on your auth method)
TOKEN="your_jwt_token_here"

# Recommendations endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/recommendations/ -s | jq .
# Expected: { "type": "...", "recommendations": [...] }

# Feed endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/feed/ -s | jq .
# Expected: { "count": N, "results": [...] }

# User activity endpoint
curl http://localhost:8000/api/v1/users/1/activity/ -s | jq .
# Expected: { "count": N, "results": [...] }

# Search endpoint (existing, now with compatibility layer)
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:8000/api/v1/startups/?search=test' -s | jq .
# Expected: List of startups matching search
```

---

### 6. Feature Testing ✓

**Recommendations:**
- [ ] Recommendations return results
- [ ] Results are role-appropriate (talent vs founder vs investor)
- [ ] Results are cached (check /metrics/ for cache hits)
- [ ] Different users get different recommendations

**Activity Feed:**
- [ ] Feed loads without errors
- [ ] Pagination works (page=2 returns different items)
- [ ] Items are in reverse-chrono order (newest first)
- [ ] Activity events are created when users perform actions

**Search:**
- [ ] Search works with simple queries (e.g., "startup")
- [ ] Fuzzy matching works (e.g., "starup" finds "startup")
- [ ] Results are ranked appropriately
- [ ] Search works on both PostgreSQL and SQLite

**Health Checks:**
- [ ] /health/ returns "healthy" status
- [ ] /live/ always returns 200 (livenessProbe)
- [ ] /ready/ returns 200 when DB accessible
- [ ] Checks fail gracefully when services down

---

### 7. Database Integrity ✓

**Check tables exist:**
```bash
python manage.py dbshell << EOF
# SQLite
SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'recommendations_%';
# PostgreSQL
SELECT tablename FROM pg_tables WHERE tablename LIKE 'recommendations_%';
EOF

# Expected output:
# recommendations_activityevent
# recommendations_feed
```

**Check indexes created:**
```bash
python manage.py dbshell << EOF
# SQLite
SELECT name FROM sqlite_master WHERE type='index' AND name LIKE '%activity%';
# PostgreSQL
SELECT indexname FROM pg_indexes WHERE tablename='recommendations_activityevent';
EOF

# Expected: At least 3 indexes on ActivityEvent table
```

**Check foreign keys:**
```bash
python manage.py shell << EOF
from recommendations.models import ActivityEvent, Feed
from django.contrib.auth import get_user_model

User = get_user_model()
# Try creating event (FK validation)
user = User.objects.first()
if user:
    event = ActivityEvent.create_event(
        actor=user,
        action_type='profile_updated',
        description='Test'
    )
    print(f"✓ Event created: {event.id}")
EOF
```

---

### 8. Logging Validation ✓

**Check log files created:**
```bash
ls -la logs/
# Expected:
# -rw-r--r-- 1 user user 0 ... collabhub.log
# -rw-r--r-- 1 user user 0 ... error.log
```

**Check JSON logging working:**
```bash
# Make a request to generate log
curl http://localhost:8000/api/v1/feed/ >/dev/null 2>&1

# Check log entry
tail -5 logs/collabhub.log | jq .
# Expected: JSON entries with timestamp, request_id, status_code, etc.
```

**Check request IDs in logs:**
```bash
# Make multiple requests
curl -s http://localhost:8000/api/v1/feed/ > /dev/null
curl -s http://localhost:8000/api/v1/recommendations/ > /dev/null

# Check all have request_id
jq '.request_id' logs/collabhub.log | tail -5
# Expected: UUIDs, one per request
```

---

### 9. Redis Testing (if enabled) ✓

**Verify Redis connection:**
```bash
redis-cli ping
# Expected: PONG

redis-cli -n 1 KEYS "collabhub:*"
# Expected: List of cache keys
```

**Check cache operations:**
```bash
python manage.py shell << EOF
from django.core.cache import cache

# Set
cache.set('test_key', 'test_value', 60)

# Get
value = cache.get('test_key')
print(f"✓ Cache working: {value}")

# Verify in Redis
import redis
r = redis.Redis(db=1)
print(f"✓ Redis key: {r.get('collabhub:test_key')}")
EOF
```

**Check cache TTLs:**
```bash
python manage.py shell << EOF
from django.core.cache import cache
from django.conf import settings
import time

# Set with TTL
cache.set('ttl_test', 'value', 5)

# Check TTL
import redis
r = redis.Redis(db=1)
ttl = r.ttl('collabhub:ttl_test')
print(f"✓ Cache TTL: {ttl} seconds (expected: ~5)")
EOF
```

---

### 10. Async Tasks Testing ✓

**Task queue working:**
```bash
python manage.py shell << EOF
from recommendations.tasks import task_queue, notify_user
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.first()

if user:
    # Queue notification
    notify_user(user.id, 'Test', 'Test message')
    
    # Check queue
    print(f"✓ Tasks queued: {task_queue.queue.qsize()}")
    
    # Give background worker time to process
    import time
    time.sleep(1)
    
    print(f"✓ Tasks processed: {task_queue.queue.qsize()}")
EOF
```

---

### 11. Concurrent Operations ✓

**Test multiple simultaneous operations:**
```bash
# In one terminal
python manage.py shell

# Python code:
import threading
from recommendations.services import RecommendationService
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.first()

def get_recs():
    result = RecommendationService.get_startup_recommendations_for_talent(user)
    print(f"✓ Got {len(result)} recommendations")

# Create 5 concurrent threads
threads = [threading.Thread(target=get_recs) for _ in range(5)]
for t in threads:
    t.start()
for t in threads:
    t.join()

print("✓ All threads completed successfully")
```

---

### 12. Error Handling ✓

**Test error scenarios:**
```bash
python manage.py shell << EOF
from recommendations.models import ActivityEvent
from django.contrib.auth import get_user_model

User = get_user_model()

# Test with non-existent user
try:
    event = ActivityEvent.create_event(
        actor_id=999999,  # Non-existent
        action_type='test',
        description='test'
    )
    print("✓ Error handling working (graceful failure)")
except Exception as e:
    print(f"✓ Error caught: {e}")

# Test with invalid content type
event = ActivityEvent.create_event(
    actor=User.objects.first(),
    action_type='test',
    description='test'
)
print(f"✓ Event created without content_object: {event.id}")
EOF
```

---

## Performance Validation (20 minutes)

### 13. Performance Metrics ✓

**Response time benchmarks:**
```bash
# Install Apache Bench
apt-get install apache2-utils

# Test recommendations endpoint (100 requests)
ab -n 100 -c 10 -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/recommendations/

# Expected:
# Requests per second: >10
# Failed requests: 0
# Longest request: <1000ms
```

**Cache hit rate:**
```bash
# Make same request 10 times
for i in {1..10}; do
  curl -s -H "Authorization: Bearer $TOKEN" \
    http://localhost:8000/api/v1/recommendations/ | jq -r '.recommendations | length'
  sleep 0.5
done

# All should return same number (cache hit)
```

**Database query count:**
```bash
# Enable Django query logging
python manage.py shell << EOF
from django.conf import settings
from django.db import reset_queries
settings.DEBUG = True

from recommendations.views import activity_feed_view
from django.test import RequestFactory

factory = RequestFactory()
request = factory.get('/api/v1/feed/')
request.user = User.objects.first()

from django.db import connection
connection.queries_log.clear()

response = activity_feed_view(request)

print(f"✓ Queries executed: {len(connection.queries)}")
for q in connection.queries:
    print(f"  - {q['sql'][:80]}...")
EOF

# Expected: <10 queries for paginated feed
```

---

## Regression Testing (30 minutes)

### 14. Existing Functionality ✓

**Verify no breaking changes:**
```bash
# Test existing endpoints still work
TOKEN="your_jwt_token"

# Users API
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/users/ -s | jq '.count'

# Startups API
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/startups/ -s | jq '.count'

# Opportunities API
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/opportunities/ -s | jq '.count'

# Collaborations API
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/collaborations/ -s | jq '.count'

# All should return valid responses
```

**Check authentication still works:**
```bash
# Without token (should fail)
curl http://localhost:8000/api/v1/recommendations/ -s | jq '.detail'
# Expected: "Authentication credentials were not provided" or similar

# With invalid token (should fail)
curl -H "Authorization: Bearer invalid_token" \
  http://localhost:8000/api/v1/recommendations/ -s | jq '.detail'
# Expected: Error message

# With valid token (should succeed)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/recommendations/ -s | jq '.type'
# Expected: User role (talent, founder, investor, etc.)
```

---

## Test Suite Execution (20 minutes)

### 15. Run Full Test Suite ✓

```bash
# Run all recommendation tests
python manage.py test recommendations -v 2

# Expected output:
# test_create_activity_event ... ok
# test_feed_creation ... ok
# test_get_activity_feed ... ok
# test_get_recommendations ... ok
# test_health_check ... ok
# ...
# Ran N tests in X.XXXs
# OK
```

**Test with coverage:**
```bash
# Install coverage
pip install coverage

# Run with coverage
coverage run --source='recommendations' manage.py test recommendations
coverage report

# Expected:
# Name                         Stmts   Miss  Cover
# ------------------------------------------------
# recommendations/__init__        0      0   100%
# recommendations/admin.py       15      0   100%
# recommendations/models.py      50      2    96%
# recommendations/services.py   100      5    95%
# recommendations/views.py       80      3    96%
# ...
```

---

## Rollback Plan (if needed)

### 16. Emergency Rollback ✓

**If deployment fails:**
```bash
# Step 1: Identify issue
tail -f logs/error.log

# Step 2: Revert code
git revert HEAD

# Step 3: Rollback migration
python manage.py migrate recommendations zero

# Step 4: Restart
systemctl restart collabhub

# Step 5: Verify
curl http://localhost:8000/health/
```

**Restore from backup:**
```bash
# PostgreSQL
psql collabhub_db < backup_20240115_100000.sql

# SQLite
cp db.sqlite3.backup db.sqlite3

# Redis (if using)
redis-cli CONFIG SET save ""
redis-cli BGREWRITEAOF
```

---

## Success Criteria

### All Tests Pass

- [ ] **Status Code:** All endpoints return expected HTTP status codes
- [ ] **Response Format:** All responses are valid JSON
- [ ] **Data Integrity:** No data corruption or loss
- [ ] **Performance:** All endpoints respond within SLA (p95 < 1s)
- [ ] **Error Handling:** Errors logged, don't crash system
- [ ] **Backward Compatibility:** Existing features unchanged
- [ ] **Security:** No new vulnerabilities introduced

### Metrics

- [ ] **Error Rate:** < 0.1% (1 error per 1000 requests)
- [ ] **Cache Hit Rate:** > 70%
- [ ] **Availability:** 99.9%+
- [ ] **Response Time (p95):** < 1000ms
- [ ] **Database Connections:** < 50% pool utilized

---

## Sign-Off

**Phase 5 Verification Checklist - COMPLETE**

- [ ] All technical checks passed
- [ ] All feature tests passed
- [ ] All performance tests met SLA
- [ ] Rollback plan verified
- [ ] Documentation complete
- [ ] Team approved for production

**Verified By:**
```
Name: _____________________
Date: _____________________
Signature: _________________
```

**Approved For Production:**
```
Name: _____________________
Date: _____________________
Signature: _________________
```

---

## Notes & Observations

(Space for team notes after testing)

```
_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
```

---

**Last Updated:** Phase 5 Complete  
**Next Review:** After production deployment  
**Maintenance:** Monthly verification recommended
