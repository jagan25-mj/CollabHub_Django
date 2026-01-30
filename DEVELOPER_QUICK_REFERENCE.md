# CollabHub Developer Quick Reference

## 🚀 Quick Start for Testing

### Starting the Backend
```bash
cd OneDrive/Desktop/CollabHub/backend
python manage.py runserver
# Server runs on http://localhost:8000
```

### Testing Production Security Settings
```bash
# Development mode (DEBUG=True by default)
# http://localhost:8000/app/

# Production mode test:
export DEBUG=False
export SECRET_KEY=your-secret-key-here
export ALLOWED_HOSTS=localhost,127.0.0.1
export CORS_ALLOWED_ORIGINS=http://localhost:8000
python manage.py runserver
```

---

## 📄 Architecture Quick Reference

### Global State (Always Available)
```javascript
// In ANY page or component:
const user = window.CollabHubState.getUser();          // User object
const role = window.CollabHubState.getRole();          // 'founder'|'talent'|'investor'
const isAuth = window.CollabHubState.isLoggedIn();     // boolean
const token = localStorage.getItem('access_token');    // JWT token
```

### Router Navigation
```javascript
// Go to any page:
window.collabHubRouter.navigate('/home');
window.collabHubRouter.navigate('/explore-startups');
window.collabHubRouter.navigate('/startups/123');      // Dynamic ID
window.collabHubRouter.navigate('/profile');
window.collabHubRouter.navigate('/dashboard');         // Auto-redirects to role-specific
```

### API Calls Pattern (Standard)
```javascript
async function fetchData() {
    try {
        const response = await fetch('/api/v1/endpoint/', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) throw new Error(`Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        showToast('Error loading data', 'error');
    }
}
```

### Notifications
```javascript
showToast('Message here', 'success');  // Green
showToast('Message here', 'error');    // Red
showToast('Message here', 'info');     // Blue
showToast('Message here', 'warning');  // Yellow
```

### Creating UI Components
```javascript
// All components in components.js:
createAppShell(pageContent)           // Wraps page with navbar
createCard(title, content)             // Card component
createButton(label, onClick)           // Button component
createEmptyState(title, message)      // Empty state
createLoadingState()                   // Loading skeleton
```

---

## 📡 API Quick Reference

### Authentication
```
POST   /api/v1/auth/login/              - Login
POST   /api/v1/auth/register/           - Register  
POST   /api/v1/auth/refresh/            - Refresh token
POST   /api/v1/auth/logout/             - Logout
```

### Users
```
GET    /api/v1/users/me/                - Current user
GET    /api/v1/users/                   - List users
GET    /api/v1/users/{id}/              - User detail
POST   /api/v1/users/me/skills/         - Add skill
DELETE /api/v1/users/me/skills/{id}/    - Remove skill
```

### Startups
```
GET    /api/v1/startups/                - List startups (paginated)
GET    /api/v1/startups/{id}/           - Startup detail
GET    /api/v1/startups/my/             - Founder's startups
GET    /api/v1/startups/saved/          - Investor's saved startups
POST   /api/v1/startups/                - Create startup
```

### Feed & Recommendations
```
GET    /api/v1/feed/                    - Activity feed
GET    /api/v1/recommendations/startups/- Recommended startups
GET    /api/v1/recommendations/people/  - Recommended people
```

### Applications & Collaborations
```
GET    /api/v1/collaborations/applications/ - List applications
POST   /api/v1/collaborations/applications/ - Create application
```

### Messaging
```
GET    /api/v1/messaging/threads/       - Message threads
GET    /api/v1/messaging/threads/{id}/messages/ - Messages in thread
POST   /api/v1/messaging/threads/{id}/messages/ - Send message
```

---

## 🎨 Design System Quick Reference

### Colors
```css
/* Primary */
--primary: #0ea5e9;           /* Blue */

/* Backgrounds */
--bg-white: #ffffff;
--bg-gray-50: #f9fafb;
--bg-gray-100: #f3f4f6;

/* Text */
--text-gray-900: #111827;     /* Dark */
--text-gray-600: #4b5563;     /* Medium */
--text-gray-500: #6b7280;     /* Light */

/* States */
--success: #10b981;           /* Green */
--error: #ef4444;             /* Red */
--warning: #f59e0b;           /* Amber */
--info: #3b82f6;              /* Blue */
```

### Spacing (Tailwind)
```css
/* Use these classes consistently: */
px-4 py-2     /* Small buttons, inputs */
px-6 py-3     /* Medium buttons, cards */
px-8 py-4     /* Large sections */
gap-4         /* Item spacing */
gap-6         /* Section spacing */
```

### Card Layout
```html
<div class="bg-white rounded-lg border border-gray-200 p-6">
    <h3 class="font-semibold text-gray-900 mb-3">Title</h3>
    <p class="text-gray-600">Content</p>
</div>
```

### Grid Layout
```html
<!-- 3 columns on desktop, 1 on mobile -->
<div class="grid md:grid-cols-3 gap-6">
    <div>Item 1</div>
    <div>Item 2</div>
    <div>Item 3</div>
</div>
```

---

## 🐛 Debugging Tips

### Check Global State
```javascript
// In browser console:
window.CollabHubState.getUser()
window.CollabHubState.getRole()
window.CollabHubState.isLoggedIn()
```

### Monitor API Calls
```javascript
// In browser DevTools → Network tab:
// Watch for: /api/v1/...
// Check: Status codes, response bodies, headers
```

### Check Token
```javascript
// In browser console:
localStorage.getItem('access_token')
// Should be a valid JWT token
```

### Clear Cache
```javascript
// In browser console:
localStorage.clear()
// Then reload: location.reload()
```

---

## 📝 Adding a New Page (Template)

```javascript
// In frontend/js/router.js

async renderNewPage() {
    const div = document.createElement('div');
    div.className = 'pt-24 pb-12 px-4';
    div.innerHTML = `
        <div class="max-w-7xl mx-auto">
            <h1 class="text-3xl font-bold text-gray-900 mb-8">Page Title</h1>
            <div id="page-container">
                <p class="text-gray-600">Loading...</p>
            </div>
        </div>
    `;
    
    this.loadPageData(div);
    return div;
}

async loadPageData(container) {
    const pageContainer = container.querySelector('#page-container');
    
    try {
        // 1. Fetch data
        const response = await fetch('/api/v1/endpoint/', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                'Content-Type': 'application/json',
            },
        });
        
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        
        // 2. Process data
        const data = await response.json();
        
        // 3. Render HTML
        let html = '';
        data.forEach(item => {
            html += `<div class="bg-white rounded-lg border border-gray-200 p-6">
                <p class="text-gray-900 font-medium">${item.name}</p>
            </div>`;
        });
        
        pageContainer.innerHTML = html;
    } catch (error) {
        console.error('Error loading page:', error);
        pageContainer.innerHTML = `
            <div class="text-center py-12 bg-white rounded-lg border border-gray-200">
                <p class="text-red-600 font-medium">Unable to load page</p>
                <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Retry</button>
            </div>
        `;
    }
}
```

---

## ✅ Page Implementation Checklist

When adding features to a page, verify:

- [ ] Uses `createAppShell()` wrapper (for authenticated pages)
- [ ] Fetches data from real API (not hardcoded)
- [ ] Has loading state (shows "Loading...")
- [ ] Has empty state (shows helpful message)
- [ ] Has error state (shows error + retry button)
- [ ] Uses `showToast()` for notifications
- [ ] Uses `CollabHubState` for user data
- [ ] Uses components from `components.js`
- [ ] Uses Tailwind CSS (no inline styles)
- [ ] Responsive design (mobile + desktop)
- [ ] Error handling (try/catch on async)
- [ ] No hardcoded role logic
- [ ] No duplicate API calls
- [ ] No console errors

---

## 🚨 Common Issues & Fixes

### Issue: "Cannot read property 'getUser' of undefined"
**Cause:** `CollabHubState` not initialized  
**Fix:** Ensure `state.js` loads before page code

### Issue: "401 Unauthorized"
**Cause:** Missing or invalid JWT token  
**Fix:** 
```javascript
const token = localStorage.getItem('access_token');
if (!token) window.collabHubRouter.navigate('/login');
```

### Issue: "CORS error"
**Cause:** Frontend and backend CORS mismatch  
**Fix:** Check backend `settings.py` CORS settings

### Issue: Empty page
**Cause:** API returns empty array or no data  
**Fix:** Add empty state handling

### Issue: Stale data after update
**Cause:** Page doesn't refresh after API mutation  
**Fix:** Call `location.reload()` or refetch data

---

## 📚 File Structure

```
frontend/
├── index.html              # App root + landing
├── css/
│   └── styles.css         # Global styles
├── js/
│   ├── api.js             # API helpers
│   ├── state.js           # Global state manager
│   ├── components.js      # UI components
│   ├── router.js          # SPA router + page renderers
│   ├── app.js             # Bootstrap + global functions
│   └── (landing.html)     # Landing page

backend/
├── collabhub/
│   ├── settings.py        # Production-hardened config
│   ├── urls.py            # URL routing
│   └── wsgi.py / asgi.py  # Application servers
├── users/
│   ├── models.py          # User, Profile, Skill models
│   ├── serializers.py     # API serializers
│   ├── views.py           # API views
│   └── urls.py            # User endpoints
├── startups/
│   ├── models.py          # Startup model
│   └── ...
├── manage.py              # Django CLI
└── db.sqlite3             # Database
```

---

## 🎯 Next Development Tasks

### High Priority
1. Frontend testing - Test all page flows
2. Backend testing - Verify API responses
3. Integration testing - Test frontend + backend together
4. Error case testing - Test network failures
5. Authentication testing - Test token refresh

### Medium Priority
1. Profile image uploads
2. File upload for resumes
3. Real-time notifications
4. Search functionality improvements
5. Filtering on Explore page

### Low Priority
1. Mobile app optimization
2. Performance optimizations
3. Analytics integration
4. Admin dashboard
5. User documentation

---

## 📞 Support & Questions

### Questions About Architecture
See: `PHASE_6_ARCHITECTURAL_SUMMARY.md`

### Questions About Implementation
See: `PHASE_6_IMPLEMENTATION_COMPLETE.md`

### API Documentation
Backend README or Django admin

### Backend API Debugging
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/v1/users/me/
```

---

## ✨ Best Practices

1. ✅ Always use try/catch on async operations
2. ✅ Always show loading states
3. ✅ Always handle empty results
4. ✅ Always validate user input
5. ✅ Always use CollabHubState for user data
6. ✅ Always use createAppShell for authenticated pages
7. ✅ Always use component library for UI
8. ✅ Always use Tailwind CSS, never inline styles
9. ✅ Always check browser console for errors
10. ✅ Always verify API responses before rendering

---

**Document Version:** Phase 6  
**Last Updated:** 2026-01-30  
**Maintainer:** CollabHub Development Team
