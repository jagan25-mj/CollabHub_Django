# Implementation Checklist - Next Session

## 📋 What's Complete

- [x] Global state management (`state.js`) - 173 lines, ready
- [x] UI component library (`components.js`) - 460 lines, ready  
- [x] SPA router (`router.js`) - 600+ lines, ready
- [x] App bootstrap (`app.js`) - Updated, ready
- [x] Landing page (`index.html`) - Restructured, ready
- [x] Documentation (3 guides created)

## 🎯 Immediate Next Steps (Priority Order)

### Session 1: Core Pages Implementation (3-4 hours)

#### Task 1.1: Implement Home Page (`/home`)
**Files to modify:** `router.js` - `renderHomePage()` + `loadHomeFeed()`
**Requirements:**
- [ ] Fetch activity feed from `/api/v1/feed/` (with pagination)
- [ ] Show role-appropriate content (different for founder/talent/investor)
- [ ] Display recent activities/interactions
- [ ] Show recommendations section
- [ ] Handle empty state (no feed yet)
- [ ] Handle error state (API failure)
- [ ] Loading spinner while fetching
- [ ] Responsive on mobile

**API Endpoints to Use:**
```
GET /api/v1/feed/?page=1&limit=20
GET /api/v1/recommendations/
GET /api/v1/users/me/  (for current user context)
```

**Expected Time:** 1-1.5 hours

#### Task 1.2: Implement Profile Page (`/profile`)
**Files to modify:** `router.js` - `renderProfilePage()` + `loadProfile()`
**Requirements:**
- [ ] Display user information (name, email, bio, location)
- [ ] Show/edit profile picture
- [ ] Skills management:
  - [ ] List current skills
  - [ ] Add new skill (with UI for input)
  - [ ] Remove skill (with delete button)
  - [ ] API calls for add/remove: `POST /api/v1/users/{id}/skills/`, `DELETE /api/v1/users/{id}/skills/{skill_id}/`
- [ ] Experience/projects section (list past work)
- [ ] Links section (portfolio, GitHub, etc.)
- [ ] Profile completion percentage
- [ ] Edit/save profile fields
- [ ] Handle errors gracefully

**API Endpoints to Use:**
```
GET /api/v1/users/me/
PATCH /api/v1/users/me/
POST /api/v1/users/me/skills/
DELETE /api/v1/users/me/skills/{id}/
POST /api/v1/users/me/experiences/
DELETE /api/v1/users/me/experiences/{id}/
```

**Expected Time:** 1.5-2 hours

#### Task 1.3: Implement Explore Startups (`/explore-startups`)
**Files to modify:** `router.js` - `renderExplorePage()` + `loadExploreStartups()`
**Requirements:**
- [ ] Display startup cards in grid (3 columns on desktop)
- [ ] Fetch startups from `/api/v1/startups/?page=1&limit=20`
- [ ] Search functionality (search by name/description)
- [ ] Filters:
  - [ ] Industry filter
  - [ ] Stage filter (idea, mvp, early, growth, scale)
  - [ ] Location filter
- [ ] Pagination (load more button or infinite scroll)
- [ ] Show "Save" button on each card (bookmark functionality)
- [ ] Click card to go to `/startup/{id}`
- [ ] Handle empty state (no startups match)
- [ ] Loading states while fetching
- [ ] Error handling

**API Endpoints to Use:**
```
GET /api/v1/startups/?search=query&industry=tech&stage=mvp&page=1
POST /api/v1/startups/{id}/save/
DELETE /api/v1/startups/{id}/save/
```

**Expected Time:** 1-1.5 hours

**Total Session 1: 3.5-5 hours**

### Session 2: Secondary Pages (3-4 hours)

#### Task 2.1: Implement Network Page (`/network`)
**Files to modify:** `router.js` - `renderNetworkPage()` + `loadNetwork()`
**Requirements:**
- [ ] People directory with user cards
- [ ] Search people by name/skills
- [ ] Show connection status (not connected, pending, connected)
- [ ] Connect/disconnect buttons
- [ ] View profile link
- [ ] Message button (go to `/messages` with user pre-selected)
- [ ] Pagination for large lists

#### Task 2.2: Implement Startup Detail (`/startup/:id`)
**Files to modify:** `router.js` - `renderStartupDetailPage()` + `loadStartupDetail()`
**Requirements:**
- [ ] Display startup details (name, description, tagline, industry, stage)
- [ ] Show team members
- [ ] List current openings
- [ ] Application/interest button:
  - If not founder: "Express Interest" button
  - If founder: "View" current applications
- [ ] Follow/unfollow button
- [ ] Save startup button
- [ ] Related startups section

#### Task 2.3: Implement Messages Page (`/messages`)
**Files to modify:** `router.js` - `renderMessagesPage()` + `loadMessages()`
**Requirements:**
- [ ] Show message threads list
- [ ] Display thread preview (last message, unread count)
- [ ] Click thread to open conversation
- [ ] Show messages in thread (with user avatars, timestamps)
- [ ] Input field to send new message
- [ ] Real-time updates (WebSocket or polling)
- [ ] Mark as read functionality

**Expected Time:** 2-2.5 hours

### Session 3: Polish & Testing (2-3 hours)

#### Task 3.1: Mobile Responsiveness
- [ ] Test all pages on mobile (375px width)
- [ ] Adjust card layouts for mobile
- [ ] Fix navbar for mobile (hamburger menu if needed)
- [ ] Test touch interactions

#### Task 3.2: Accessibility
- [ ] Add ARIA labels
- [ ] Keyboard navigation (Tab through all interactive elements)
- [ ] Color contrast check (WCAG AA standard)
- [ ] Alt text on images

#### Task 3.3: Error Handling
- [ ] Test with broken API
- [ ] Test with 401/403 responses
- [ ] Add retry buttons to error states
- [ ] Graceful degradation

## 🚀 Development Workflow

### Before Starting Coding

1. **Read existing code:**
   - Review `router.js` structure (understand page renderer pattern)
   - Review `components.js` (understand available components)
   - Review `state.js` (understand how to access user data)

2. **Check API documentation:**
   - Backend should have API endpoints documented
   - Know exact response format for each endpoint
   - Test endpoints with curl/Postman first

3. **Create mock data:**
   - Know what data you're fetching
   - Plan page layout based on data structure
   - Design loading/error/empty states

### While Coding

1. **Test each function as you write it:**
   ```javascript
   // After writing renderHomePage():
   // In console: router.navigate('/home')
   // Check if page loads, shows data, handles errors
   ```

2. **Use browser DevTools:**
   - Network tab to see API calls
   - Console to check for errors
   - Elements tab to inspect styling
   - Application tab to check localStorage

3. **Check state consistency:**
   ```javascript
   // In console while testing:
   window.CollabHubState.getUser()
   window.CollabHubState.getRole()
   // Make sure they match expectations
   ```

4. **Test error scenarios:**
   - Network disabled (offline)
   - API returns 401 (invalid token)
   - API returns 500 (server error)
   - Empty results (no data found)

### After Coding

1. **Browser testing:**
   - Chrome (desktop + mobile)
   - Firefox (desktop + mobile)
   - Safari (if possible)

2. **Functionality testing:**
   - Click every button
   - Try every form input
   - Test search/filter
   - Test pagination
   - Test back button

3. **Visual testing:**
   - Check layout on different screen sizes
   - Verify colors/spacing match design
   - Check for responsive breakpoints

## 📝 Code Pattern to Follow

Every page renderer should follow this pattern:

```javascript
async renderPageName() {
    const div = document.createElement('div');
    div.className = 'pt-24 pb-12 px-4';
    
    // Build HTML structure
    div.innerHTML = `
        <div class="max-w-7xl mx-auto">
            <!-- Page content -->
            <div id="page-content">
                <p class="text-gray-600">Loading...</p>
            </div>
        </div>
    `;
    
    // Load data
    this.loadPageData(div);
    
    return div;
}

loadPageData(container) {
    const content = container.querySelector('#page-content');
    
    try {
        // Fetch from API
        fetch('/api/endpoint/')
            .then(r => r.json())
            .then(data => {
                // Handle empty
                if (!data?.length) {
                    content.innerHTML = createEmptyState();
                    return;
                }
                
                // Render data
                content.innerHTML = data.map(item => `...`).join('');
            })
            .catch(err => {
                // Handle error
                content.innerHTML = createErrorState();
            });
    } catch (error) {
        console.error('Error:', error);
        content.innerHTML = `<div class="text-red-600">Error loading page</div>`;
    }
}
```

## 🛠️ Common Components to Use

### Loading Spinner
```javascript
<div class="text-center py-12">
    <div class="spinner mx-auto"></div>
    <p class="text-gray-600 mt-4">Loading...</p>
</div>
```

### Empty State
```javascript
<div class="text-center py-12">
    <div class="text-5xl mb-4">📭</div>
    <h3 class="text-gray-900 font-medium">No items found</h3>
    <p class="text-gray-600 text-sm">Try a different search</p>
</div>
```

### Error State
```javascript
<div class="bg-red-50 border border-red-200 rounded-lg p-6">
    <h3 class="text-red-900 font-medium">Error loading data</h3>
    <p class="text-red-800 text-sm">Please try again</p>
    <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-red-600 text-white rounded">
        Retry
    </button>
</div>
```

### Card Component
```javascript
<div class="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-6">
    <h3 class="font-semibold text-gray-900">Title</h3>
    <p class="text-gray-600 text-sm mt-2">Description</p>
</div>
```

## 🔗 Useful Testing URLs

After implementation, test these:
- `http://localhost:8000/home` - Home page
- `http://localhost:8000/profile` - Profile page  
- `http://localhost:8000/explore-startups` - Explore page
- `http://localhost:8000/network` - Network page
- `http://localhost:8000/messages` - Messages page
- `http://localhost:8000/dashboard` - Auto-redirect to role-specific
- `http://localhost:8000/startup/1` - Startup detail page

## 📊 Success Metrics

**Implementation is successful when:**
- ✅ All pages load without errors
- ✅ Data fetches from API correctly
- ✅ Loading states show while fetching
- ✅ Empty states handle no-data scenarios
- ✅ Error states appear on API failures
- ✅ Mobile view is responsive
- ✅ No console warnings/errors
- ✅ State remains consistent across navigation
- ✅ API tokens are included in all requests
- ✅ Navigation works with back button

## 🚨 Common Pitfalls to Avoid

❌ **Don't:**
- Modify `state.js` (it's finalized)
- Modify `components.js` unless adding component
- Create new navbar for each page (use `createAppShell()`)
- Add role checks in page logic (use `state.getRole()`)
- Hardcode API URLs (use constants if needed)
- Ignore error states (handle gracefully)
- Use inline styles (use Tailwind classes)
- Forget auth headers in API calls

✅ **Do:**
- Use `window.CollabHubState` for user/role data
- Return DOM elements from page renderers
- Handle loading/error/empty states
- Test on mobile viewport
- Use existing components from `components.js`
- Add proper error handling with try/catch
- Use Tailwind for all styling
- Include `Authorization` header in fetch calls

## 📚 Reference Files

Always have these open while coding:
- `router.js` - See existing page renderers for patterns
- `components.js` - See available components to use
- `state.js` - See available state methods
- `FRONTEND_QUICK_START.md` - Quick reference guide

## 🎉 When Complete

Once all pages are implemented:
1. Create PR with all changes
2. Test end-to-end flow
3. Performance review
4. Deploy to staging environment
5. User acceptance testing
6. Deploy to production

---

**Good luck! You've got this! 🚀**

For questions during development, reference `FRONTEND_QUICK_START.md`
