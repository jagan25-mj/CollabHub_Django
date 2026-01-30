/**
 * CollabHub UI Components Library
 * Reusable, consistent UI components across all pages
 * 
 * Features:
 * - Clean white design system
 * - Consistent spacing and typography
 * - Standardized components (cards, buttons, forms, etc.)
 */

// ============================================================================
// NAVIGATION COMPONENT
// ============================================================================

function createAppShell(pageContent) {
    const shell = document.createElement('div');
    shell.className = 'min-h-screen bg-white';

    shell.innerHTML = `
        <!-- Global Navbar -->
        <nav class="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16 items-center">
                    <!-- Logo -->
                    <a href="/home" class="flex items-center space-x-2">
                        <div class="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                            <span class="text-white font-bold text-lg">C</span>
                        </div>
                        <span class="text-gray-900 font-semibold text-lg">CollabHub</span>
                    </a>

                    <!-- Main Navigation (Authenticated) -->
                    <div id="main-nav" class="hidden md:flex items-center space-x-8">
                        <a href="/home" class="text-gray-600 hover:text-gray-900 font-medium text-sm">Home</a>
                        <a href="/explore-startups" class="text-gray-600 hover:text-gray-900 font-medium text-sm">Explore</a>
                        <a href="/network" class="text-gray-600 hover:text-gray-900 font-medium text-sm">Network</a>
                        <a href="/messages" class="text-gray-600 hover:text-gray-900 font-medium text-sm">Messages</a>
                        <a id="dashboard-link" href="/dashboard" class="text-gray-600 hover:text-gray-900 font-medium text-sm">Dashboard</a>
                    </div>

                    <!-- Right Side Actions -->
                    <div class="flex items-center space-x-4">
                        <!-- Notifications Bell -->
                        <div class="relative">
                            <button id="notifications-btn" class="relative p-2 text-gray-600 hover:text-gray-900">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                                </svg>
                                <span id="unread-count" class="hidden absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"></span>
                            </button>
                            <!-- Notifications Dropdown -->
                            <div id="notifications-dropdown" class="hidden absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-h-96 overflow-y-auto">
                                <h3 class="font-semibold text-gray-900 mb-4">Notifications</h3>
                                <div id="notifications-list" class="space-y-3"></div>
                            </div>
                        </div>

                        <!-- Profile Dropdown -->
                        <div class="relative">
                            <button id="profile-btn" class="flex items-center space-x-2 p-2 text-gray-600 hover:text-gray-900">
                                <div id="user-avatar" class="w-8 h-8 bg-gray-300 rounded-full"></div>
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                                </svg>
                            </button>
                            <!-- Profile Dropdown Menu -->
                            <div id="profile-dropdown" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                                <a href="/profile" class="block px-4 py-3 text-gray-700 hover:bg-gray-50 border-b border-gray-100">Profile</a>
                                <a href="#" id="settings-link" class="block px-4 py-3 text-gray-700 hover:bg-gray-50 border-b border-gray-100">Settings</a>
                                <button id="logout-btn" class="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 font-medium">Logout</button>
                            </div>
                        </div>
                    </div>

                    <!-- Mobile Menu Button -->
                    <button id="mobile-menu-btn" class="md:hidden p-2 text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                        </svg>
                    </button>
                </div>

                <!-- Mobile Menu -->
                <div id="mobile-menu" class="hidden md:hidden border-t border-gray-200">
                    <div class="px-4 py-3 space-y-2">
                        <a href="/home" class="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">Home</a>
                        <a href="/explore-startups" class="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">Explore</a>
                        <a href="/network" class="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">Network</a>
                        <a href="/messages" class="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">Messages</a>
                        <a id="mobile-dashboard-link" href="/dashboard" class="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">Dashboard</a>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Main Content -->
        <main class="pt-20 pb-12" id="app-content">
        </main>

        <!-- Auth Guard Modal -->
        <div id="auth-guard-modal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                <h2 class="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h2>
                <p class="text-gray-600 mb-6">You need to be logged in to access this page.</p>
                <div class="space-y-3">
                    <a href="/login" class="block w-full text-center px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Sign In</a>
                    <a href="/register" class="block w-full text-center px-4 py-3 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200">Create Account</a>
                </div>
            </div>
        </div>

        <!-- Loading Overlay -->
        <div id="loading-overlay" class="hidden fixed inset-0 bg-black/20 flex items-center justify-center z-40">
            <div class="animate-spin">
                <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
            </div>
        </div>

        <!-- Toast Notifications -->
        <div id="toast-container" class="fixed bottom-4 right-4 space-y-2 z-50"></div>
    `;

    // Insert page content
    const contentArea = shell.querySelector('#app-content');
    contentArea.appendChild(pageContent);

    return shell;
}

// ============================================================================
// CARD COMPONENT
// ============================================================================

function createCard(options = {}) {
    const {
        title,
        subtitle,
        content,
        action,
        actionLabel = 'View',
        className = ''
    } = options;

    const card = document.createElement('div');
    card.className = `bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow ${className}`;

    let html = '';
    if (title) html += `<h3 class="text-lg font-semibold text-gray-900 mb-2">${title}</h3>`;
    if (subtitle) html += `<p class="text-sm text-gray-600 mb-4">${subtitle}</p>`;
    if (content) html += `<div class="text-gray-700 mb-4">${content}</div>`;
    if (action) html += `<button class="text-blue-600 hover:text-blue-700 font-medium text-sm">${actionLabel}</button>`;

    card.innerHTML = html;
    if (action) {
        card.querySelector('button').addEventListener('click', action);
    }

    return card;
}

// ============================================================================
// BUTTON COMPONENT
// ============================================================================

function createButton(label, options = {}) {
    const {
        variant = 'primary', // primary, secondary, danger, ghost
        size = 'md', // sm, md, lg
        onClick,
        disabled = false,
        className = ''
    } = options;

    const button = document.createElement('button');
    
    const baseClasses = 'font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variantClasses = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        danger: 'bg-red-600 text-white hover:bg-red-700',
        ghost: 'text-gray-600 hover:text-gray-900'
    };

    const sizeClasses = {
        sm: 'px-3 py-1 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg'
    };

    button.className = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
    button.textContent = label;
    button.disabled = disabled;

    if (onClick) button.addEventListener('click', onClick);

    return button;
}

// ============================================================================
// FORM COMPONENTS
// ============================================================================

function createFormField(label, options = {}) {
    const {
        type = 'text',
        name,
        placeholder,
        required = false,
        value = '',
        onChange
    } = options;

    const container = document.createElement('div');
    container.className = 'mb-4';

    const labelEl = document.createElement('label');
    labelEl.className = 'block text-sm font-medium text-gray-700 mb-2';
    labelEl.textContent = label;
    if (required) labelEl.innerHTML += '<span class="text-red-600">*</span>';

    const input = document.createElement(type === 'textarea' ? 'textarea' : 'input');
    input.type = type !== 'textarea' ? type : undefined;
    input.name = name;
    input.placeholder = placeholder;
    input.required = required;
    input.value = value;
    input.className = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500';

    if (onChange) input.addEventListener('change', onChange);

    container.appendChild(labelEl);
    container.appendChild(input);

    return { container, input };
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function createLoadingSkeleton(options = {}) {
    const {
        count = 1,
        lines = 3,
        className = ''
    } = options;

    const skeletons = [];
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = `${className} animate-pulse`;
        
        let html = '';
        for (let j = 0; j < lines; j++) {
            const width = j === 0 ? 'w-1/3' : j === lines - 1 ? 'w-1/2' : 'w-full';
            html += `<div class="h-4 bg-gray-200 rounded mb-3 ${width}"></div>`;
        }
        skeleton.innerHTML = html;
        skeletons.push(skeleton);
    }

    const container = document.createElement('div');
    skeletons.forEach(s => container.appendChild(s));
    return container;
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function createEmptyState(options = {}) {
    const {
        icon = '📭',
        title = 'No Data',
        message = 'No items to display',
        actionLabel,
        action
    } = options;

    const container = document.createElement('div');
    container.className = 'text-center py-12';

    let html = `
        <div class="text-4xl mb-4">${icon}</div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">${title}</h3>
        <p class="text-gray-600 mb-6">${message}</p>
    `;

    if (action) {
        html += `<button class="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">${actionLabel || 'Take Action'}</button>`;
    }

    container.innerHTML = html;
    if (action) {
        container.querySelector('button').addEventListener('click', action);
    }

    return container;
}

// ============================================================================
// TOAST NOTIFICATION
// ============================================================================

function showToast(message, options = {}) {
    const {
        type = 'info', // info, success, error, warning
        duration = 3000
    } = options;

    const container = document.getElementById('toast-container') || createToastContainer();
    
    const toast = document.createElement('div');
    
    const bgColors = {
        info: 'bg-blue-500',
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500'
    };

    toast.className = `${bgColors[type]} text-white px-4 py-3 rounded-lg shadow-lg animate-pulse`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, duration);
}

// ============================================================================
// TOAST CONTAINER
// ============================================================================

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-4 right-4 space-y-2 z-50';
    document.body.appendChild(container);
    return container;
}

// ============================================================================
// INITIALIZE APP SHELL
// ============================================================================

function initializeAppShell() {
    // Listen for state changes
    window.CollabHubState.subscribe((state) => {
        updateNavbar(state);
    });

    // Setup navbar interactions
    setupNavbarInteractions();

    // Setup auth guard
    checkAuthAndRedirect();
}

function updateNavbar(state) {
    const mainNav = document.getElementById('main-nav');
    const unreadCount = document.getElementById('unread-count');
    const userAvatar = document.getElementById('user-avatar');
    const dashboardLink = document.getElementById('dashboard-link');
    const mobileDashboardLink = document.getElementById('mobile-dashboard-link');

    if (state.isLoggedIn()) {
        // Show authenticated navbar
        if (mainNav) mainNav.classList.remove('hidden');

        // Update dashboard link based on role
        const dashboardUrl = {
            founder: '/dashboard/founder',
            talent: '/dashboard/talent',
            investor: '/dashboard/investor'
        }[state.getRole()] || '/dashboard/talent';

        if (dashboardLink) dashboardLink.href = dashboardUrl;
        if (mobileDashboardLink) mobileDashboardLink.href = dashboardUrl;

        // Update unread count
        if (state.unreadCount > 0) {
            unreadCount.textContent = state.unreadCount;
            unreadCount.classList.remove('hidden');
        } else {
            unreadCount.classList.add('hidden');
        }

        // Update avatar
        if (userAvatar && state.user) {
            const initials = (state.user.first_name?.[0] || state.user.email?.[0] || '?').toUpperCase();
            userAvatar.textContent = initials;
        }
    }
}

function setupNavbarInteractions() {
    const notificationsBtn = document.getElementById('notifications-btn');
    const notificationsDropdown = document.getElementById('notifications-dropdown');
    const profileBtn = document.getElementById('profile-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const logoutBtn = document.getElementById('logout-btn');

    // Notifications
    if (notificationsBtn) {
        notificationsBtn.addEventListener('click', () => {
            notificationsDropdown?.classList.toggle('hidden');
            profileDropdown?.classList.add('hidden');
        });
    }

    // Profile
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            profileDropdown?.classList.toggle('hidden');
            notificationsDropdown?.classList.add('hidden');
        });
    }

    // Mobile menu
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu?.classList.toggle('hidden');
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.CollabHubState.logout();
        });
    }

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#notifications-btn') && !e.target.closest('#notifications-dropdown')) {
            notificationsDropdown?.classList.add('hidden');
        }
        if (!e.target.closest('#profile-btn') && !e.target.closest('#profile-dropdown')) {
            profileDropdown?.classList.add('hidden');
        }
    });
}

function checkAuthAndRedirect() {
    const publicPages = ['/login', '/register', '/'];
    const currentPath = window.location.pathname;
    
    if (!publicPages.includes(currentPath) && !window.CollabHubState.isLoggedIn()) {
        const modal = document.getElementById('auth-guard-modal');
        if (modal) modal.classList.remove('hidden');
    }
}
