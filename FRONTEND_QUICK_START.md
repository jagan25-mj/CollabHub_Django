# Quick Start Guide - Frontend SPA Development

## 🚀 What Was Built

A production-grade **Single-Page Application (SPA)** architecture replacing the old fragmented pages approach.

**Key Components:**
1. **Global State** (`state.js`) - Single source of truth for user data
2. **UI Library** (`components.js`) - Reusable components with consistent design
3. **SPA Router** (`router.js`) - Client-side routing with dynamic page loading
4. **Clean Design** - White background, blue primary colors, professional layout

## 📂 Where to Focus Next

### Files to Work On (In Priority Order)

#### 1. **router.js** - Add Page Implementations
- **Location:** `frontend/js/router.js`
- **Focus:** Methods like `renderHomePage()`, `renderProfilePage()`, etc.
- **These are stubs** - they need real API calls
- **Example:**
  ```javascript
  async renderHomePage() {
      // Currently just has a placeholder
      // Need to:
      // 1. Fetch activity feed from API
      // 2. Build HTML from data
      // 3. Return the DOM element
  }
  ```

#### 2. **components.js** - Extend Component Library
- **Location:** `frontend/js/components.js`
- **Current:** 10+ basic components
- **Add:** More specialized components as needed
- **Example:** Profile card component for network page

#### 3. **Create Page HTML Templates** (Optional)
- **Pages:** Each page can have optional template files
- **Alternative:** Generate HTML in router.js page renderers
- **Current approach:** Generating in router (simpler, less file management)

#### 4. **API Integration** 
- **Focus:** Replace placeholder API calls with real endpoints
- **File:** Already have `js/api.js` with utility functions
- **Pattern to follow:** See existing functions in api.js

### Files to Leave Alone (For Now)

❌ **DON'T MODIFY:**
- `state.js` - Don't change, it's working great
- `index.html` - Structure is final
- `app.js` - Bootstrap logic is complete

## 💡 How to Add a New Page

### Step 1: Add Route to Router
```javascript
// In router.js, routes object:
routes: {
    '/my-new-page': 'my-new-page',
    // ...
}
```

### Step 2: Create Page Renderer
```javascript
// In router.js, add method:
async renderMyNewPage() {
    const div = document.createElement('div');
    div.className = 'pt-24 pb-12 px-4'; // Top nav padding
    
    // Build page content
    div.innerHTML = `
        <div class="max-w-7xl mx-auto">
            <h1 class="text-3xl font-bold text-gray-900">My Page</h1>
        </div>
    `;
    
    // Load data
    this.loadMyNewPageData(div);
    
    return div;
}
```

### Step 3: Add Data Loading Function
```javascript
// In router.js, add method:
loadMyNewPageData(container) {
    // Use fetch to get API data
    // Update container with results
    
    // Example:
    fetch('/api/v1/my-endpoint/')
        .then(r => r.json())
        .then(data => {
            // Render data into container
        });
}
```

## 🎯 Common Tasks

### Task: Add a New Global State Property
```javascript
// In state.js class, add to constructor:
this.myNewProperty = null;

// Add getter:
getMyNewProperty() {
    return this.myNewProperty;
}

// Add setter:
setMyNewProperty(value) {
    this.myNewProperty = value;
    this.notifyListeners();
}
```

### Task: Create a New UI Component
```javascript
// In components.js, add function:
function createMyComponent(options) {
    const el = document.createElement('div');
    el.className = 'bg-white rounded-lg border border-gray-200 p-6';
    el.innerHTML = `<!-- your HTML -->`;
    return el;
}
```

### Task: Navigate Programmatically
```javascript
// From any page:
router.navigate('/some-page');

// Or with traditional link:
<a href="/some-page">Link</a>
// Router will intercept and use SPA navigation
```

### Task: Show a Toast Notification
```javascript
// From any page:
showToast('Operation successful!', 'success');
// Options: 'success', 'error', 'info', 'warning'
```

### Task: Check User Authentication
```javascript
// From any page:
if (window.CollabHubState.isLoggedIn()) {
    // User is authenticated
}

// Or get user data:
const user = window.CollabHubState.getUser();
const role = window.CollabHubState.getRole(); // 'founder', 'talent', 'investor'
```

## 📊 Page Implementation Checklist

For each page you implement:

- [ ] **Endpoint defined** - Router method created
- [ ] **Layout structure** - Navbar padding + max-width container
- [ ] **API integration** - Data loading from backend
- [ ] **Error handling** - Try/catch with user feedback
- [ ] **Loading state** - Show spinner while loading
- [ ] **Empty state** - Show message when no data
- [ ] **Responsive design** - Works on mobile
- [ ] **Tailwind styling** - Consistent with design system
- [ ] **Interactive elements** - Buttons, links, forms work

## 🧪 Testing in Browser

### Check State
```javascript
// Console:
window.CollabHubState.getUser()     // See user data
window.CollabHubState.getRole()     // See role
window.CollabHubState.isLoggedIn()  // See auth status
```

### Check Router
```javascript
// Console:
router.currentRoute              // Current page
router.navigate('/home')         // Test navigation
window.location.pathname         // Should update
```

### Check Components
```javascript
// Console:
const card = createCard({ title: 'Test' })
document.body.appendChild(card)   // Should see card on page
```

## 🎨 Design System Reference

### Colors
```css
/* Primary - Blue */
bg-blue-600   /* Buttons, primary actions */
text-blue-600
border-blue-600

/* Secondary - Gray */
bg-gray-100   /* Backgrounds, subtle elements */
text-gray-900 /* Text */
border-gray-200

/* Status - Use as needed */
bg-green-100  /* Success */
bg-red-100    /* Error */
bg-yellow-100 /* Warning */
```

### Spacing (Tailwind)
```css
p-4    /* Padding inside cards */
m-0    /* No margin default */
mb-4   /* Margin bottom for spacing sections */
pt-24  /* Top padding for nav offset */
px-4   /* Horizontal padding */
```

### Typography
```html
<!-- Headings -->
<h1 class="text-4xl font-bold text-gray-900">Main Title</h1>
<h2 class="text-2xl font-bold text-gray-900">Section Title</h2>
<h3 class="text-lg font-semibold text-gray-900">Card Title</h3>

<!-- Text -->
<p class="text-gray-900">Main text</p>
<p class="text-gray-600">Secondary text</p>
<p class="text-sm text-gray-500">Small/muted text</p>
```

## 📋 Implementation Template

Use this template for new pages:

```javascript
async renderNewPage() {
    const div = document.createElement('div');
    div.className = 'pt-24 pb-12 px-4';
    
    div.innerHTML = `
        <div class="max-w-7xl mx-auto">
            <!-- Header -->
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-900 mb-2">Page Title</h1>
                <p class="text-gray-600">Description or tagline</p>
            </div>
            
            <!-- Main Content -->
            <div id="page-content">
                <p class="text-gray-600">Loading...</p>
            </div>
        </div>
    `;
    
    this.loadPageData(div);
    return div;
}

loadPageData(container) {
    const content = container.querySelector('#page-content');
    
    fetch('/api/v1/endpoint/', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
    })
    .then(r => r.json())
    .then(data => {
        if (!data || data.length === 0) {
            content.innerHTML = `
                <div class="text-center py-12">
                    <div class="text-5xl mb-4">📭</div>
                    <h3 class="text-gray-900 font-medium mb-2">No items found</h3>
                    <p class="text-gray-600 text-sm">Try a different search or filter</p>
                </div>
            `;
            return;
        }
        
        content.innerHTML = data.map(item => `
            <div class="bg-white rounded-lg border border-gray-200 p-4 mb-4">
                <h4 class="font-medium text-gray-900">${item.title}</h4>
                <p class="text-sm text-gray-600">${item.description}</p>
            </div>
        `).join('');
    })
    .catch(err => {
        console.error('Error loading data:', err);
        content.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                Error loading data. Please try again.
            </div>
        `;
    });
}
```

## 🔗 Resource Links

- **Router.js** - All page renderers and routing logic
- **Components.js** - Reusable UI components
- **State.js** - Global state management
- **API.js** - HTTP utility functions (existing)

## ⚡ Performance Tips

1. **Lazy load** - Don't load all data on page open
2. **Pagination** - Load 10-20 items, then load more on scroll
3. **Caching** - Cache user data in state, only refresh on action
4. **Debounce** - Use `debounce()` for search inputs
5. **Error recovery** - Always show error state, allow user to retry

## 🐛 Debugging

### Common Issues

**Problem:** Page doesn't load after clicking link
- Check: `router.js` - Is route defined?
- Check: Page renderer returns DOM element

**Problem:** State is undefined
- Check: `state.js` loaded before other scripts
- Check: DOM content loaded before accessing

**Problem:** API calls failing
- Check: Auth token exists in localStorage
- Check: API endpoint exists in backend
- Check: CORS headers correct

## 📞 Key Functions Reference

```javascript
// State Management
window.CollabHubState.getUser()        // Get current user
window.CollabHubState.getRole()        // Get user role
window.CollabHubState.isLoggedIn()     // Check auth
window.CollabHubState.subscribe(fn)    // Listen for changes

// Router
router.navigate('/path')               // Navigate to page
router.currentRoute                    // Get current page

// Components
createAppShell(content)                // Wrap with navbar
createCard(options)                    // Card component
createButton(text, options)            // Button component
showToast(message, type)               // Show notification

// Utilities
AppUtils.truncateText(text, 50)        // Truncate text
AppUtils.formatRelativeTime(date)      // Format date
AppUtils.debounce(fn, 300)             // Debounce function
```

## ✅ Success Criteria

Page is complete when:
- ✅ Data loads from API
- ✅ Error states handled
- ✅ Loading states shown
- ✅ Empty states handled
- ✅ Responsive on mobile
- ✅ Works in production environment
- ✅ No console errors

---

**Happy coding! 🚀**

For detailed architecture info, see `FRONTEND_ARCHITECTURE_SUMMARY.md`
