// Login page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Toggle password visibility
    document.getElementById('toggle-password').addEventListener('click', function () {
        const input = document.querySelector('input[name="password"]');
        input.type = input.type === 'password' ? 'text' : 'password';
    });

    // Handle form submission
    document.getElementById('login-form').addEventListener('submit', async function (e) {
        e.preventDefault();

        // Defensive check for API
        if (!window.CollabHubAPI) {
            const errorDiv = document.getElementById('error-message');
            errorDiv.textContent = 'Application failed to load. Please refresh the page.';
            errorDiv.classList.remove('hidden');
            return;
        }

        const submitBtn = document.getElementById('submit-btn');
        const spinner = document.getElementById('loading-spinner');
        const errorDiv = document.getElementById('error-message');

        const email = this.email.value;
        const password = this.password.value;

        // Show loading
        submitBtn.disabled = true;
        spinner.classList.remove('hidden');
        errorDiv.classList.add('hidden');

        try {
            const { api } = window.CollabHubAPI;
            const response = await api.login(email, password);
            const user = window.CollabHubAPI.getUserData();
            
            // Redirect based on role
            const dashboards = {
                founder: '/app/dashboard-founder',
                talent: '/app/dashboard-talent',
                investor: '/app/dashboard-investor',
                student: '/app/dashboard-talent'
            };
            window.location.href = dashboards[user.role] || '/app/dashboard-talent';

        } catch (error) {
            errorDiv.textContent = error.message || 'Invalid credentials. Please try again.';
            errorDiv.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            spinner.classList.add('hidden');
        }
    });
});