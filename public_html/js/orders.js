// Загружаем информацию о заказах
        async function loadOrders() {
            try {
                const response = await fetch('php/get_orders.php');
                
                // Проверяем статус ответа
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Ошибка сервера: ${response.status} - ${errorText}`);
                }
                
                const orders = await response.json();
                const ordersList = document.getElementById('orders-list');
                const orderDetails = document.getElementById('order-details');
                
                // Проверяем, что orders - массив
                if (!Array.isArray(orders)) {
                    console.error('Ответ сервера не является массивом:', orders);
                    throw new Error('Неверный формат данных заказов');
                }
                
                // Если перешли с ID заказа - показываем детали
                if (orderId) {
                    const order = orders.find(o => o.id == orderId);
                    if (order) {
                        orderDetails.innerHTML = renderOrderDetails(order);
                        ordersList.style.display = 'none';
                        return;
                    } else {
                        orderDetails.innerHTML = '<p>Заказ не найден</p>';
                        return;
                    }
                }
                
                // Показываем список всех заказов
                if (orders.length === 0) {
                    ordersList.innerHTML = '<p>У вас еще нет заказов</p>';
                    return;
                }
                
                ordersList.innerHTML = '<h2>Ваши последние заказы</h2>' + 
                orders.map(order => `
                    <div class="order-card">
                        <div class="order-header">
                            <div class="order-id">Заказ #${order.id}</div>
                            <div class="order-date">${new Date(order.created_at).toLocaleString('ru-RU')}</div>
                        </div>
                        <div><strong>Адрес:</strong> ${order.address}</div>
                        ${order.discount > 0 ? `<div><strong>Скидка:</strong> -${order.discount.toLocaleString('ru-RU')} ₽</div>` : ''}
                        <div class="order-total">Сумма: ${order.total_price.toLocaleString('ru-RU')} ₽</div>
                        <a href="orders.html?order_id=${order.id}">Подробнее</a>
                    </div>
                `).join('');
                
            } catch (error) {
                console.error('Ошибка загрузки заказов:', error);
                const ordersList = document.getElementById('orders-list');
                if (ordersList) {
                    ordersList.innerHTML = `<p>Ошибка загрузки заказов: ${error.message}</p>`;
                }
            }
        }

function renderOrderDetails(order) {
    const orderDate = new Date(order.created_at);
    const formattedDate = orderDate.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Преобразуем значения в числа
    const totalPrice = parseFloat(order.total_price);
    const discount = parseFloat(order.discount);
    
    return `
        <div class="order-card">
            <div class="order-header">
                <div class="order-id">Заказ #${order.id}</div>
                <div class="order-date">${formattedDate}</div>
            </div>
            
            <div class="order-detail">
                <strong>Имя:</strong> ${order.customer_name}
            </div>
            <div class="order-detail">
                <strong>Телефон:</strong> ${order.phone}
            </div>
            <div class="order-detail">
                <strong>Адрес:</strong> ${order.address}
            </div>
            
            ${discount > 0 ? `
            <div class="order-detail">
                <strong>Сумма без скидки:</strong> ${(totalPrice + discount).toLocaleString('ru-RU')} ₽
            </div>
            <div class="order-detail">
                <strong>Скидка:</strong> -${discount.toLocaleString('ru-RU')} ₽
            </div>
            ` : ''}
            
            <div class="order-items">
                <h3>Товары:</h3>
                ${order.items && order.items.length > 0 ? 
                    order.items.map(item => {
                        // Преобразуем цены товаров в числа
                        const price = parseFloat(item.product_price);
                        const quantity = parseInt(item.quantity);
                        const total = price * quantity;
                        
                        return `
                        <div class="order-item">
                            <div>${item.product_name}</div>
                            <div>${quantity} × ${price.toLocaleString('ru-RU')} ₽</div>
                            <div>${total.toLocaleString('ru-RU')} ₽</div>
                        </div>
                        `;
                    }).join('') : 
                    '<p>Информация о товарах недоступна</p>'}
            </div>
            
            <div class="order-total">Итого: ${totalPrice.toLocaleString('ru-RU')} ₽</div>
        </div>
        <div style="margin-top: 20px;">
            <button onclick="window.location.href='orders.html'" class="btn">
                Назад к списку заказов
            </button>
        </div>
    `;
}

        // Проверка авторизации
        async function checkAuth() {
            try {
                const response = await fetch('php/check_auth.php');
                const result = await response.json();
                return result.authenticated ? result : null;
            } catch (error) {
                console.error('Ошибка проверки авторизации:', error);
                return null;
            }
        }
        
        // Основная функция инициализации
        async function init() {
            const authResult = await checkAuth();
            const authRequired = document.getElementById('auth-required');
            const orderContent = document.getElementById('order-content');
            
            if (!authResult || !authResult.authenticated) {
                authRequired.style.display = 'block';
                orderContent.style.display = 'none';
                return;
            }
            
            authRequired.style.display = 'none';
            orderContent.style.display = 'block';
            
            // Загружаем заказы
            await loadOrders();
        }
        
        // Получаем ID заказа из URL
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('order_id');
        
        
        
        
        
        // Запускаем инициализацию при загрузке страницы
        document.addEventListener('DOMContentLoaded', init);