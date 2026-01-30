/**
 * CollabHub SPA Router
 * Client-side routing for single-page application
 * Handles auth checks, role-based redirects, dynamic page loading
 * 
 * Architecture:
 * - All pages loaded via router, not direct file access
 * - Auto-redirect /dashboard to role-specific variant
 * - Auth guard: unauthenticated users see landing page
 * - Clean white design used consistently across all pages
 */

class CollabHubRouter {
    constructor() {
        this.currentRoute = null;
        this.routes = {
            '/': 'home',
            '/home': 'home',
            '/explore-startups': 'explore-startups',
            '/explore': 'explore-startups',
            '/startup/:id': 'startup-detail',
            '/network': 'network',
            '/messages': 'messages',
            '/dashboard': 'dashboard',
            '/dashboard/founder': 'dashboard-founder',
            '/dashboard/talent': 'dashboard-talent',
            '/dashboard/investor': 'dashboard-investor',
            '/profile': 'profile',
            '/profile/:id': 'public-profile',
            '/login': 'login',
            '/register': 'register',
            '/opportunities': 'opportunities',
        };
    }

    /**
     * Initialize router and handle navigation
     */
    async init() {
        // Handle initial route
        this.handleInitialRoute();

        // Listen for popstate events (back/forward buttons)
        window.addEventListener('popstate', () => {
            this.handleRoute(window.location.pathname);
        });

        // Intercept link clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.origin === window.location.origin && !link.hasAttribute('data-external')) {
                e.preventDefault();
                this.navigate(link.pathname);
            }
        });
    }

    /**
     * Handle initial route on page load
     */
    async handleInitialRoute() {
        const path = window.location.pathname || '/';
        
        // Check authentication status
        const isAuthenticated = localStorage.getItem('auth_token') !== null;

        // Show landing page for unauthenticated users
        if (!isAuthenticated && !['login', 'register'].includes(this.getPageName(path))) {
            this.showLandingPage();
            return;
        }

        // Hide loading screen and initialize app
        this.hideLoadingScreen();
        
        // Initialize state from API
        if (isAuthenticated && !window.CollabHubState.initialized) {
            await window.CollabHubState.init();
        }

        // Handle the route
        await this.handleRoute(path);
    }

    /**
     * Navigate to a route
     */
    async navigate(path) {
        const isAuthenticated = window.CollabHubState?.isAuthenticated || localStorage.getItem('auth_token') !== null;

        // Redirect unauthenticated users to login (except for public pages)
        if (!isAuthenticated && !['login', 'register', '/'].includes(path)) {
            window.history.pushState({}, '', '/login');
            this.handleRoute('/login');
            return;
        }

        // Update browser history
        window.history.pushState({}, '', path);
        
        // Handle the route
        await this.handleRoute(path);
    }

    /**
     * Handle route and render appropriate page
     */
    async handleRoute(path) {
        const isAuthenticated = window.CollabHubState?.isAuthenticated || localStorage.getItem('auth_token') !== null;

        // Extract base route (remove query params)
        const cleanPath = path.split('?')[0];

        // Landing page for unauthenticated
        if (!isAuthenticated && !['login', 'register'].includes(this.getPageName(cleanPath))) {
            this.showLandingPage();
            return;
        }

        // Hide loading screen
        this.hideLoadingScreen();

        // Determine page name
        let pageName = this.getPageName(cleanPath);

        // Handle /dashboard redirect to role-specific
        if (pageName === 'dashboard' && isAuthenticated) {
            const role = window.CollabHubState?.role || 'talent';
            pageName = `dashboard-${role}`;
            window.history.replaceState({}, '', `/dashboard/${role}`);
        }

        // Route to page
        await this.renderPage(pageName, cleanPath);
    }

    /**
     * Get page name from path
     */
    getPageName(path) {
        const cleaned = path.replace(/^\/+/, '').split('/')[0] || 'home';
        const map = {
            '': 'home',
            'home': 'home',
            'explore-startups': 'explore-startups',
            'explore': 'explore-startups',
            'startup': 'startup-detail',
            'network': 'network',
            'messages': 'messages',
            'dashboard': 'dashboard',
            'profile': 'profile',
            'login': 'login',
            'register': 'register',
            'opportunities': 'opportunities',
            'app': this.getPageName(path.replace('/app/', '').split('/')[0]),
        };
        return map[cleaned] || cleaned;
    }

    /**
     * Render page content
     */
    async renderPage(pageName, fullPath) {
        const appRoot = document.getElementById('app-root');
        
        // Show loading
        appRoot.innerHTML = '<div class="flex items-center justify-center min-h-screen"><div class="text-center"><p class="text-gray-600">Loading...</p></div></div>';
        appRoot.classList.remove('hidden');

        try {
            let pageContent = null;

            // Route to appropriate page renderer
            switch (pageName) {
                case 'home':
                    pageContent = await this.renderHomePage();
                    break;
                case 'explore-startups':
                    pageContent = await this.renderExplorePage();
                    break;
                case 'startup-detail':
                    const id = fullPath.match(/\/startup\/(\d+)/)?.[1];
                    pageContent = await this.renderStartupDetailPage(id);
                    break;
                case 'network':
                    pageContent = await this.renderNetworkPage();
                    break;
                case 'messages':
                    pageContent = await this.renderMessagesPage();
                    break;
                case 'dashboard-founder':
                    pageContent = await this.renderDashboardFounder();
                    break;
                case 'dashboard-talent':
                    pageContent = await this.renderDashboardTalent();
                    break;
                case 'dashboard-investor':
                    pageContent = await this.renderDashboardInvestor();
                    break;
                case 'profile':
                    pageContent = await this.renderProfilePage();
                    break;
                case 'login':
                    pageContent = await this.renderLoginPage();
                    break;
                case 'register':
                    pageContent = await this.renderRegisterPage();
                    break;
                case 'opportunities':
                    pageContent = await this.renderOpportunitiesPage();
                    break;
                default:
                    pageContent = this.renderNotFoundPage();
            }

            // Wrap with app shell (navbar, auth guard, etc)
            const shell = createAppShell(pageContent);
            appRoot.innerHTML = '';
            appRoot.appendChild(shell);

            // Update navbar based on current state
            if (window.CollabHubState) {
                updateNavbar(window.CollabHubState);
            }

        } catch (error) {
            console.error('Error rendering page:', error);
            appRoot.innerHTML = '<div class="flex items-center justify-center min-h-screen"><div class="text-center"><p class="text-red-600">Error loading page</p></div></div>';
        }
    }

    /**
     * Page Renderers - each returns HTML content
     */

    async renderHomePage() {
        const div = document.createElement('div');
        div.className = 'pt-24 pb-12 px-4';
        div.innerHTML = `
            <div class="max-w-7xl mx-auto">
                <h1 class="text-3xl font-bold text-gray-900 mb-8">Home Feed</h1>
                <div id="feed-container" class="space-y-6">
                    <p class="text-gray-600">Loading feed...</p>
                </div>
            </div>
        `;

        // Load feed data
        this.loadHomeFeed(div);
        return div;
    }

    async renderExplorePage() {
        const div = document.createElement('div');
        div.className = 'pt-24 pb-12 px-4';
        div.innerHTML = `
            <div class="max-w-7xl mx-auto">
                <div class="flex justify-between items-center mb-8">
                    <h1 class="text-3xl font-bold text-gray-900">Explore Startups</h1>
                </div>
                <div class="grid md:grid-cols-3 gap-6">
                    <div id="startups-grid" class="md:col-span-3">
                        <p class="text-gray-600">Loading startups...</p>
                    </div>
                </div>
            </div>
        `;

        // Load startups
        this.loadExploreStartups(div);
        return div;
    }

    async renderStartupDetailPage(id) {
        const div = document.createElement('div');
        div.className = 'pt-24 pb-12 px-4';
        div.innerHTML = `
            <div class="max-w-4xl mx-auto">
                <p class="text-gray-600">Loading startup...</p>
            </div>
        `;
        
        if (id) {
            this.loadStartupDetail(div, id);
        }
        return div;
    }

    async renderNetworkPage() {
        const div = document.createElement('div');
        div.className = 'pt-24 pb-12 px-4';
        div.innerHTML = `
            <div class="max-w-7xl mx-auto">
                <h1 class="text-3xl font-bold text-gray-900 mb-8">Network</h1>
                <div class="grid md:grid-cols-3 gap-6">
                    <div id="network-container" class="md:col-span-3">
                        <p class="text-gray-600">Loading network...</p>
                    </div>
                </div>
            </div>
        `;

        // Load network data
        this.loadNetwork(div);
        return div;
    }

    async renderMessagesPage() {
        const div = document.createElement('div');
        div.className = 'pt-24 pb-12 px-4';
        div.innerHTML = `
            <div class="max-w-7xl mx-auto">
                <h1 class="text-3xl font-bold text-gray-900 mb-8">Messages</h1>
                <div id="messages-container">
                    <p class="text-gray-600">Loading messages...</p>
                </div>
            </div>
        `;

        // Load messages
        this.loadMessages(div);
        return div;
    }

    async renderDashboardFounder() {
        const div = document.createElement('div');
        div.className = 'pt-24 pb-12 px-4';
        div.innerHTML = `
            <div class="max-w-7xl mx-auto">
                <div class="flex justify-between items-start mb-8">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900 mb-2">Founder Dashboard 🚀</h1>
                        <p class="text-gray-600">Manage startups and find team members.</p>
                    </div>
                    <button onclick="showCreateStartupModal()" class="px-5 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">+ Create Startup</button>
                </div>
                <div id="dashboard-content">
                    <p class="text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        `;

        // Load dashboard data
        this.loadDashboardFounder(div);
        return div;
    }

    async renderDashboardTalent() {
        const div = document.createElement('div');
        div.className = 'pt-24 pb-12 px-4';
        div.innerHTML = `
            <div class="max-w-7xl mx-auto">
                <div class="flex justify-between items-start mb-8">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900 mb-2">Talent Dashboard 💡</h1>
                        <p class="text-gray-600">Explore opportunities and manage your applications.</p>
                    </div>
                </div>
                <div id="dashboard-content">
                    <p class="text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        `;

        // Load dashboard data
        this.loadDashboardTalent(div);
        return div;
    }

    async renderDashboardInvestor() {
        const div = document.createElement('div');
        div.className = 'pt-24 pb-12 px-4';
        div.innerHTML = `
            <div class="max-w-7xl mx-auto">
                <div class="flex justify-between items-start mb-8">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-900 mb-2">Investor Dashboard 📈</h1>
                        <p class="text-gray-600">Discover and track investment opportunities.</p>
                    </div>
                </div>
                <div id="dashboard-content">
                    <p class="text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        `;

        // Load dashboard data
        this.loadDashboardInvestor(div);
        return div;
    }

    async renderProfilePage() {
        const div = document.createElement('div');
        div.className = 'pt-24 pb-12 px-4';
        div.innerHTML = `
            <div class="max-w-4xl mx-auto">
                <h1 class="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>
                <div id="profile-content">
                    <p class="text-gray-600">Loading profile...</p>
                </div>
            </div>
        `;

        // Load profile
        this.loadProfile(div);
        return div;
    }

    async renderLoginPage() {
        const div = document.createElement('div');
        div.className = 'min-h-screen flex items-center justify-center bg-white px-4';
        div.innerHTML = `
            <div class="w-full max-w-md">
                <div class="bg-white rounded-xl border border-gray-200 shadow-lg p-8">
                    <h1 class="text-2xl font-bold text-gray-900 mb-6">Sign In</h1>
                    <form id="login-form" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input type="email" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600" placeholder="your@email.com">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                            <input type="password" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600" placeholder="••••••••">
                        </div>
                        <button type="submit" class="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">Sign In</button>
                    </form>
                    <p class="text-center text-gray-600 text-sm mt-4">
                        Don't have an account? <a href="/register" class="text-blue-600 hover:text-blue-700 font-medium">Sign up</a>
                    </p>
                </div>
            </div>
        `;

        // Setup login handler
        div.querySelector('#login-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            showToast('Login functionality requires backend integration', 'info');
        });

        return div;
    }

    async renderRegisterPage() {
        const div = document.createElement('div');
        div.className = 'min-h-screen flex items-center justify-center bg-white px-4';
        div.innerHTML = `
            <div class="w-full max-w-md">
                <div class="bg-white rounded-xl border border-gray-200 shadow-lg p-8">
                    <h1 class="text-2xl font-bold text-gray-900 mb-6">Create Account</h1>
                    <form id="register-form" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                            <input type="text" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600" placeholder="John Doe">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                            <input type="email" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600" placeholder="your@email.com">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Role</label>
                            <select required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600">
                                <option value="">Select Role</option>
                                <option value="founder">Founder</option>
                                <option value="talent">Talent</option>
                                <option value="investor">Investor</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                            <input type="password" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600" placeholder="••••••••">
                        </div>
                        <button type="submit" class="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">Create Account</button>
                    </form>
                    <p class="text-center text-gray-600 text-sm mt-4">
                        Already have an account? <a href="/login" class="text-blue-600 hover:text-blue-700 font-medium">Sign in</a>
                    </p>
                </div>
            </div>
        `;

        // Setup register handler
        div.querySelector('#register-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            showToast('Registration requires backend integration', 'info');
        });

        return div;
    }

    async renderOpportunitiesPage() {
        const div = document.createElement('div');
        div.className = 'pt-24 pb-12 px-4';
        div.innerHTML = `
            <div class="max-w-7xl mx-auto">
                <h1 class="text-3xl font-bold text-gray-900 mb-8">Opportunities</h1>
                <div id="opportunities-container">
                    <p class="text-gray-600">Loading opportunities...</p>
                </div>
            </div>
        `;

        // Load opportunities
        this.loadOpportunities(div);
        return div;
    }

    renderNotFoundPage() {
        const div = document.createElement('div');
        div.className = 'pt-24 pb-12 px-4';
        div.innerHTML = `
            <div class="max-w-4xl mx-auto text-center">
                <h1 class="text-4xl font-bold text-gray-900 mb-4">404 - Page Not Found</h1>
                <p class="text-gray-600 mb-6">The page you're looking for doesn't exist.</p>
                <a href="/home" class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Go Home</a>
            </div>
        `;
        return div;
    }

    /**
     * Data Loading Functions
     */

    async loadHomeFeed(container) {
        const feedContainer = container.querySelector('#feed-container');
        
        try {
            // Fetch feed from API
            const response = await fetch('/api/v1/feed/', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Feed API error: ${response.status}`);
            }

            const data = await response.json();
            const activities = data.results || data || [];

            if (!activities || activities.length === 0) {
                feedContainer.innerHTML = `
                    <div class="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <p class="text-gray-600 text-lg">Your feed is empty</p>
                        <p class="text-gray-500 text-sm mt-2">Follow startups and people to see updates here</p>
                        <a href="/explore-startups" class="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Explore Startups</a>
                    </div>
                `;
                return;
            }

            // Render feed items
            let html = '';
            activities.forEach(activity => {
                const timestamp = formatRelativeTime(activity.created_at || activity.timestamp);
                const userAvatar = activity.user?.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(activity.user?.full_name || 'User')}&background=0ea5e9&color=fff`;
                
                html += `
                    <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                        <div class="flex items-start gap-4">
                            <img src="${userAvatar}" alt="User" class="w-12 h-12 rounded-full object-cover">
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-2">
                                    <span class="font-semibold text-gray-900">${activity.user?.full_name || 'Unknown User'}</span>
                                    <span class="text-gray-500 text-sm">@${activity.user?.username || 'user'}</span>
                                </div>
                                <p class="text-gray-700 mb-3">${activity.description || activity.message || 'Activity update'}</p>
                                <div class="flex items-center gap-4 text-sm text-gray-500">
                                    <span>${timestamp}</span>
                                    ${activity.type ? `<span class="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium">${activity.type}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });

            feedContainer.innerHTML = html;
        } catch (error) {
            console.error('Error loading feed:', error);
            feedContainer.innerHTML = `
                <div class="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <p class="text-red-600 font-medium">Unable to load feed</p>
                    <p class="text-gray-500 text-sm mt-2">Please try refreshing the page</p>
                    <button onclick="location.reload()" class="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Refresh Page</button>
                </div>
            `;
        }
    }

    async loadExploreStartups(container) {
        const grid = container.querySelector('#startups-grid');
        
        try {
            // Fetch startups from API with pagination
            const response = await fetch('/api/v1/startups/?page=1&limit=20', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Startups API error: ${response.status}`);
            }

            const data = await response.json();
            const startups = data.results || data || [];

            if (!startups || startups.length === 0) {
                grid.innerHTML = `
                    <div class="text-center py-12 bg-white rounded-lg border border-gray-200 md:col-span-3">
                        <p class="text-gray-600 text-lg">No startups found</p>
                        <p class="text-gray-500 text-sm mt-2">Check back later for new opportunities</p>
                    </div>
                `;
                return;
            }

            // Render startup cards in grid
            let html = '<div class="grid md:grid-cols-3 gap-6">';
            startups.forEach(startup => {
                const logo = startup.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(startup.name)}&background=0ea5e9&color=fff`;
                const founderName = startup.founder?.full_name || startup.founder?.name || 'Founder';
                const funding = startup.funding_stage || 'Pre-seed';
                
                html += `
                    <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow hover:border-blue-300 cursor-pointer group"
                         onclick="window.collabHubRouter.navigate('/startups/${startup.id}')">
                        <div class="mb-4">
                            <img src="${logo}" alt="${startup.name}" class="w-12 h-12 rounded-lg object-cover mb-3">
                            <h3 class="font-semibold text-gray-900 group-hover:text-blue-600">${startup.name}</h3>
                            <p class="text-gray-500 text-sm">Founded by ${founderName}</p>
                        </div>
                        <p class="text-gray-600 text-sm mb-4 line-clamp-2">${startup.description || 'No description'}</p>
                        <div class="flex items-center justify-between mb-4">
                            <span class="px-2.5 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">${funding}</span>
                            ${startup.industry ? `<span class="text-gray-500 text-xs">${startup.industry}</span>` : ''}
                        </div>
                        <div class="flex items-center gap-2 text-sm text-gray-500">
                            ${startup.openings_count ? `<span>🔍 ${startup.openings_count} openings</span>` : ''}
                            ${startup.team_size ? `<span>👥 ${startup.team_size} team members</span>` : ''}
                        </div>
                    </div>
                `;
            });
            html += '</div>';

            grid.innerHTML = html;
        } catch (error) {
            console.error('Error loading startups:', error);
            grid.innerHTML = `
                <div class="text-center py-12 bg-white rounded-lg border border-gray-200 md:col-span-3">
                    <p class="text-red-600 font-medium">Unable to load startups</p>
                    <p class="text-gray-500 text-sm mt-2">Please try refreshing the page</p>
                    <button onclick="location.reload()" class="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Refresh Page</button>
                </div>
            `;
        }
    }

    async loadStartupDetail(container, id) {
        const content = container.querySelector('div > div');
        
        try {
            // Fetch startup details from API
            const response = await fetch(`/api/v1/startups/${id}/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Startup detail API error: ${response.status}`);
            }

            const startup = await response.json();
            const logo = startup.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(startup.name)}&background=0ea5e9&color=fff`;
            const founderName = startup.founder?.full_name || startup.founder?.name || 'Founder';
            const funding = startup.funding_stage || 'Pre-seed';

            let html = `
                <div class="bg-white rounded-lg border border-gray-200 p-8 mb-6">
                    <div class="flex items-start justify-between mb-6">
                        <div>
                            <div class="flex items-center gap-4 mb-4">
                                <img src="${logo}" alt="${startup.name}" class="w-20 h-20 rounded-xl object-cover">
                                <div>
                                    <h1 class="text-3xl font-bold text-gray-900">${startup.name}</h1>
                                    <p class="text-gray-600 mt-1">Founded by ${founderName}</p>
                                </div>
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <button class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">💾 Save</button>
                            <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">👁️ Follow</button>
                        </div>
                    </div>
                    
                    <p class="text-gray-700 mb-6">${startup.description || 'No description'}</p>
                    
                    <div class="grid md:grid-cols-4 gap-6 mb-8 pb-8 border-b border-gray-200">
                        <div>
                            <p class="text-gray-600 text-sm">Funding Stage</p>
                            <p class="text-xl font-semibold text-gray-900">${funding}</p>
                        </div>
                        <div>
                            <p class="text-gray-600 text-sm">Industry</p>
                            <p class="text-xl font-semibold text-gray-900">${startup.industry || 'Not specified'}</p>
                        </div>
                        <div>
                            <p class="text-gray-600 text-sm">Team Size</p>
                            <p class="text-xl font-semibold text-gray-900">${startup.team_size || 'N/A'}</p>
                        </div>
                        <div>
                            <p class="text-gray-600 text-sm">Open Positions</p>
                            <p class="text-xl font-semibold text-gray-900">${startup.openings_count || 0}</p>
                        </div>
                    </div>

                    ${startup.website ? `
                        <div class="mb-4">
                            <p class="text-gray-600 text-sm">Website</p>
                            <a href="${startup.website}" target="_blank" class="text-blue-600 hover:text-blue-700 font-medium">${startup.website}</a>
                        </div>
                    ` : ''}
                </div>

                ${startup.openings_count && startup.openings_count > 0 ? `
                    <div class="bg-white rounded-lg border border-gray-200 p-8">
                        <h2 class="text-xl font-bold text-gray-900 mb-6">Open Positions</h2>
                        <div class="space-y-4">
                            <p class="text-gray-600">This startup has ${startup.openings_count} open position(s). Contact them to learn more!</p>
                        </div>
                    </div>
                ` : ''}
            `;

            content.innerHTML = html;
        } catch (error) {
            console.error('Error loading startup detail:', error);
            content.innerHTML = `
                <div class="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <p class="text-red-600 font-medium">Unable to load startup details</p>
                    <p class="text-gray-500 text-sm mt-2">Please try refreshing the page</p>
                    <button onclick="location.reload()" class="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Refresh Page</button>
                </div>
            `;
        }
    }

    async loadNetwork(container) {
        const content = container.querySelector('#network-container');
        
        try {
            // Fetch users from API
            const response = await fetch('/api/v1/users/?page=1&limit=20', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Users API error: ${response.status}`);
            }

            const data = await response.json();
            const users = data.results || data || [];
            const currentUser = window.CollabHubState?.getUser();

            if (!users || users.length === 0) {
                content.innerHTML = `
                    <div class="text-center py-12 bg-white rounded-lg border border-gray-200 md:col-span-3">
                        <p class="text-gray-600 text-lg">No users found</p>
                        <p class="text-gray-500 text-sm mt-2">Build your network by connecting with other members</p>
                    </div>
                `;
                return;
            }

            // Filter out current user
            const filteredUsers = users.filter(u => u.id !== currentUser?.id);

            // Render user cards in grid
            let html = '<div class="grid md:grid-cols-3 gap-6">';
            filteredUsers.forEach(user => {
                const avatar = user.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=0ea5e9&color=fff`;
                const role = user.role || 'Member';
                const bio = user.bio || 'No bio yet';
                
                html += `
                    <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                        <div class="text-center mb-4">
                            <img src="${avatar}" alt="${user.full_name}" class="w-16 h-16 rounded-full mx-auto mb-3 object-cover">
                            <h3 class="font-semibold text-gray-900">${user.full_name}</h3>
                            <p class="text-gray-500 text-sm">@${user.username}</p>
                            <p class="text-blue-600 text-xs font-medium mt-2">${role.charAt(0).toUpperCase() + role.slice(1)}</p>
                        </div>
                        <p class="text-gray-600 text-sm text-center mb-4">${bio}</p>
                        <button class="w-full py-2 px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
                            🔗 Connect
                        </button>
                    </div>
                `;
            });
            html += '</div>';

            content.innerHTML = html;
        } catch (error) {
            console.error('Error loading network:', error);
            content.innerHTML = `
                <div class="text-center py-12 bg-white rounded-lg border border-gray-200 md:col-span-3">
                    <p class="text-red-600 font-medium">Unable to load network</p>
                    <p class="text-gray-500 text-sm mt-2">Please try refreshing the page</p>
                    <button onclick="location.reload()" class="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Refresh Page</button>
                </div>
            `;
        }
    }

    async loadMessages(container) {
        const content = container.querySelector('#messages-container');
        
        try {
            // Fetch message threads from API
            const response = await fetch('/api/v1/messaging/threads/', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Messages API error: ${response.status}`);
            }

            const data = await response.json();
            const threads = data.results || data || [];

            if (!threads || threads.length === 0) {
                content.innerHTML = `
                    <div class="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <p class="text-gray-600 text-lg">No messages yet</p>
                        <p class="text-gray-500 text-sm mt-2">Start a conversation to begin messaging</p>
                    </div>
                `;
                return;
            }

            // Render message threads
            let html = '<div class="space-y-3">';
            threads.forEach(thread => {
                const otherUser = thread.participants?.find(p => p.id !== window.CollabHubState?.getUser()?.id);
                const avatar = otherUser?.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.full_name)}&background=0ea5e9&color=fff`;
                const lastMessage = thread.last_message?.content || 'No messages';
                const timestamp = formatRelativeTime(thread.updated_at);
                
                html += `
                    <div class="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                         onclick="window.collabHubRouter.navigate('/messages/${thread.id}')">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3 flex-1">
                                <img src="${avatar}" alt="User" class="w-10 h-10 rounded-full object-cover">
                                <div class="flex-1">
                                    <p class="font-medium text-gray-900">${otherUser?.full_name || 'Unknown User'}</p>
                                    <p class="text-gray-600 text-sm truncate">${lastMessage}</p>
                                </div>
                            </div>
                            <span class="text-gray-500 text-xs">${timestamp}</span>
                        </div>
                    </div>
                `;
            });
            html += '</div>';

            content.innerHTML = html;
        } catch (error) {
            console.error('Error loading messages:', error);
            content.innerHTML = `
                <div class="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <p class="text-red-600 font-medium">Unable to load messages</p>
                    <p class="text-gray-500 text-sm mt-2">Please try refreshing the page</p>
                    <button onclick="location.reload()" class="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Refresh Page</button>
                </div>
            `;
        }
    }

    async loadDashboardFounder(container) {
        const content = container.querySelector('#dashboard-content');
        
        try {
            // Fetch founder's startups and applications
            const startupResponse = await fetch('/api/v1/startups/my/', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
                    'Content-Type': 'application/json',
                },
            });

            const applicationsResponse = await fetch('/api/v1/collaborations/applications/', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
                    'Content-Type': 'application/json',
                },
            });

            const startups = startupResponse.ok ? (await startupResponse.json()).results || [] : [];
            const applications = applicationsResponse.ok ? (await applicationsResponse.json()).results || [] : [];

            let html = `
                <div class="grid md:grid-cols-4 gap-6 mb-8">
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <div class="text-3xl font-bold text-gray-900">${startups.length}</div>
                        <div class="text-gray-600 text-sm">My Startups</div>
                    </div>
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <div class="text-3xl font-bold text-gray-900">${applications.length}</div>
                        <div class="text-gray-600 text-sm">Applications</div>
                    </div>
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <div class="text-3xl font-bold text-gray-900">${startups.reduce((sum, s) => sum + (s.team_size || 0), 0)}</div>
                        <div class="text-gray-600 text-sm">Team Members</div>
                    </div>
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <div class="text-3xl font-bold text-gray-900">--</div>
                        <div class="text-gray-600 text-sm">Messages</div>
                    </div>
                </div>

                <h3 class="text-lg font-bold text-gray-900 mb-4">Your Startups</h3>
                ${startups.length > 0 ? `
                    <div class="grid md:grid-cols-2 gap-6 mb-8">
                        ${startups.map(startup => `
                            <div class="bg-white rounded-lg border border-gray-200 p-6">
                                <h4 class="font-semibold text-gray-900 mb-2">${startup.name}</h4>
                                <p class="text-gray-600 text-sm mb-3">${startup.description || 'No description'}</p>
                                <p class="text-gray-600 text-xs mb-3">👥 ${startup.team_size || 0} team members | 📋 ${startup.openings_count || 0} openings</p>
                                <button onclick="window.collabHubRouter.navigate('/startups/${startup.id}')" class="text-blue-600 hover:text-blue-700 text-sm font-medium">View Startup →</button>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-center">
                        <p class="text-gray-700">You haven't created any startups yet.</p>
                        <button onclick="showCreateStartupModal()" class="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Create Your First Startup</button>
                    </div>
                `}

                <h3 class="text-lg font-bold text-gray-900 mb-4">Recent Applications</h3>
                ${applications.length > 0 ? `
                    <div class="space-y-3">
                        ${applications.slice(0, 5).map(app => `
                            <div class="bg-white rounded-lg border border-gray-200 p-4 flex justify-between items-center">
                                <div>
                                    <p class="font-medium text-gray-900">${app.applicant?.full_name || 'Unknown'}</p>
                                    <p class="text-gray-500 text-sm">Applied for position</p>
                                </div>
                                <span class="px-3 py-1 bg-yellow-50 text-yellow-700 text-xs font-medium rounded">Pending</span>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="bg-gray-50 rounded-lg p-6 text-center">
                        <p class="text-gray-600">No applications yet</p>
                    </div>
                `}
            `;

            content.innerHTML = html;
        } catch (error) {
            console.error('Error loading founder dashboard:', error);
            content.innerHTML = `
                <div class="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <p class="text-red-600 font-medium">Unable to load dashboard</p>
                    <button onclick="location.reload()" class="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Refresh Page</button>
                </div>
            `;
        }
    }

    async loadDashboardTalent(container) {
        const content = container.querySelector('#dashboard-content');
        
        try {
            // Fetch talent's applications and interests
            const applicationsResponse = await fetch('/api/v1/collaborations/applications/', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
                    'Content-Type': 'application/json',
                },
            });

            const applications = applicationsResponse.ok ? (await applicationsResponse.json()).results || [] : [];

            let html = `
                <div class="grid md:grid-cols-4 gap-6 mb-8">
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <div class="text-3xl font-bold text-gray-900">${applications.length}</div>
                        <div class="text-gray-600 text-sm">Applications</div>
                    </div>
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <div class="text-3xl font-bold text-gray-900">--</div>
                        <div class="text-gray-600 text-sm">Following</div>
                    </div>
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <div class="text-3xl font-bold text-gray-900">--</div>
                        <div class="text-gray-600 text-sm">Messages</div>
                    </div>
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <div class="text-3xl font-bold text-gray-900">--</div>
                        <div class="text-gray-600 text-sm">Interested In</div>
                    </div>
                </div>

                <h3 class="text-lg font-bold text-gray-900 mb-4">My Applications</h3>
                ${applications.length > 0 ? `
                    <div class="space-y-3 mb-8">
                        ${applications.slice(0, 10).map(app => `
                            <div class="bg-white rounded-lg border border-gray-200 p-4 flex justify-between items-center">
                                <div>
                                    <p class="font-medium text-gray-900">${app.startup?.name || 'Unknown Startup'}</p>
                                    <p class="text-gray-500 text-sm">Position: ${app.position || 'Not specified'}</p>
                                </div>
                                <span class="px-3 py-1 ${app.status === 'approved' ? 'bg-green-50 text-green-700' : app.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'} text-xs font-medium rounded">${app.status || 'Pending'}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-center">
                        <p class="text-gray-700">You haven't applied to any opportunities yet.</p>
                        <button onclick="window.collabHubRouter.navigate('/explore-startups')" class="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Explore Startups</button>
                    </div>
                `}

                <h3 class="text-lg font-bold text-gray-900 mb-4">Recommended Opportunities</h3>
                <div class="bg-gray-50 rounded-lg p-6 text-center">
                    <p class="text-gray-600">Check the <a href="/explore-startups" class="text-blue-600 hover:text-blue-700 font-medium">Explore page</a> for new opportunities</p>
                </div>
            `;

            content.innerHTML = html;
        } catch (error) {
            console.error('Error loading talent dashboard:', error);
            content.innerHTML = `
                <div class="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <p class="text-red-600 font-medium">Unable to load dashboard</p>
                    <button onclick="location.reload()" class="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Refresh Page</button>
                </div>
            `;
        }
    }

    async loadDashboardInvestor(container) {
        const content = container.querySelector('#dashboard-content');
        
        try {
            // Fetch investor's saved startups and recommendations
            const startupsResponse = await fetch('/api/v1/startups/saved/', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
                    'Content-Type': 'application/json',
                },
            });

            const recommendationsResponse = await fetch('/api/v1/recommendations/startups/', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
                    'Content-Type': 'application/json',
                },
            });

            const savedStartups = startupsResponse.ok ? (await startupsResponse.json()).results || [] : [];
            const recommendations = recommendationsResponse.ok ? (await recommendationsResponse.json()).results || [] : [];

            let html = `
                <div class="grid md:grid-cols-4 gap-6 mb-8">
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <div class="text-3xl font-bold text-gray-900">${savedStartups.length}</div>
                        <div class="text-gray-600 text-sm">Saved Startups</div>
                    </div>
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <div class="text-3xl font-bold text-gray-900">--</div>
                        <div class="text-gray-600 text-sm">Expressed Interest</div>
                    </div>
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <div class="text-3xl font-bold text-gray-900">--</div>
                        <div class="text-gray-600 text-sm">Conversations</div>
                    </div>
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <div class="text-3xl font-bold text-gray-900">${recommendations.length}</div>
                        <div class="text-gray-600 text-sm">Recommendations</div>
                    </div>
                </div>

                <h3 class="text-lg font-bold text-gray-900 mb-4">Your Saved Startups</h3>
                ${savedStartups.length > 0 ? `
                    <div class="grid md:grid-cols-2 gap-6 mb-8">
                        ${savedStartups.map(startup => `
                            <div class="bg-white rounded-lg border border-gray-200 p-6">
                                <h4 class="font-semibold text-gray-900 mb-2">${startup.name}</h4>
                                <p class="text-gray-600 text-sm mb-3">${startup.description || 'No description'}</p>
                                <p class="text-blue-600 text-xs font-medium mb-3">💰 ${startup.funding_stage || 'Pre-seed'} | 🏭 ${startup.industry || 'N/A'}</p>
                                <button onclick="window.collabHubRouter.navigate('/startups/${startup.id}')" class="text-blue-600 hover:text-blue-700 text-sm font-medium">View Details →</button>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-center">
                        <p class="text-gray-700">You haven't saved any startups yet.</p>
                        <button onclick="window.collabHubRouter.navigate('/explore-startups')" class="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Explore Investment Opportunities</button>
                    </div>
                `}

                <h3 class="text-lg font-bold text-gray-900 mb-4">Recommended for You</h3>
                ${recommendations.length > 0 ? `
                    <div class="grid md:grid-cols-2 gap-6">
                        ${recommendations.slice(0, 6).map(startup => `
                            <div class="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                                <h4 class="font-semibold text-gray-900 mb-2">${startup.name}</h4>
                                <p class="text-gray-600 text-sm mb-3 line-clamp-2">${startup.description || 'No description'}</p>
                                <p class="text-blue-600 text-xs font-medium">✨ Recommended Match</p>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="bg-gray-50 rounded-lg p-6 text-center">
                        <p class="text-gray-600">No recommendations yet. Complete your profile to get better matches.</p>
                    </div>
                `}
            `;

            content.innerHTML = html;
        } catch (error) {
            console.error('Error loading investor dashboard:', error);
            content.innerHTML = `
                <div class="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <p class="text-red-600 font-medium">Unable to load dashboard</p>
                    <button onclick="location.reload()" class="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Refresh Page</button>
                </div>
            `;
        }
    }

    async loadProfile(container) {
        const content = container.querySelector('#profile-content');
        
        try {
            // Fetch current user profile
            const response = await fetch('/api/v1/users/me/', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Profile API error: ${response.status}`);
            }

            const user = await response.json();
            const avatar = user.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=0ea5e9&color=fff`;
            const skills = user.skills || [];
            const role = user.role || 'Member';

            let html = `
                <div class="space-y-6">
                    <!-- Profile Header -->
                    <div class="bg-white rounded-lg border border-gray-200 p-8">
                        <div class="flex items-start justify-between mb-6">
                            <div class="flex items-center gap-6">
                                <img src="${avatar}" alt="${user.full_name}" class="w-24 h-24 rounded-full object-cover">
                                <div>
                                    <h1 class="text-3xl font-bold text-gray-900">${user.full_name}</h1>
                                    <p class="text-gray-600">@${user.username}</p>
                                    <p class="text-blue-600 font-medium mt-2">${role.charAt(0).toUpperCase() + role.slice(1)}</p>
                                </div>
                            </div>
                            <button onclick="showEditProfileModal()" class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">✏️ Edit Profile</button>
                        </div>

                        <p class="text-gray-700 mb-6">${user.bio || 'No bio yet. Add one to tell others about yourself!'}</p>

                        ${user.email ? `
                            <div class="mb-4">
                                <p class="text-gray-600 text-sm">Email</p>
                                <p class="text-gray-900">${user.email}</p>
                            </div>
                        ` : ''}

                        ${user.location ? `
                            <div class="mb-4">
                                <p class="text-gray-600 text-sm">Location</p>
                                <p class="text-gray-900">📍 ${user.location}</p>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Skills Section -->
                    <div class="bg-white rounded-lg border border-gray-200 p-8">
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="text-xl font-bold text-gray-900">Skills</h2>
                            <button onclick="showAddSkillModal()" class="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">+ Add Skill</button>
                        </div>

                        ${skills && skills.length > 0 ? `
                            <div class="flex flex-wrap gap-2">
                                ${skills.map(skill => `
                                    <div class="flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full">
                                        <span class="text-sm font-medium">${skill.name || skill}</span>
                                        <button onclick="removeSkill('${skill.id || skill}')" class="text-blue-400 hover:text-blue-700">✕</button>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <p class="text-gray-600 text-center py-8">No skills yet. Add your first skill to get started!</p>
                        `}
                    </div>

                    <!-- Experience Section -->
                    <div class="bg-white rounded-lg border border-gray-200 p-8">
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="text-xl font-bold text-gray-900">Experience</h2>
                            <button onclick="showAddExperienceModal()" class="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">+ Add Experience</button>
                        </div>

                        ${user.experience && user.experience.length > 0 ? `
                            <div class="space-y-4">
                                ${user.experience.map(exp => `
                                    <div class="border-l-4 border-blue-600 pl-4">
                                        <h3 class="font-semibold text-gray-900">${exp.title}</h3>
                                        <p class="text-gray-600">${exp.company}</p>
                                        <p class="text-gray-500 text-sm">${exp.start_date} - ${exp.end_date || 'Present'}</p>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <p class="text-gray-600 text-center py-8">No experience yet.</p>
                        `}
                    </div>

                    <!-- Social Links -->
                    <div class="bg-white rounded-lg border border-gray-200 p-8">
                        <h2 class="text-xl font-bold text-gray-900 mb-6">Social Links</h2>
                        <div class="space-y-4">
                            ${user.website ? `<p class="flex items-center gap-2"><span class="text-gray-600">🌐</span> <a href="${user.website}" target="_blank" class="text-blue-600 hover:text-blue-700">${user.website}</a></p>` : ''}
                            ${user.linkedin ? `<p class="flex items-center gap-2"><span class="text-gray-600">💼</span> <a href="${user.linkedin}" target="_blank" class="text-blue-600 hover:text-blue-700">LinkedIn Profile</a></p>` : ''}
                            ${user.github ? `<p class="flex items-center gap-2"><span class="text-gray-600">🐙</span> <a href="${user.github}" target="_blank" class="text-blue-600 hover:text-blue-700">GitHub Profile</a></p>` : ''}
                        </div>
                    </div>
                </div>
            `;

            content.innerHTML = html;
        } catch (error) {
            console.error('Error loading profile:', error);
            content.innerHTML = `
                <div class="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <p class="text-red-600 font-medium">Unable to load profile</p>
                    <p class="text-gray-500 text-sm mt-2">Please try refreshing the page</p>
                    <button onclick="location.reload()" class="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Refresh Page</button>
                </div>
            `;
        }
    }

    loadOpportunities(container) {
        // Placeholder - implement with real API
        setTimeout(() => {
            const content = container.querySelector('#opportunities-container');
            if (content) {
                content.innerHTML = `
                    <div class="bg-white rounded-lg border border-gray-200 p-6">
                        <p class="text-gray-600">Opportunities will appear here.</p>
                    </div>
                `;
            }
        }, 500);
    }

    /**
     * Utility Methods
     */

    showLandingPage() {
        const landingRoot = document.getElementById('landing-root');
        const appRoot = document.getElementById('app-root');
        
        if (appRoot) appRoot.classList.add('hidden');
        if (landingRoot) landingRoot.classList.remove('hidden');

        // Load existing index.html landing page
        // The landing page is already in the HTML
        this.hideLoadingScreen();
    }

    hideLoadingScreen() {
        const screen = document.getElementById('loading-screen');
        if (screen) {
            screen.style.opacity = '0';
            setTimeout(() => screen.classList.add('hidden'), 300);
        }
    }
}

// Global function to remove a skill
window.removeSkill = async function(skillId) {
    try {
        const response = await fetch(`/api/v1/users/me/skills/${skillId}/`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            showToast('Skill removed successfully', 'success');
            // Reload the profile
            location.reload();
        } else {
            showToast('Failed to remove skill', 'error');
        }
    } catch (error) {
        console.error('Error removing skill:', error);
        showToast('Error removing skill', 'error');
    }
};

// Initialize router when DOM is ready
let router = null;
document.addEventListener('DOMContentLoaded', async () => {
    router = new CollabHubRouter();
    await router.init();
});
