document.addEventListener('DOMContentLoaded', async () => {
    // Проверка авторизации
    const authCheck = await checkAuth();
    if (!authCheck.authenticated) {
        window.location.href = 'index.html';
        return;
    }
    
    // Загрузка данных пользователя
    loadProfileData();
    loadCoupons();
    
    // Обработчики форм с исправленными именами
    document.getElementById('profile-form').addEventListener('submit', handleProfileUpdate);
    document.getElementById('password-form').addEventListener('submit', handlePasswordChange);
});

async function loadProfileData() {
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    document.getElementById('profile-name').value = user.name;
    document.getElementById('profile-email').value = user.email;
}

async function loadCoupons() {
    const container = document.getElementById('coupons-container');
    container.innerHTML = '<p>Загрузка купонов...</p>';

    try {
        const response = await fetch('php/get_coupons.php');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Ожидался JSON, получен: ${contentType}. Ответ: ${text}`);
        }
        
        const data = await response.json();
        
        container.innerHTML = '';
        
        if (!Array.isArray(data)) {
            if (data.error) {
                throw new Error(data.error);
            }
            throw new Error(`Некорректный формат данных: ${JSON.stringify(data)}`);
        }
        
        if (data.length === 0) {
            container.innerHTML = '<p>У вас нет активных купонов</p>';
            return;
        }
        
        const fragment = document.createDocumentFragment();
        
        data.forEach(coupon => {
            const couponElement = document.createElement('div');
            couponElement.className = 'coupon-card';
            
            // Генерируем название на основе данных
            const discount = coupon.discount !== undefined ? coupon.discount : '?';
            const code = coupon.code || 'XXXX-XXXX-XXXX';
            const expiry = coupon.expiry_date ? new Date(coupon.expiry_date).toLocaleDateString() : 'не указана';
            
            couponElement.innerHTML = `
                <h3>Купон на скидку ${discount}%</h3>
                <p>Код: <strong>${code}</strong></p>
                <p>Действует до: ${expiry}</p>
            `;
            fragment.appendChild(couponElement);
        });
        
        container.appendChild(fragment);
    } catch (error) {
        console.error('Ошибка загрузки купонов:', error);
        container.innerHTML = `<p class="error">Ошибка: ${error.message}</p>`;
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const name = document.getElementById('profile-name').value;
    const email = document.getElementById('profile-email').value;
    const statusEl = document.getElementById('profile-status');
    
    try {
        const response = await fetch('php/update_profile.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email })
        });
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        if (result.info) {
            // Данные идентичны текущим
            statusEl.textContent = result.info;
            statusEl.className = 'info';
            
            // Автоматическое скрытие сообщения через 3 секунды
            setTimeout(() => {
                statusEl.textContent = '';
                statusEl.className = '';
            }, 3000);
            return;
        }
        
        // Обновляем данные в сессии
        const user = JSON.parse(sessionStorage.getItem('currentUser'));
        user.name = name;
        user.email = email;
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        
        statusEl.textContent = 'Данные успешно обновлены!';
        statusEl.className = 'success';
        
        // Автоматическое скрытие сообщения через 3 секунды
        setTimeout(() => {
            statusEl.textContent = '';
            statusEl.className = '';
        }, 3000);
    } catch (error) {
        console.error('Update error:', error);
        statusEl.textContent = error.message;
        statusEl.className = 'error';
        
        // Автоматическое скрытие сообщения через 3 секунды
        setTimeout(() => {
            statusEl.textContent = '';
            statusEl.className = '';
        }, 3000);
    }
}

async function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const statusEl = document.getElementById('password-status');
    
    if (newPassword !== confirmPassword) {
        statusEl.textContent = 'Пароли не совпадают';
        statusEl.className = 'error';
        
        // Автоматическое скрытие сообщения через 3 секунды
        setTimeout(() => {
            statusEl.textContent = '';
            statusEl.className = '';
        }, 3000);
        return;
    }
    
    try {
        const response = await fetch('php/change_password.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        if (result.info) {
            // Новый пароль совпадает с текущим
            statusEl.textContent = result.info;
            statusEl.className = 'info';
            
            // Автоматическое скрытие сообщения через 3 секунды
            setTimeout(() => {
                statusEl.textContent = '';
                statusEl.className = '';
            }, 3000);
            return;
        }
        
        statusEl.textContent = 'Пароль успешно изменен!';
        statusEl.className = 'success';
        
        // Очищаем поля
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
        
        // Автоматическое скрытие сообщения через 3 секунды
        setTimeout(() => {
            statusEl.textContent = '';
            statusEl.className = '';
        }, 3000);
    } catch (error) {
        statusEl.textContent = error.message;
        statusEl.className = 'error';
        
        // Автоматическое скрытие сообщения через 3 секунды
        setTimeout(() => {
            statusEl.textContent = '';
            statusEl.className = '';
        }, 3000);
    }
}

// Проверка авторизации при загрузке
async function checkAuth() {
    try {
        const response = await fetch('php/check_auth.php');
        const result = await response.json();
        
        if (result.authenticated) {
            currentUser = result.user;
            updateAuthUI(currentUser);

            // Сохраняем данные пользователя для других страниц
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
        return result;
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        return { authenticated: false };
    }
}

function updateAuthUI(user) {
    const authLinks = document.querySelectorAll('#auth-link, #auth-link-cart');
    const ordersLinks = document.querySelectorAll('#orders-link, #orders-link-cart');
    
    authLinks.forEach(authLink => {
        if (user) {
            authLink.innerHTML = `
                <div class="user-menu">
                    <span>Привет, ${user.name}!</span>
                    <button class="btn" onclick="logoutUser()" style="padding: 0.5rem 1rem; font-size: 0.9rem;">Выйти</button>
                </div>
            `;
        } else {
            authLink.innerHTML = '<a href="#" onclick="showAuth()">Войти</a>';
        }
    });
    
    ordersLinks.forEach(link => {
        if (user) {
            link.style.display = 'block';
        } else {
            link.style.display = 'none';
        }
    });
}

// Обновление счетчика корзины
function updateCartCounter() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-counter').textContent = totalItems;
}

// Выход
async function logoutUser() {
    try {
        await fetch('php/logout.php');
        currentUser = null;
        cart = [];
        updateAuthUI(null);
        updateCartCounter();
        return true;
    } catch (error) {
        console.error('Ошибка выхода:', error);
        throw error;
    }
}