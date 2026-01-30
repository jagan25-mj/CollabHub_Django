/**
 * CollabHub Global State Management
 * Single source of truth for user, role, authentication, notifications
 * 
 * Used by all pages - NO DUPLICATED STATE
 */

class CollabHubStateManager {
    constructor() {
        this.user = null;
        this.role = null;
        this.isAuthenticated = false;
        this.notifications = [];
        this.unreadCount = 0;
        this.sessionToken = localStorage.getItem('auth_token');
        this.initialized = false;
        this.listeners = [];
    }

    /**
     * Initialize state from backend
     */
    async init() {
        if (this.initialized) return;
        
        try {
            // Try to fetch current user from API
            const response = await fetch('/api/v1/users/me/', {
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                this.setUser(userData);
                this.isAuthenticated = true;
            } else if (response.status === 401) {
                this.logout();
            }
        } catch (error) {
            console.error('Failed to initialize state:', error);
        }

        this.initialized = true;
    }

    /**
     * Set user and extract role
     */
    setUser(userData) {
        this.user = userData;
        this.role = userData.role || 'talent'; // Default to talent
        this.notifyListeners();
    }

    /**
     * Get current user
     */
    getUser() {
        return this.user;
    }

    /**
     * Get user role (founder, talent, investor)
     */
    getRole() {
        return this.role;
    }

    /**
     * Check if user has specific role
     */
    hasRole(role) {
        return this.role === role;
    }

    /**
     * Check authentication status
     */
    isLoggedIn() {
        return this.isAuthenticated && !!this.sessionToken;
    }

    /**
     * Set authentication token
     */
    setToken(token) {
        this.sessionToken = token;
        localStorage.setItem('auth_token', token);
        this.isAuthenticated = true;
    }

    /**
     * Logout
     */
    logout() {
        this.user = null;
        this.role = null;
        this.isAuthenticated = false;
        this.sessionToken = null;
        localStorage.removeItem('auth_token');
        this.notifyListeners();
        window.location.href = '/login';
    }

    /**
     * Get authorization header
     */
    getAuthHeader() {
        if (!this.sessionToken) return {};
        return { 'Authorization': `Bearer ${this.sessionToken}` };
    }

    /**
     * Add listener for state changes
     */
    subscribe(listener) {
        this.listeners.push(listener);
    }

    /**
     * Notify all listeners of state change
     */
    notifyListeners() {
        this.listeners.forEach(listener => listener(this));
    }

    /**
     * Update notifications
     */
    async loadNotifications() {
        try {
            const response = await fetch('/api/v1/notifications/', {
                headers: this.getAuthHeader()
            });
            if (response.ok) {
                this.notifications = await response.json();
                this.unreadCount = this.notifications.filter(n => !n.read).length;
                this.notifyListeners();
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    }

    /**
     * Mark notification as read
     */
    async markNotificationRead(notificationId) {
        try {
            await fetch(`/api/v1/notifications/${notificationId}/read/`, {
                method: 'POST',
                headers: {
                    ...this.getAuthHeader(),
                    'Content-Type': 'application/json'
                }
            });
            await this.loadNotifications();
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    }
}

// Global singleton instance
window.CollabHubState = new CollabHubStateManager();

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await window.CollabHubState.init();
});
