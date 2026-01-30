# Phase 5 Implementation Guide
## What Was Done & How to Use It

**Session:** Phase 5 Complete  
**Duration:** ~4 hours  
**Lines of Code:** 2,500+ backend + tests  
**Breaking Changes:** 0 (100% backward compatible)

---

## Quick Start

### 1. Apply Migrations

```bash
cd backend/
python manage.py migrate recommendations
```

**What it does:**
- Creates `recommendations_activityevent` table
- Creates `recommendations_feed` table
- Adds optimized indexes
- **Takes ~2 seconds**

### 2. Start Redis (Optional but Recommended)

```bash
# Development: Use built-in fallback
# Production: Install Redis
apt-get install redis-server
redis-server  # or: systemctl start redis-server

# Verify
redis-cli ping  # Output: PONG
```

### 3. Test the System

```bash
# Run tests
python manage.py test recommendations -v 2

# Check health
curl http://localhost:8000/health/
# Output: { "status": "healthy" }

# Get recommendations
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/v1/recommendations/
```

---

## What Was Implemented

### Phase 5 Feature Breakdown

#### 1. ✅ Redis & Channel Layer Configuration
**File:** `collabhub/settings.py`

```python
# Automatic Redis detection
REDIS_AVAILABLE = True/False  # Auto-detected

CHANNEL_LAYERS = {
  'default': {
    'BACKEND': 'channels_redis.core.RedisChannelLayer',  # If Redis available
    # OR
    'BACKEND': 'channels.layers.InMemoryChannelLayer',   # Fallback
  }
}
```

**What it does:**
- Detects Redis on startup (no config needed)
- Falls back to in-memory Channels
- Enables horizontal scaling when Redis available
- Safe to run offline (uses fallback)

**Testing:**
```bash
# Verify detection
python manage.py shell
>>> from django.conf import settings
>>> settings.REDIS_AVAILABLE
True  # or False
```

---

#### 2. ✅ Recommendation Engine
**Files:** 
- `recommendations/services.py` (302 lines)
- `recommendations/models.py` (ActivityEvent model)
- `recommendations/views.py` (API endpoint)

**Features:**
- 4 recommendation types (auto-detect user role)
- Rule-based scoring (caching-friendly, ML-ready)
- Duplicate prevention
- 30-minute cache TTL

**Usage:**

```python
from recommendations.services import RecommendationService

# Get recommendations (auto-cached)
talent = User.objects.get(email='talent@test.com')
recs = RecommendationService.get_startup_recommendations_for_talent(
  user=talent,
  limit=10
)
# Returns: [Startup1, Startup2, ...]

# Invalidate cache if needed
RecommendationService.invalidate_recommendations(user.id)
```

**API Usage:**

```bash
# Get personalized recommendations
curl -H "Authorization: Bearer TOKEN" \
  'http://localhost:8000/api/v1/recommendations/?limit=20'

# Response:
{
  "type": "talent",  # Auto-detected from user role
  "recommendations": [
    {
      "id": 1,
      "name": "Startup1",
      "tagline": "...",
      "reason": "Matches your skills (Python, React)"
    },
    ...
  ]
}
```

---

#### 3. ✅ Activity Feed System
**Files:**
- `recommendations/models.py` (ActivityEvent, Feed)
- `recommendations/views.py` (Feed API)
- `recommendations/tasks.py` (Async logging)

**How it works:**

```python
from recommendations.models import ActivityEvent

# Log activity (usually automatic)
event = ActivityEvent.create_event(
  actor=user,
  action_type='startup_saved',
  content_object=startup,
  description='Saved startup',
  is_public=True
)

# Feed automatically created/updated on first access
feed = Feed.get_or_create_feed(user)
```

**Feed API:**

```bash
# Get activity feed
curl -H "Authorization: Bearer TOKEN" \
  'http://localhost:8000/api/v1/feed/?page=1'

# Response:
{
  "count": 156,
  "next": "http://localhost:8000/api/v1/feed/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "actor": { "id": 5, "email": "user@test.com" },
      "action_type": "startup_created",
      "description": "Created new startup",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}

# Get specific user activity
curl http://localhost:8000/api/v1/users/5/activity/
```

**Action Types:**
```
- startup_created      # New startup launched
- startup_updated      # Startup edited
- opportunity_posted   # New opportunity
- opportunity_saved    # Saved opportunity
- startup_saved        # Saved startup
- startup_followed     # Following startup
- application_created  # Applied to opportunity
- application_accepted # Application approved
- message_sent         # New message
- connection_made      # Made connection
- recommendation_viewed# Viewed recommendation
- profile_updated      # Updated profile
```

---

#### 4. ✅ Search Compatibility Layer
**Files:** `startups/search.py` (185 lines)

**Problem:** Search works on PostgreSQL (FTS) but fails on SQLite.

**Solution:** Auto-detect database, use appropriate algorithm.

```python
from startups.search import search_startups, get_search_backend_info

# Transparently uses best backend
queryset = Startup.objects.all()
results = search_startups(queryset, 'python')
# Returns Startup objects on both PG and SQLite

# Check which backend is used
info = get_search_backend_info()
# Output: {
#   'backend': 'PostgreSQL',
#   'fts_available': True,
#   'algorithms': ['full-text-search', 'trigram-similarity']
# }
```

**How it works:**

**PostgreSQL:**
```
Full-Text Search: Ranks results by relevance
- name (weight A, 10 points)
- tagline/industry (weight B, 5 points)
- description (weight C, 1 point)
+ Trigram similarity for fuzzy matches
```

**SQLite:**
```
Fuzzy Matching: Uses SequenceMatcher
score = (name_match * 0.5) + (tagline_match * 0.3) + (desc_match * 0.2)
      + (0.3 if exact_substring else 0)
threshold: score >= 0.15
```

**Integration:**
```python
# In startups/views.py - already integrated!
def get_queryset(self):
  queryset = super().get_queryset()
  search_query = self.request.query_params.get('search', '')
  
  if search_query:
    queryset = search_startups(queryset, search_query)
  
  return queryset
```

**User Experience:**
```bash
# Works on any database
curl 'http://localhost:8000/api/v1/startups/?search=python'
# Works on PostgreSQL (FTS) and SQLite (fuzzy matching)
```

---

#### 5. ✅ Caching Strategy
**File:** `collabhub/settings.py`

```python
CACHES = {
  'default': {
    'BACKEND': 'django_redis.cache.RedisCache',  # Production
    'LOCATION': 'redis://localhost:6379/1',
  }
}

CACHE_TTL = {
  'STARTUP_LIST': 300,        # 5 minutes
  'RECOMMENDATIONS': 1800,    # 30 minutes
  'USER_PROFILE': 600,        # 10 minutes
  'ACTIVITY_FEED': 300,       # 5 minutes
  'SEARCH_RESULTS': 600,      # 10 minutes
  'DEFAULT': 3600,            # 1 hour
}
```

**Usage:**

```python
from django.core.cache import cache

# Set cache
cache.set('key', value, timeout=1800)

# Get cache
value = cache.get('key')

# Delete cache
cache.delete('key')

# Clear all
cache.clear()
```

**Automatic caching in Phase 5:**
- Recommendations auto-cached (30min)
- Feed auto-cached (5min)
- Search results auto-cached (10min)

---

#### 6. ✅ Structured Logging
**Files:**
- `collabhub/middleware.py` (122 lines)
- `collabhub/settings.py` (logging config)

**What it does:**
- Logs every HTTP request in JSON format
- Tracks request ID for tracing
- Records response time
- Captures errors with context

**Log Format:**
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": 123,
  "method": "GET",
  "path": "/api/v1/recommendations/",
  "remote_addr": "192.168.1.1",
  "status_code": 200,
  "duration_ms": 45.2
}
```

**View logs:**
```bash
# Watch live logs
tail -f logs/collabhub.log

# Parse JSON
tail -f logs/collabhub.log | jq .

# Find slow requests (>1 second)
jq 'select(.duration_ms > 1000)' logs/collabhub.log

# Find errors
jq 'select(.status_code >= 400)' logs/collabhub.log
```

**Middleware Stack:**
1. **RequestIdMiddleware** - Generates UUID per request
2. **StructuredLoggingMiddleware** - JSON logs
3. **ErrorContextMiddleware** - Error details

---

#### 7. ✅ Health Checks & Metrics
**File:** `collabhub/health.py` (95 lines)

**Endpoints:**

1. **GET /health/** - Full health check
```bash
curl http://localhost:8000/health/

# Response:
{
  "status": "healthy",
  "checks": {
    "database": "ok",
    "cache": "ok",
    "channels": "ok"
  }
}
```

2. **GET /metrics/** - Application metrics
```bash
curl http://localhost:8000/metrics/

# Response:
{
  "users": 1234,
  "startups": 456,
  "opportunities": 789,
  "messages": 5000,
  "active_users_24h": 300
}
```

3. **GET /live/** - Liveness probe (Kubernetes)
```bash
curl http://localhost:8000/live/
# Response: { "status": "alive" }
```

4. **GET /ready/** - Readiness probe (Kubernetes)
```bash
curl http://localhost:8000/ready/
# Response: { "status": "ready" } or 503 if database down
```

---

#### 8. ✅ Async Task Queue
**File:** `recommendations/tasks.py` (188 lines)

**Problem:** Notifications and activity logging block requests.

**Solution:** Queue tasks, process asynchronously.

```python
from recommendations.tasks import notify_user, log_activity

# Fire and forget - returns immediately
notify_user(
  user_id=123,
  title='New recommendation',
  message='Check out this startup'
)

# Activity is logged asynchronously
log_activity(
  user_id=456,
  action_type='startup_saved',
  content_type='startups.Startup',
  object_id=789
)
```

**How it works:**
- TaskQueue singleton (daemon worker)
- Processes tasks in background
- Duplicate prevention (5-second window)
- Error logging (won't crash on failures)
- Celery-compatible (easy migration)

**Monitoring:**
```python
from recommendations.tasks import task_queue

# Check queue size
print(f'Pending tasks: {task_queue.queue.qsize()}')

# Stop queue (graceful shutdown)
task_queue.stop()
```

---

#### 9. ✅ Comprehensive Test Suite
**File:** `recommendations/tests.py` (450+ lines)

**Test Coverage:**
- Recommendation scoring logic
- Activity feed pagination
- Redis fallback
- Search compatibility
- Health check endpoints
- Async task queue
- Concurrent operations

**Run tests:**
```bash
# All recommendations tests
python manage.py test recommendations -v 2

# Specific test
python manage.py test recommendations.tests.RecommendationServiceTestCase

# With coverage
coverage run --source='recommendations' manage.py test recommendations
coverage report
coverage html  # Opens htmlcov/index.html
```

**Example test:**
```python
def test_recommendation_caching(self):
  """Test that recommendations are cached"""
  cache.clear()
  
  # First call
  recs1 = RecommendationService.get_startup_recommendations_for_talent(
    self.talent, limit=5
  )
  
  # Second call (uses cache)
  recs2 = RecommendationService.get_startup_recommendations_for_talent(
    self.talent, limit=5
  )
  
  self.assertEqual(recs1, recs2)
```

---

## Integration Points

### How It All Works Together

```
User Request
    ↓
[Middleware]
  - Generate request ID
  - Struct logging
  - Error context
    ↓
[Views]
  - Authentication
  - Recommendations: Check cache → Compute → Cache
  - Feed: Query → Paginate → Cache
  - Search: Detect DB → Use appropriate algorithm
    ↓
[Models]
  - ActivityEvent logged asynchronously
  - Feed cache invalidated
    ↓
[Cache/DB]
  - Redis if available
  - LocMemCache if offline
  - PostgreSQL or SQLite
    ↓
[Response]
  - JSON serialized
  - Status code
  - Logged to JSON log file
    ↓
Client
```

---

## Configuration Options

### Environment Variables

```bash
# .env file
REDIS_URL=redis://localhost:6379/1
CACHE_DEFAULT_TIMEOUT=1800
DEBUG=False
LOG_LEVEL=INFO
```

### Django Settings

```python
# collabhub/settings_production.py

# Redis configuration
CHANNEL_LAYERS['default']['LOCATION'] = 'redis://redis-prod:6379/1'
CACHES['default']['LOCATION'] = 'redis://redis-prod:6379/1'

# Cache timeouts
CACHE_TTL['RECOMMENDATIONS'] = 3600  # 1 hour in production

# Logging
LOGGING['handlers']['file']['filename'] = '/var/log/collabhub/collabhub.log'
LOGGING['handlers']['file']['maxBytes'] = 50 * 1024 * 1024  # 50MB
```

---

## Verification Checklist

### Post-Deployment Verification

```
□ Migrations applied successfully
  python manage.py showmigrations recommendations
  
□ Health check working
  curl /health/ → 200 OK
  
□ Recommendations working
  curl /api/v1/recommendations/ → 200 OK with data
  
□ Feed working
  curl /api/v1/feed/ → 200 OK with paginated results
  
□ Search working on both backends
  curl /api/v1/startups/?search=python → Results found
  
□ Logging working
  tail logs/collabhub.log → JSON entries visible
  
□ No errors in error log
  tail logs/error.log → Empty or only warnings
  
□ Metrics available
  curl /metrics/ → User count, startup count, etc.
  
□ Tests passing
  python manage.py test recommendations → All pass
  
□ Cache working (if Redis)
  redis-cli KEYS 'collabhub:*' → Keys visible
  redis-cli GET 'collabhub:recommendations:1' → Value found
```

---

## Troubleshooting

### Issue: Redis Connection Failed

```
Error: ConnectionError: Connection to localhost:6379 failed

Solution 1: Start Redis
  redis-server

Solution 2: Check Redis is running
  redis-cli ping  # Should output PONG

Solution 3: Use fallback (no Redis needed)
  Settings auto-detect and fallback
```

### Issue: Search Returns No Results

```
Error: Empty results for valid search query

Solution 1: Check database backend
  python manage.py shell
  >>> from startups.search import get_search_backend_info
  >>> get_search_backend_info()
  
Solution 2: Verify data exists
  >>> from startups.models import Startup
  >>> Startup.objects.count()  # Should be > 0
  
Solution 3: Test search directly
  >>> from startups.search import search_startups
  >>> results = search_startups(Startup.objects.all(), 'python')
```

### Issue: Recommendations Empty

```
Error: No recommendations returned

Solution 1: Create test data
  Create users with different roles
  Create startups/opportunities
  
Solution 2: Check cache
  >>> from django.core.cache import cache
  >>> cache.clear()
  
Solution 3: Verify user role
  >>> from django.contrib.auth import get_user_model
  >>> user = get_user_model().objects.first()
  >>> print(user.role)  # Should be 'talent', 'founder', or 'investor'
```

### Issue: Slow Feed

```
Error: Feed takes > 1 second to load

Solution 1: Check pagination
  Not loading more than 50 items per page
  
Solution 2: Check indexes
  python manage.py dbshell
  SELECT * FROM sqlite_master WHERE type='index';
  
Solution 3: Profile query
  python manage.py shell_plus
  >>> from django.test.utils import CaptureQueriesContext
  >>> from django.db import connection
  >>> with CaptureQueriesContext(connection) as q:
  ...   Feed.objects.all()[:10]
  ... 
  >>> print(len(q))  # Number of queries
```

---

## Performance Tips

### Optimization Checklist

```
□ Enable Redis in production
  REDIS_URL=redis://your-host:6379/1
  
□ Adjust cache TTLs based on usage
  CACHE_TTL['RECOMMENDATIONS'] = 3600  # 1 hour
  CACHE_TTL['ACTIVITY_FEED'] = 600     # 10 min
  
□ Monitor cache hit rate
  tail -f logs/collabhub.log | jq 'select(.cache == "hit")'
  
□ Profile slow endpoints
  django-silk: pip install django-silk
  Add to MIDDLEWARE, visit /silk/
  
□ Use database indexes
  All Phase 5 models have optimized indexes
  
□ Batch operations
  Use bulk_create() for multiple inserts
  
□ Limit pagination
  Max 50 items per page (enforced in views)
  
□ Clear stale cache manually
  python manage.py shell
  >>> cache.clear()
```

---

## Next Steps

### Phase 6 Opportunities

1. **Machine Learning Recommendations**
   - Collect recommendation interactions
   - Build user/item embeddings
   - Deploy ML model

2. **Real-Time Notifications**
   - Push to frontend via WebSocket
   - Email digest notifications
   - Mobile push (Firebase)

3. **Advanced Search**
   - Elasticsearch integration
   - Faceted search
   - Search analytics

4. **Performance**
   - Query optimization (query analysis)
   - Database indexing (pg_stat_statements)
   - CDN for static files

---

## File Reference

### What Changed

**New Files:**
```
recommendations/
  ├── __init__.py
  ├── admin.py
  ├── apps.py
  ├── models.py          # ActivityEvent, Feed
  ├── serializers.py     # API serializers
  ├── services.py        # RecommendationService
  ├── tasks.py           # Async tasks
  ├── tests.py           # Test suite
  ├── urls.py            # API routes
  ├── views.py           # API views
  └── migrations/
      └── 0001_initial.py

startups/
  └── search.py          # Search compatibility

collabhub/
  ├── health.py          # Health checks
  └── middleware.py      # Request tracking, logging
```

**Modified Files:**
```
collabhub/
  ├── settings.py        # +200 lines (Redis, caching, logging)
  └── urls.py            # +health routes, +recommendations

startups/
  └── views.py           # Updated search to use compatibility layer
```

---

## Support

**Questions or Issues?**

1. Check logs: `tail -f logs/collabhub.log`
2. Run tests: `python manage.py test recommendations`
3. Check health: `curl /health/`
4. Review code: All files fully documented with docstrings

**Documentation:**
- `/PHASE_5_ARCHITECTURE.md` - Full system design
- `/PHASE_5_IMPLEMENTATION.md` - This file
- Code docstrings - Detailed inline documentation

---

**Last Updated:** Phase 5 Complete  
**Maintainer:** CollabHub Team  
**Next Review:** 1 month post-deployment
