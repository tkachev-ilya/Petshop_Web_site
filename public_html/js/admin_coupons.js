        document.addEventListener('DOMContentLoaded', function() {
            const couponsList = document.getElementById('coupons-list');
            const loadingIndicator = document.getElementById('loading');
            const alertContainer = document.getElementById('alert-container');
            const couponForm = document.getElementById('add-coupon-form');
            
            // Показать уведомление
            function showAlert(message, type = 'success') {
                const alert = document.createElement('div');
                alert.className = `alert alert-${type}`;
                alert.textContent = message;
                alertContainer.appendChild(alert);
                alert.style.display = 'block';
                
                setTimeout(() => {
                    alert.style.opacity = '0';
                    setTimeout(() => alert.remove(), 300);
                }, 3000);
            }
            
            // Загрузка купонов с сервера
            function loadCoupons() {
                loadingIndicator.style.display = 'block';
                couponsList.innerHTML = '';
                
                fetch('php/get_all_coupons.php')
                    .then(response => response.json())
                    .then(data => {
                        loadingIndicator.style.display = 'none';
                        
                        if (data.error) {
                            showAlert('Ошибка: ' + data.error, 'error');
                            return;
                        }
                        
                        if (data.length === 0) {
                            couponsList.innerHTML = `
                                <tr>
                                    <td colspan="5" style="text-align: center;">
                                        Нет доступных купонов
                                    </td>
                                </tr>
                            `;
                            return;
                        }
                        
                        data.forEach(coupon => {
                            const row = document.createElement('tr');
                            row.innerHTML = `
                                <td>${coupon.id}</td>
                                <td>${coupon.code}</td>
                                <td>${coupon.discount}%</td>
                                <td>${coupon.expiry_date}</td>
                                <td class="actions-cell">
                                    <button class="delete-btn" data-id="${coupon.id}">
                                        Удалить
                                    </button>
                                </td>
                            `;
                            couponsList.appendChild(row);
                        });
                        
                        // Добавляем обработчики событий для кнопок удаления
                        document.querySelectorAll('.delete-btn').forEach(button => {
                            button.addEventListener('click', function() {
                                const couponId = this.getAttribute('data-id');
                                deleteCoupon(couponId);
                            });
                        });
                    })
                    .catch(error => {
                        loadingIndicator.style.display = 'none';
                        showAlert('Ошибка сети: ' + error.message, 'error');
                    });
            }
            
            // Удаление купона
            function deleteCoupon(couponId) {
                if (!confirm('Вы уверены, что хотите удалить этот купон?')) return;
                
                fetch('php/delete_coupon.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ id: couponId })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showAlert('Купон успешно удален');
                        loadCoupons();
                    } else {
                        showAlert('Ошибка: ' + (data.error || 'Неизвестная ошибка'), 'error');
                    }
                })
                .catch(error => {
                    showAlert('Ошибка сети: ' + error.message, 'error');
                });
            }
            
            // Добавление нового купона
            couponForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const formData = {
                    code: document.getElementById('coupon-code').value.trim(),
                    discount: document.getElementById('coupon-discount').value,
                    expiry_date: document.getElementById('coupon-expiry').value
                };
                
                // Валидация данных
                if (!formData.code) {
                    showAlert('Введите код купона', 'error');
                    return;
                }
                
                // Всегда процентная скидка (1-100%)
                if (formData.discount < 1 || formData.discount > 100) {
                    showAlert('Скидка должна быть от 1% до 100%', 'error');
                    return;
                }
                
                if (!formData.expiry_date) {
                    showAlert('Выберите дату окончания действия', 'error');
                    return;
                }
                
                fetch('php/add_coupon.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showAlert('Купон успешно добавлен');
                        couponForm.reset();
                        loadCoupons();
                    } else {
                        showAlert('Ошибка: ' + (data.error || 'Неизвестная ошибка'), 'error');
                    }
                })
                .catch(error => {
                    showAlert('Ошибка сети: ' + error.message, 'error');
                });
            });

            
            // Установка минимальной даты (сегодня)
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('coupon-expiry').min = today;
            
            // Загружаем купоны при открытии страницы
            loadCoupons();
        });