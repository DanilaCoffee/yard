const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const loginInput = document.getElementById('loginInput');
const passwordInput = document.getElementById('passwordInput');
const loginError = document.getElementById('loginError');

function showLoginModal() {
    loginModal.style.display = 'flex';
    loginInput.focus();
    loginError.style.display = 'none';
}

function hideLoginModal() {
    loginModal.style.display = 'none';
}

async function checkAuth() {
    try {
        const response = await fetch('/api/admin/check-auth');
        const data = await response.json();
        
        if (!data.isAuthenticated) {
            showLoginModal();
            return false;
        }

        hideLoginModal();
        return true;
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        showLoginModal();
        return false;
    }
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitButton = loginForm.querySelector('.login-button');
    submitButton.disabled = true;
    submitButton.textContent = 'Вход...';
    loginError.style.display = 'none';
    
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                login: loginInput.value.trim(),
                password: passwordInput.value
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            hideLoginModal();
            loginForm.reset();
            location.reload();
        } else {
            loginError.textContent = data.message || 'Неверный логин или пароль';
            loginError.style.display = 'block';
            passwordInput.value = '';
            passwordInput.focus();
        }
    } catch (error) {
        console.error('Ошибка при входе:', error);
        loginError.textContent = 'Ошибка соединения с сервером';
        loginError.style.display = 'block';
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Войти';
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            if (confirm('Вы уверены, что хотите выйти?')) {
                await fetch('/api/admin/logout', { method: 'POST' });
                location.reload();
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    const isAuth = await checkAuth();
});