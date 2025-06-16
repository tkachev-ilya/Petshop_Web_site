let allOrders = []; // Хранилище всех заказов
let filteredOrders = []; // Отфильтрованные заказы
const ordersPerPage = 10; // Заказов на страницу
let currentPage = 1; // Текущая страница

// Загрузка данных о заказах
async function loadOrders() {
    const container = document.getElementById('orders-list-container');
    container.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            Загрузка данных о заказах...
        </div>
    `;

    try {
        const response = await fetch('php/get_all_orders.php');
        if (!response.ok) throw new Error('Ошибка сети');
        
        allOrders = await response.json();
        applyFilters();
    } catch (error) {
        console.error('Ошибка:', error);
        container.innerHTML = `
            <div class="error">
                Ошибка загрузки: ${error.message}
            </div>
        `;
    }
}

// Применение фильтров
function applyFilters() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const period = document.getElementById('period-filter').value;
    const sortBy = document.getElementById('sort-filter').value;
    
    // Фильтрация
    filteredOrders = allOrders.filter(order => {
        const matchesSearch = (
            order.id.toString().includes(searchTerm) ||
            order.customer_name.toLowerCase().includes(searchTerm) ||
            order.phone.includes(searchTerm) ||
            order.address.toLowerCase().includes(searchTerm)
        );
        
        const orderDate = new Date(order.created_at);
        const now = new Date();
        let matchesPeriod = true;
        
        switch (period) {
            case 'today':
                matchesPeriod = orderDate.toDateString() === now.toDateString();
                break;
            case 'week':
                const weekAgo = new Date(now);
                weekAgo.setDate(now.getDate() - 7);
                matchesPeriod = orderDate >= weekAgo;
                break;
            case 'month':
                const monthAgo = new Date(now);
                monthAgo.setMonth(now.getMonth() - 1);
                matchesPeriod = orderDate >= monthAgo;
                break;
            case 'quarter':
                const quarterAgo = new Date(now);
                quarterAgo.setMonth(now.getMonth() - 3);
                matchesPeriod = orderDate >= quarterAgo;
                break;
        }
        
        return matchesSearch && matchesPeriod;
    });
    
    // Сортировка
    filteredOrders.sort((a, b) => {
        switch (sortBy) {
            case 'oldest':
                return new Date(a.created_at) - new Date(b.created_at);
            case 'price_high':
                return b.total_price - a.total_price;
            case 'price_low':
                return a.total_price - b.total_price;
            default: // 'newest'
                return new Date(b.created_at) - new Date(a.created_at);
        }
    });
    
    renderOrders();
    updatePagination();
}

// Отрисовка заказов
function renderOrders() {
    const start = (currentPage - 1) * ordersPerPage;
    const end = start + ordersPerPage;
    const pageOrders = filteredOrders.slice(start, end);
    
    const container = document.getElementById('orders-list-container');
    
    if (pageOrders.length === 0) {
        container.innerHTML = '<div class="no-orders">Заказы не найдены</div>';
        return;
    }
    
    container.innerHTML = pageOrders.map(order => {
        const orderDate = new Date(order.created_at);
        const formattedDate = orderDate.toLocaleString('ru-RU');
        
        // РАСЧЕТ СКИДКИ
        const discount = parseFloat(order.discount) || 0;
        const subtotal = (parseFloat(order.total_price) + discount).toFixed(2);
        
        return `
            <div class="order-row">
                <div>${order.id}</div>
                <div>${formattedDate}</div>
                <div>${order.customer_name}</div>
                <div>${order.address}</div>
                <div>${order.phone}</div>
                <div>${order.total_price} руб.${discount ? `<br><span class="discount">-${discount} руб.</span>` : ''}</div>
                <div>
                    <button class="action-btn" title="Просмотреть детали">👁️</button>
                </div>
                <div class="order-details">
                    <h3>Детали заказа #${order.id}</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Товар</th>
                                <th>Цена</th>
                                <th>Количество</th>
                                <th>Сумма</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.items.map(item => `
                                <tr>
                                    <td>${item.product_name}</td>
                                    <td>${item.product_price} руб.</td>
                                    <td>${item.quantity}</td>
                                    <td>${(item.product_price * item.quantity).toFixed(2)} руб.</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <!-- БЛОК СКИДКИ -->
                    ${discount ? `
                    <div class="order-summary">
                        <div>Сумма без скидки: ${subtotal} руб.</div>
                        <div>Скидка: ${discount} руб.</div>
                        <div>Итого: ${order.total_price} руб.</div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Обновление пагинации
function updatePagination() {
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    const pagination = document.querySelector('.pagination');
    pagination.innerHTML = '';
    
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = 'page-btn';
        if (i === currentPage) btn.classList.add('active');
        btn.textContent = i;
        btn.addEventListener('click', () => {
            currentPage = i;
            renderOrders();
        });
        pagination.appendChild(btn);
    }
}

// Инициализация обработчиков событий
function initEventHandlers() {
    // Делегирование событий для кнопок просмотра
    document.getElementById('orders-list-container').addEventListener('click', e => {
        if (e.target.classList.contains('action-btn')) {
            const orderRow = e.target.closest('.order-row');
            const details = orderRow.querySelector('.order-details');
            const isActive = details.classList.contains('active');
            
            // Закрываем все открытые детали
            document.querySelectorAll('.order-details.active').forEach(d => {
                d.classList.remove('active');
                d.closest('.order-row').querySelector('.action-btn').textContent = '👁️';
            });
            
            if (!isActive) {
                details.classList.add('active');
                e.target.textContent = '✖️';
            }
        }
    });
    
    // Применение фильтров
    document.getElementById('apply-filters').addEventListener('click', applyFilters);
    
    // Сброс фильтров
    document.getElementById('reset-filters').addEventListener('click', () => {
        document.getElementById('period-filter').value = 'all';
        document.getElementById('sort-filter').value = 'newest';
        document.getElementById('search-input').value = '';
        applyFilters();
    });
}

// Загрузка при открытии страницы
document.addEventListener('DOMContentLoaded', () => {
    initEventHandlers();
    loadOrders();
});