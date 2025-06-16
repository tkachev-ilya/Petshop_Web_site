// Глобальные переменные
let cart = [];
let currentUser = null;
let currentPage = 'shop';
let allProducts = [];
let appliedCoupon = null; // Хранит примененный купон

// ==================== АВТОРИЗАЦИЯ ====================

// Регистрация пользователя
async function registerUser(name, email, password) {
    try {
        const response = await fetch('php/register.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ name, email, password })
        });
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        return true;
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        throw error;
    }
}

// Вход пользователя
async function loginUser(email, password) {
    try {
        const response = await fetch('php/login.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        // Сохраняем пользователя
        currentUser = result.user;
        updateAuthUI(currentUser);
        await loadCartFromServer();
        
        return true;
    } catch (error) {
        console.error('Ошибка входа:', error);
        throw error;
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
            await loadCartFromServer();
            
            // Сохраняем данные пользователя для других страниц
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
        return result;
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        return { authenticated: false };
    }
}

// Перенаправление
function switchTab(tabType, event) {
    if (event instanceof Event) event.preventDefault();
    
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    
    document.querySelector(`.tab[onclick*="${tabType}"]`).classList.add('active');
    document.getElementById(`${tabType}-form`).classList.add('active');
}

// Выход
async function logoutUser() {
    try {
        await fetch('php/logout.php');
        currentUser = null;
        cart = [];
        appliedCoupon = null; // Сбросим купон при выходе
        updateAuthUI(null);
        updateCartCounter();
        return true;
    } catch (error) {
        console.error('Ошибка выхода:', error);
        throw error;
    }
}

// ==================== КОРЗИНА ====================

// Загрузка корзины с сервера
async function loadCartFromServer() {
    if (!currentUser) {
        cart = [];
        updateCartCounter();
        loadCartItems();
        return;
    }
    
    try {
        const response = await fetch('php/get_cart.php');
        const result = await response.json();
        
        if (Array.isArray(result)) {
            cart = result;
            updateCartCounter();
            loadCartItems();
        }
    } catch (error) {
        console.error('Ошибка загрузки корзины:', error);
    }
}

// Добавление в корзину
async function addToCart(event, productId) {
    if (event) event.preventDefault();
    
    if (!currentUser) {
        showAuth();
        showAuthMessage('Для добавления в корзину необходимо войти', 'error');
        return;
    }

    try {
        const response = await fetch('php/add_to_cart.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ 
                product_id: productId, 
                quantity: 1 
            })
        });
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        await loadCartFromServer();
        loadCartItems();
        
        if (event) {
            const button = event.currentTarget;
            button.textContent = 'Добавлено!';
            button.classList.add('added');
            setTimeout(() => {
                button.textContent = 'Добавить в корзину';
                button.classList.remove('added');
            }, 1000);
        }
        
    } catch (error) {
        console.error('Ошибка:', error);
        showAlert(error.message, 'error');
    }
}

// Удаление из корзины
async function removeFromCart(productId) {
    try {
        const response = await fetch('php/remove_from_cart.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ product_id: productId })
        });
        
        await loadCartFromServer();
        loadCartItems();
    } catch (error) {
        console.error('Ошибка удаления:', error);
        showAuthMessage('Ошибка при удалении товара', 'error');
    }
}

// Обновление количества
async function updateQuantity(productId, change) {
    const item = cart.find(i => i.id == productId);
    if (!item) return;
    
    // Проверка наличия при увеличении
    if (change > 0 && item.quantity >= item.stock) {
        showAlert(`Доступно только ${item.stock} шт.`, 'warning');
        return;
    }
    
    try {
        const response = await fetch('php/update_cart_item.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ 
                product_id: productId, 
                change: change 
            })
        });
        
        await loadCartFromServer();
        loadCartItems();
    } catch (error) {
        console.error('Ошибка обновления:', error);
        showAlert('Не удалось изменить количество', 'error');
    }
}

// Показать уведомление
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${type}`;
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// ==================== ТОВАРЫ ====================

// Загрузка товаров
async function loadProducts(category = '') {
    try {
        const response = await fetch(`php/get_products.php?category=${category}`);
        allProducts = await response.json();

        const productsSection = document.getElementById('products-section');
        productsSection.innerHTML = '';

        if (allProducts.length === 0) {
            productsSection.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Товары не найдены.</p>';
            return;
        }

        allProducts.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            const inStock = product.stock > 0;
            const stockInfo = inStock 
                ? `<p class="stock">В наличии: ${product.stock} шт.</p>` 
                : '<p class="stock out-of-stock">Нет в наличии</p>';
            
            productCard.innerHTML = `
                <img src="${product.image || 'https://via.placeholder.com/300x200?text=No+Image'}" 
                     class="product-image" alt="${product.product_name}">
                <h3>${product.product_name}</h3>
                <p class="description">${product.product_description ? product.product_description.substring(0, 100) + '...' : ''}</p>
                <div class="price">${product.product_price.toLocaleString('ru-RU')} ₽</div>
                ${stockInfo}
                <button class="btn add-to-cart" ${!inStock ? 'disabled' : ''}>
                    ${inStock ? 'Добавить в корзину' : 'Нет в наличии'}
                </button>
            `;
            
            const addButton = productCard.querySelector('.add-to-cart');
            addButton.addEventListener('click', (event) => {
                addToCart(event, product.id);
            });
            
            productsSection.appendChild(productCard);
        });

    } catch (error) {
        console.error('Ошибка при загрузке товаров:', error);
    }
}

// ==================== ОФОРМЛЕНИЕ ЗАКАЗА ====================

// Применение купона
async function applyCoupon() {
    const couponCode = document.getElementById('coupon-code').value.trim();
    if (!couponCode) {
        document.getElementById('coupon-message').textContent = 'Введите промокод';
        document.getElementById('coupon-message').className = 'error';
        return;
    }

    try {
        const response = await fetch('php/apply_coupon.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ coupon_code: couponCode })
        });
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        appliedCoupon = {
            code: couponCode,
            discount: result.discount,
            type: result.type // 'fixed' или 'percentage'
        };
        
        document.getElementById('coupon-message').textContent = 'Купон успешно применен!';
        document.getElementById('coupon-message').className = 'success';
        updateCartTotalWithDiscount(); // Обновляем отображение суммы
    } catch (error) {
        document.getElementById('coupon-message').textContent = error.message;
        document.getElementById('coupon-message').className = 'error';
        appliedCoupon = null;
        updateCartTotalWithDiscount();
    }
}

// Обновление отображения итоговой суммы с учетом скидки
function updateCartTotalWithDiscount() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalPriceElement = document.getElementById('total-price');
    const discountInfo = document.getElementById('discount-info');
    const discountAmountElement = document.getElementById('discount-amount');
    const totalAfterDiscount = document.getElementById('total-after-discount');
    const finalTotalSpan = document.getElementById('final-total');

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align: center; padding: 2rem;">Корзина пуста</p>';
        totalPriceElement.textContent = 'Итого: ₽0';
        discountInfo.style.display = 'none';
        totalAfterDiscount.style.display = 'none';
        return;
    }

    cartItemsContainer.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
        const itemTotal = item.product_price * item.quantity;
        total += itemTotal;
        const stockWarning = item.quantity > item.stock 
            ? `<p class="warning">Доступно только: ${item.stock} шт.</p>` 
            : '';
        
        const cartItemHTML = `
            <div class="cart-item">
                <img src="${item.image || 'https://via.placeholder.com/100x100?text=No+Image'}" alt="${item.product_name}">
                <div class="item-info">
                    <h3>${item.product_name}</h3>
                    ${stockWarning}
                    <p class="price">₽${item.product_price.toLocaleString('ru-RU')} за шт.</p>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateQuantity('${item.id}', 1)" 
                            ${item.quantity >= item.stock ? 'disabled' : ''}>+</button>
                    </div>
                </div>
                <p class="price">₽${itemTotal.toLocaleString('ru-RU')}</p>
                <button class="btn" onclick="removeFromCart('${item.id}')" style="background: #dc3545;">Удалить</button>
            </div>
        `;
        cartItemsContainer.insertAdjacentHTML('beforeend', cartItemHTML);
    });

    totalPriceElement.textContent = `Итого: ₽${total.toLocaleString('ru-RU')}`;

    let discountAmount = 0;
    
    if (appliedCoupon) {
        if (appliedCoupon.type === 'fixed') {
            discountAmount = appliedCoupon.discount;
        } else if (appliedCoupon.type === 'percentage') {
            discountAmount = total * appliedCoupon.discount / 100;
        }
        
        // Не позволяем скидке превышать сумму заказа
        discountAmount = Math.min(discountAmount, total);
        
        discountInfo.style.display = 'block';
        totalAfterDiscount.style.display = 'block';
        discountAmountElement.textContent = discountAmount.toLocaleString('ru-RU');
        finalTotalSpan.textContent = (total - discountAmount).toLocaleString('ru-RU');
    } else {
        discountInfo.style.display = 'none';
        totalAfterDiscount.style.display = 'none';
    }
}

async function submitOrder() {
    console.log("Начало оформления заказа");
    if (!currentUser) {
        throw new Error('Для оформления заказа необходимо войти');
    }
    
    if (cart.length === 0) {
        throw new Error('Корзина пуста');
    }
    
    // Проверка наличия всех товаров перед оформлением
    for (const item of cart) {
        if (item.quantity > item.stock) {
            throw new Error(`Товар "${item.product_name}" доступен только в количестве ${item.stock} шт. Уменьшите количество или удалите товар из корзины.`);
        }
    }
    
    const orderData = {
        name: document.getElementById('checkout-name').value,
        phone: document.getElementById('checkout-phone').value,
        address: document.getElementById('checkout-address').value,
        coupon_code: appliedCoupon ? appliedCoupon.code : null
    };
    
    try {
        const response = await fetch('php/create_order.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        if (!result.order_id) {
            throw new Error("Сервер не вернул ID заказа");
        }
        
        console.log("Заказ успешно создан, ID:", result.order_id);
        
        // Очищаем корзину
        await clearCartOnServer();
        cart = [];
        appliedCoupon = null; // Сбрасываем примененный купон
        updateCartCounter();
        loadCartItems();
        
        // Показываем уведомление об успехе
        showSuccessAlert('Заказ успешно оформлен!');
        
    } catch (error) {
        console.error('Ошибка оформления:', error);
        throw error;
    }
}

// Очистка корзины на сервере
async function clearCartOnServer() {
    try {
        const response = await fetch('php/clear_cart.php', {
            method: 'POST',
            credentials: 'include'
        });
        
        const result = await response.json();
        return result.success;
    } catch (error) {
        console.error('Ошибка очистки корзины:', error);
        return false;
    }
}

// Уведомление об успехе
function showSuccessAlert(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'success-alert';
    alertDiv.innerHTML = `
        <div class="alert-content">
            <div class="alert-icon">✓</div>
            <div class="alert-message">${message}</div>
        </div>
    `;
    
    if (!document.getElementById('alert-styles')) {
        const style = document.createElement('style');
        style.id = 'alert-styles';
        style.textContent = `
            .success-alert {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #28a745;
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 1000;
                animation: slideIn 0.3s ease-out;
            }
            
            .alert-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .alert-icon {
                font-size: 1.2rem;
                font-weight: bold;
            }
            
            .alert-message {
                font-weight: 500;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => alertDiv.remove(), 300);
    }, 4000);
}

// ==================== ИНТЕРФЕЙС ====================

// Обновление счетчика корзины
function updateCartCounter() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-counter').textContent = totalItems;
}

// Отображение корзины
function loadCartItems() {
    updateCartTotalWithDiscount(); // Используем обновленную функцию
}

// Обновление UI авторизации
function updateAuthUI(user) {
    const authLinks = document.querySelectorAll('#auth-link, #auth-link-cart');
    const ordersLinks = document.querySelectorAll('#orders-link, #orders-link-cart');
    
    authLinks.forEach(authLink => {
        if (user) {
            authLink.innerHTML = `
                <div class="user-menu">
                    <span>Привет, ${user.name}!</span>
                    <a class="btn" href="account.html" style="padding: 0.5rem 1rem; font-size: 0.9rem;">Мой аккаунт</a>
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

// Показать сообщение в форме авторизации
function showAuthMessage(message, type) {
    const statusElement = document.getElementById('auth-status');
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    statusElement.style.display = 'block';
    
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 5000);
}

// ==================== НАВИГАЦИЯ ====================

function showShop() {
    document.getElementById('shop-page').style.display = 'block';
    document.getElementById('cart-page').style.display = 'none';
    document.getElementById('auth-page').style.display = 'none';
    currentPage = 'shop';
}

function showCart() {
    document.getElementById('shop-page').style.display = 'none';
    document.getElementById('cart-page').style.display = 'block';
    document.getElementById('auth-page').style.display = 'none';
    currentPage = 'cart';
    loadCartItems(); // Вызовет updateCartTotalWithDiscount
}

function showAuth() {
    if (currentUser) return;
    document.getElementById('shop-page').style.display = 'none';
    document.getElementById('cart-page').style.display = 'none';
    document.getElementById('auth-page').style.display = 'block';
    currentPage = 'auth';
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

document.addEventListener('DOMContentLoaded', async () => {
    // Проверяем авторизацию
    await checkAuth();
    
    document.querySelectorAll('.sidebar a').forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const category = this.getAttribute('data-category');
            loadProducts(category);
            
            document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Загружаем товары
    await loadProducts();
    
    // Настраиваем обработчики форм
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            await loginUser(email, password);
            showShop();
        } catch (error) {
            showAuthMessage(error.message, 'error');
        }
    });
    
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
    
        try {
            await registerUser(name, email, password);
            await loginUser(email, password); 
            showShop(); 
        } catch (err) {
            showAuthMessage(err.message, 'error');
        }
    });
    
    document.getElementById('checkout-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Оформляем заказ...';
            
            await submitOrder();
            
            // Перенаправляем на страницу успеха
            window.location.href = 'orders.html';
        } catch (error) {
            console.error('Ошибка оформления:', error);
            showAuthMessage(error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Оформить заказ';
        }
    });
});

// Глобальные функции
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.showShop = showShop;
window.showCart = showCart;
window.showAuth = showAuth;
window.switchTab = switchTab;
window.logoutUser = logoutUser;
window.submitOrder = submitOrder;
window.applyCoupon = applyCoupon; 