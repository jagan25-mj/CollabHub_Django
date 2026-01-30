/**
 * CollabHub Main App Script
 * Unified application initialization
 * 
 * Architecture:
 * - Router handles all page navigation
 * - State manages user/auth/notifications globally
 * - Components provides consistent UI
 * - This file coordinates initialization only
 */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeApplication();
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showToast('Failed to load application. Please refresh.', 'error');
    }
});

/**
 * Initialize the entire application
 */
async function initializeApplication() {
    // Step 1: Check authentication
    const isAuthenticated = localStorage.getItem('auth_token') !== null;

    // Step 2: Initialize state manager if authenticated
    if (isAuthenticated) {
        await window.CollabHubState.init();
        
        // Subscribe to state changes
        window.CollabHubState.subscribe((state) => {
            console.log('State updated:', state);
            // Any global listeners would go here
        });
    }

    // Step 3: Router will handle everything from here
    // The router is already initialized in router.js
}

/**
 * Utility: Show toast notification
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500'
    };

    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg text-white ${colors[type]} shadow-lg z-50`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

/**
 * Utility: Format relative time
 */
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) return new Date(dateString).toLocaleDateString();
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
}

/**
 * Utility: Truncate text
 */
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Utility: Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Utility: Check if user is authenticated
 */
function isUserAuthenticated() {
    return window.CollabHubState?.isLoggedIn() || localStorage.getItem('auth_token') !== null;
}

/**
 * Utility: Get current user
 */
function getCurrentUser() {
    return window.CollabHubState?.getUser() || null;
}

/**
 * Utility: Get current user role
 */
function getUserRole() {
    return window.CollabHubState?.getRole() || null;
}

/**
 * Utility: Handle logout
 */
async function handleLogout() {
    try {
        // Clear auth token
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');

        // Log out from state manager
        window.CollabHubState?.logout();

        showToast('Logged out successfully', 'success');

        // Redirect to login
        setTimeout(() => {
            window.location.href = '/login';
        }, 1000);
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Logout failed', 'error');
    }
}

/**
 * Utility: Export utilities for global access
 */
window.AppUtils = {
    showToast,
    formatRelativeTime,
    truncateText,
    debounce,
    isUserAuthenticated,
    getCurrentUser,
    getUserRole,
    handleLogout,
};

/**
 * Utility: Create default navbar interactions
 * This is used by components that need navbar functionality
 */
window.setupDefaultNavbarInteractions = function() {
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Notification bell
    const notificationBtn = document.getElementById('notifications-btn');
    const notificationDropdown = document.getElementById('notifications-dropdown');
    
    if (notificationBtn && notificationDropdown) {
        notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationDropdown.classList.toggle('hidden');
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!notificationDropdown.contains(e.target) && e.target !== notificationBtn) {
                notificationDropdown.classList.add('hidden');
            }
        });
    }

    // Profile dropdown
    const profileBtn = document.getElementById('profile-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    
    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('hidden');
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!profileDropdown.contains(e.target) && e.target !== profileBtn) {
                profileDropdown.classList.add('hidden');
            }
        });
    }
};

