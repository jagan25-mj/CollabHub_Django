# CollabHub Frontend Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         User's Browser                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                       index.html (Entry)                          │   │
│  │  • Landing page for unauthenticated users                        │   │
│  │  • App container for authenticated users                         │   │
│  │  • Loading screen during initialization                          │   │
│  └────────────────────────────┬─────────────────────────────────────┘   │
│                               │                                          │
│                    Script loading order:                                │
│                    1. api.js                                            │
│                    2. state.js (initializes)                            │
│                    3. components.js                                     │
│                    4. router.js (initializes)                           │
│                    5. app.js                                            │
│                               │                                          │
│  ┌────────────────────────────▼─────────────────────────────────────┐   │
│  │          CollabHubStateManager (window.CollabHubState)            │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ Single Source of Truth:                                         │   │
│  │ • user (current user data)                                      │   │
│  │ • role ('founder', 'talent', 'investor')                        │   │
│  │ • isAuthenticated (true/false)                                  │   │
│  │ • notifications (unread count)                                  │   │
│  │ • listeners (pub/sub for state changes)                         │   │
│  │                                                                 │   │
│  │ Methods:                                                        │   │
│  │ • init() → Fetches user from /api/v1/users/me/                │   │
│  │ • getRole() → Returns current role                             │   │
│  │ • isLoggedIn() → Checks auth status                            │   │
│  │ • subscribe(listener) → Listen for state changes               │   │
│  │ • logout() → Clears auth and user data                         │   │
│  └────────────────────────────┬────────────────────────────────────┘   │
│                               │                                          │
│                       Accessible from anywhere:                         │
│                    window.CollabHubState.getRole()                      │
│                               │                                          │
│  ┌────────────────────────────▼─────────────────────────────────────┐   │
│  │         CollabHubRouter (window.router)                           │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ SPA Router (14 routes):                                         │   │
│  │                                                                 │   │
│  │ Public Routes:                                                 │   │
│  │ • / → Landing page                                             │   │
│  │ • /login → Login page                                          │   │
│  │ • /register → Register page                                    │   │
│  │                                                                 │   │
│  │ Protected Routes (require auth):                               │   │
│  │ • /home → Unified feed                                         │   │
│  │ • /explore-startups → Startup directory                        │   │
│  │ • /startup/:id → Startup detail                                │   │
│  │ • /network → People connections                                │   │
│  │ • /messages → Messaging                                        │   │
│  │ • /profile → User profile & skills                             │   │
│  │ • /opportunities → Job opportunities                           │   │
│  │ • /dashboard → Auto-redirects to:                              │   │
│  │   - /dashboard/founder (role: founder)                         │   │
│  │   - /dashboard/talent (role: talent)                           │   │
│  │   - /dashboard/investor (role: investor)                       │   │
│  │                                                                 │   │
│  │ Features:                                                       │   │
│  │ • Dynamic page rendering                                       │   │
│  │ • Browser history management (back/forward)                    │   │
│  │ • Link interception for SPA navigation                         │   │
│  │ • Auth guard redirects to login                                │   │
│  │ • Role-based routing (auto-redirect)                           │   │
│  └────────────────────────────┬────────────────────────────────────┘   │
│                               │                                          │
│  ┌────────────────────────────▼─────────────────────────────────────┐   │
│  │      UI Component Library (components.js)                        │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ Reusable Components (consistent design):                        │   │
│  │                                                                 │   │
│  │ • createAppShell(pageContent)                                  │   │
│  │   └─ Returns: Fixed navbar + main content + auth guard         │   │
│  │                                                                 │   │
│  │ • createCard(options)                                          │   │
│  │   └─ Returns: White card with border & shadow                  │   │
│  │                                                                 │   │
│  │ • createButton(label, options)                                 │   │
│  │   └─ Returns: Button (4 variants: primary/secondary/danger)    │   │
│  │                                                                 │   │
│  │ • createFormField(label, options)                              │   │
│  │   └─ Returns: Form input with validation                       │   │
│  │                                                                 │   │
│  │ • createLoadingSkeleton()                                      │   │
│  │   └─ Returns: Animated loading placeholder                     │   │
│  │                                                                 │   │
│  │ • createEmptyState()                                           │   │
│  │   └─ Returns: Empty state with icon & CTA                      │   │
│  │                                                                 │   │
│  │ • showToast(message, type)                                     │   │
│  │   └─ Shows: Toast notification (success/error/warning)         │   │
│  │                                                                 │   │
│  │ • updateNavbar(state)                                          │   │
│  │   └─ Updates navbar based on state changes                     │   │
│  │                                                                 │   │
│  │ Design System:                                                 │   │
│  │ • Colors: Blue (#0ea5e9), White, Gray                          │   │
│  │ • Spacing: Tailwind grid (4px units)                           │   │
│  │ • Typography: Inter font family                                │   │
│  │ • Shadows: Subtle elevation on hover                           │   │
│  └────────────────────────────┬────────────────────────────────────┘   │
│                               │                                          │
│                       When User Navigates:                              │
│                               │                                          │
│  ┌────────────────────────────▼─────────────────────────────────────┐   │
│  │              Page Rendering Pipeline                             │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                 │   │
│  │ 1. User clicks link (or types URL)                             │   │
│  │    ↓                                                            │   │
│  │ 2. Router intercepts and validates route                       │   │
│  │    ↓                                                            │   │
│  │ 3. Check: Is user authenticated?                              │   │
│  │    - NO → Redirect to login                                    │   │
│  │    - YES → Continue                                            │   │
│  │    ↓                                                            │   │
│  │ 4. Check: Is this a dashboard? Is user's role?                │   │
│  │    - YES → Redirect to role-specific (/dashboard/founder)      │   │
│  │    - NO → Continue                                             │   │
│  │    ↓                                                            │   │
│  │ 5. Call page renderer (e.g., renderHomePage())                │   │
│  │    - Creates DOM structure                                     │   │
│  │    - Fetches data from API                                     │   │
│  │    - Builds HTML from data                                     │   │
│  │    ↓                                                            │   │
│  │ 6. Wrap with createAppShell()                                 │   │
│  │    - Adds navbar                                               │   │
│  │    - Adds auth guard modal (if needed)                         │   │
│  │    - Adds toast container                                      │   │
│  │    ↓                                                            │   │
│  │ 7. Inject into #app-root                                       │   │
│  │    ↓                                                            │   │
│  │ 8. Update browser history                                      │   │
│  │    ↓                                                            │   │
│  │ 9. Show page to user                                           │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                               │                                          │
│  ┌────────────────────────────▼─────────────────────────────────────┐   │
│  │              App Shell (Navbar + Page + Auth Guard)              │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                 │   │
│  │  ┌──────────────────────────────────────────────────────────┐  │   │
│  │  │ Fixed Navbar (White background, blue primary)           │  │   │
│  │  │ ┌──────────────────────────────────────────────────────┐ │   │
│  │  │ │ Logo │ Home Explore Network Messages Dashboard       │ │   │
│  │  │ │      │ Notifications │ Profile │ Logout             │ │   │
│  │  │ └──────────────────────────────────────────────────────┘ │   │
│  │  └──────────────────────────────────────────────────────────┘  │   │
│  │  ┌──────────────────────────────────────────────────────────┐  │   │
│  │  │ Main Content Area                                        │  │   │
│  │  │                                                          │  │   │
│  │  │ [Page content injected here]                            │  │   │
│  │  │ • Loading state (spinner)                              │  │   │
│  │  │ • Error state (retry button)                           │  │   │
│  │  │ • Empty state (helpful message)                        │  │   │
│  │  │ • Data (cards, tables, etc)                            │  │   │
│  │  │                                                          │  │   │
│  │  └──────────────────────────────────────────────────────────┘  │   │
│  │  ┌──────────────────────────────────────────────────────────┐  │   │
│  │  │ Auth Guard Modal (If unauthenticated)                   │  │   │
│  │  │ ┌──────────────────────────────────────────────────────┐ │   │
│  │  │ │ Please sign in to continue                          │ │   │
│  │  │ │ [Login Button]                                      │ │   │
│  │  │ └──────────────────────────────────────────────────────┘ │   │
│  │  └──────────────────────────────────────────────────────────┘  │   │
│  │  ┌──────────────────────────────────────────────────────────┐  │   │
│  │  │ Toast Container (For notifications)                     │  │   │
│  │  │ ┌──────────────────────────────────────────────────────┐ │   │
│  │  │ │ ✓ Success message                               [X]  │ │   │
│  │  │ └──────────────────────────────────────────────────────┘ │   │
│  │  └──────────────────────────────────────────────────────────┘  │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

                           Backend API Server
                                   ▲
                                   │
                      All data flows through here
                                   │
           ┌───────────────────────┼───────────────────────┐
           │                       │                       │
        GET /api/v1/users/me/  POST /api/v1/feed/  GET /api/v1/startups/
        GET /api/v1/startups/  GET /api/v1/network/ PATCH /api/v1/users/me/
           │                       │                       │
```

## Data Flow Diagram

```
User Interaction
        ↓
    Router Handler
        ↓
Auth Check (via state.js)
    ├─ Not logged in? → Redirect to /login
    ├─ Dashboard? Auto-redirect to role-specific
    └─ Proceed ↓
        ↓
    Page Renderer (in router.js)
        ├─ Create DOM structure
        ├─ Fetch data from API
        └─ Build HTML from data
        ↓
    createAppShell()
        ├─ Add navbar
        ├─ Add auth guard (if needed)
        └─ Add toast container
        ↓
    Inject into #app-root
        ↓
    Update browser.history
        ↓
    Display to user
```

## Authentication Flow

```
1. User opens application
   ↓
2. Check localStorage for auth_token
   ├─ No token? → Show landing page
   └─ Token exists? → Initialize state
                      ↓
3. state.js fetches /api/v1/users/me/
   ├─ Success → Set user, role, isAuthenticated = true
   └─ 401 Unauthorized → Clear token, show login
                      ↓
4. Router initializes
   ├─ Protected route? Check state.isLoggedIn()
   └─ Not logged in? → Redirect to /login
                      ↓
5. Show app with navbar and page content
```

## Role-Based Routing

```
User clicks link to /dashboard
        ↓
Router intercepts request
        ↓
Is user authenticated?
├─ No → Redirect to /login
└─ Yes → Continue
        ↓
Is route /dashboard?
├─ No → Render that page normally
└─ Yes → Check user role
            ↓
            ├─ role === 'founder'? → Render /dashboard/founder
            ├─ role === 'talent'? → Render /dashboard/talent
            └─ role === 'investor'? → Render /dashboard/investor
                        ↓
                    Display role-specific dashboard
```

## State Subscription Pattern

```
Component wants to know when state changes:

1. Subscribe to state:
   window.CollabHubState.subscribe((state) => {
       // This callback fires whenever state changes
       console.log('User role changed:', state.role);
   });

2. When something changes state (e.g., login):
   window.CollabHubState.setUser(userData);
        ↓
   state.notifyListeners();
        ↓
   All subscribed listeners are called
        ↓
   Components update accordingly (e.g., navbar shows user name)
```

## Component Architecture

```
Every Component Built With This Pattern:

createSomething() → Returns DOM Element
        ↓
Element has Tailwind classes for styling
        ↓
Element is reusable (no hardcoded data)
        ↓
Can be inserted anywhere with appendChild()
        ↓
Example:
    const card = createCard({
        title: 'My Card',
        content: 'Some content'
    });
    container.appendChild(card); // Rendered!
```

## Error Handling Flow

```
fetch('/api/data/')
    ├─ Success (200) → Use data
    ├─ Not Found (404) → Show "No data" message
    ├─ Unauthorized (401) → Logout, redirect to login
    ├─ Server Error (500) → Show error with retry button
    └─ Network Error → Show "Check connection" message
            ↓
    User clicks "Retry"
            ↓
    Reload page data
            ↓
    If successful → Show data
    If still failed → Show error again
```

---

This diagram shows how CollabHub's new SPA architecture works - unified, efficient, and maintainable! 🚀
