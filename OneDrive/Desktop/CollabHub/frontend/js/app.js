/**
 * CollabHub Main App Script
 * Handles common functionality across pages
 */

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Check auth status and update navigation
    updateNavigation();

    // Initialize mobile menu if present
    initMobileMenu();

    // Add smooth scrolling for anchor links
    initSmoothScroll();

    // Initialize logout functionality
    initLogout();

    // Initialize notifications
    initNotifications();
}

/**
 * Update navigation based on auth status
 */
function updateNavigation() {
    const { isAuthenticated, getUserData } = window.CollabHubAPI || {};
    
    // Get navigation elements
    const unauthenticatedNav = document.getElementById('unauthenticated-nav');
    const authenticatedNav = document.getElementById('authenticated-nav');
    const unauthenticatedActions = document.getElementById('unauthenticated-actions');
    const authenticatedActions = document.getElementById('authenticated-actions');
    const dashboardLink = document.getElementById('dashboard-link');

    if (isAuthenticated && isAuthenticated()) {
        // User is logged in - show authenticated navigation
        if (unauthenticatedNav) unauthenticatedNav.classList.add('hidden');
        if (authenticatedNav) authenticatedNav.classList.remove('hidden');
        if (unauthenticatedActions) unauthenticatedActions.classList.add('hidden');
        if (authenticatedActions) authenticatedActions.classList.remove('hidden');
        
        // Set dashboard link based on user role
        if (dashboardLink && getUserData) {
            const user = getUserData();
            if (user && user.role) {
                const dashboards = {
                    founder: '/app/dashboard-founder',
                    talent: '/app/dashboard-talent',
                    investor: '/app/dashboard-investor',
                    student: '/app/dashboard-talent'
                };
                dashboardLink.href = dashboards[user.role] || dashboards.talent;
            }
        }
    } else {
        // User is logged out - show unauthenticated navigation
        if (unauthenticatedNav) unauthenticatedNav.classList.remove('hidden');
        if (authenticatedNav) authenticatedNav.classList.add('hidden');
        if (unauthenticatedActions) unauthenticatedActions.classList.remove('hidden');
        if (authenticatedActions) authenticatedActions.classList.add('hidden');
    }
}

/**
 * Initialize logout functionality
 */
function initLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

/**
 * Initialize mobile menu toggle
 */
function initMobileMenu() {
    const menuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (menuButton && mobileMenu) {
        menuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
}

/**
 * Smooth scrolling for anchor links
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

/**
 * Initialize notifications
 */
function initNotifications() {
    const { isAuthenticated } = window.CollabHubAPI || {};

    if (!isAuthenticated || !isAuthenticated()) {
        return; // User not authenticated, skip notifications
    }

    const bell = document.getElementById('notification-bell');
    const dropdown = document.getElementById('notification-dropdown');
    const clearBtn = document.getElementById('clear-all-notifications');

    if (!bell || !dropdown) return;

    // Toggle dropdown
    bell.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
        if (!dropdown.classList.contains('hidden')) {
            loadNotifications();
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== bell) {
            dropdown.classList.add('hidden');
        }
    });

    // Clear all notifications
    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            await markAllNotificationsRead();
            await loadNotifications();
        });
    }

    // Load notifications initially
    loadNotifications();

    // Auto-refresh notifications every 10 seconds
    setInterval(loadNotifications, 10000);
}

/**
 * Load notifications from API
 */
async function loadNotifications() {
    const { api, getAccessToken } = window.CollabHubAPI || {};

    if (!api || !getAccessToken) return;

    try {
        const response = await fetch('/api/v1/collaborations/notifications/', {
            headers: {
                'Authorization': `Bearer ${getAccessToken()}`
            }
        });

        if (!response.ok) throw new Error('Failed to load notifications');

        const data = await response.json();
        const notifications = Array.isArray(data) ? data : data.results || [];

        // Update notification count
        const unreadCount = notifications.filter(n => !n.is_read).length;
        updateNotificationCount(unreadCount);

        // Render notifications
        renderNotifications(notifications);
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

/**
 * Render notifications in dropdown
 */
function renderNotifications(notifications) {
    const container = document.getElementById('notification-items');

    if (!container) return;

    if (notifications.length === 0) {
        container.innerHTML = '<div class="p-4 text-center text-gray-400 text-sm">No notifications</div>';
        return;
    }

    container.innerHTML = notifications.slice(0, 10).map(notif => `
        <div class="p-4 hover:bg-white/5 transition-colors cursor-pointer ${notif.is_read ? '' : 'bg-white/5'}" data-notification-id="${notif.id}">
            <div class="flex justify-between items-start mb-1">
                <h4 class="text-white font-medium text-sm">${notif.title || 'Notification'}</h4>
                <button class="text-gray-400 hover:text-white transition-colors delete-notification" data-id="${notif.id}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <p class="text-gray-300 text-sm">${notif.message || ''}</p>
            <p class="text-gray-500 text-xs mt-2">${formatRelativeTime(notif.created_at)}</p>
        </div>
    `).join('');

    // Add event listeners
    document.querySelectorAll('.delete-notification').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            await deleteNotification(id);
            await loadNotifications();
        });
    });

    // Mark as read on click
    document.querySelectorAll('[data-notification-id]').forEach(item => {
        item.addEventListener('click', async () => {
            const id = item.getAttribute('data-notification-id');
            await markNotificationRead(id);
        });
    });
}

/**
 * Update notification count badge
 */
function updateNotificationCount(count) {
    const countBadge = document.getElementById('notification-count');

    if (!countBadge) return;

    if (count > 0) {
        countBadge.textContent = count > 9 ? '9+' : count;
        countBadge.classList.remove('hidden');
    } else {
        countBadge.classList.add('hidden');
    }
}

/**
 * Mark notification as read
 */
async function markNotificationRead(notificationId) {
    const { getAccessToken } = window.CollabHubAPI || {};

    if (!getAccessToken) return;

    try {
        await fetch(`/api/v1/collaborations/notifications/${notificationId}/`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${getAccessToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_read: true })
        });

        await loadNotifications();
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

/**
 * Mark all notifications as read
 */
async function markAllNotificationsRead() {
    const { getAccessToken } = window.CollabHubAPI || {};

    if (!getAccessToken) return;

    try {
        await fetch('/api/v1/collaborations/notifications/read/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAccessToken()}`,
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
    }
}

/**
 * Delete notification
 */
async function deleteNotification(notificationId) {
    const { getAccessToken } = window.CollabHubAPI || {};

    if (!getAccessToken) return;

    try {
        await fetch(`/api/v1/collaborations/notifications/${notificationId}/`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getAccessToken()}`
            }
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500'
    };

    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg text-white ${colors[type]} shadow-lg z-50 transform transition-all duration-300 translate-y-0`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('translate-y-full', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) return formatDate(dateString);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
}

/**
 * Truncate text with ellipsis
 */
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Debounce function for search inputs
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
 * Redirect to dashboard based on user role
 */
function redirectToDashboard() {
    const { getUserData } = window.CollabHubAPI || {};
    const user = getUserData ? getUserData() : null;

    if (!user) {
        window.location.href = '/app/login';
        return;
    }

    const dashboards = {
        founder: '/app/dashboard-founder',
        talent: '/app/dashboard-talent',
        investor: '/app/dashboard-investor',
        student: '/app/dashboard-talent'
    };

    window.location.href = dashboards[user.role] || dashboards.talent;
}

/**
 * Protect page - redirect if not authenticated
 */
function requireAuth() {
    const { isAuthenticated } = window.CollabHubAPI || {};

    if (!isAuthenticated || !isAuthenticated()) {
        window.location.href = '/app/login?redirect=' + encodeURIComponent(window.location.href);
        return false;
    }
    return true;
}

/**
 * Handle logout
 */
async function handleLogout() {
    const { api } = window.CollabHubAPI || {};

    try {
        if (api) {
            await api.logout();
        }
        showToast('Logged out successfully', 'success');
    } catch (e) {
        console.error('Logout error:', e);
        showToast('Logout failed', 'error');
    }

    // Always redirect to home page after logout attempt
    setTimeout(() => {
        window.location.href = '/';
    }, 1000);
}

// Export utilities
window.AppUtils = {
    showToast,
    formatDate,
    formatRelativeTime,
    truncateText,
    debounce,
    redirectToDashboard,
    requireAuth,
    handleLogout,
    updateNavigation
};