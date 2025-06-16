async function loadAdminProducts() {
    const loadingIndicator = document.getElementById('loading');
    const productsGrid = document.getElementById('admin-products');
    
    loadingIndicator.style.display = 'flex';
    productsGrid.innerHTML = '';

    try {
        const response = await fetch('php/get_products_admin.php');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const products = await response.json();
        
        if (products.length === 0) {
            productsGrid.innerHTML = '<p class="no-products">Товары не найдены</p>';
            return;
        }


        // Генерация карточек товаров
        products.forEach(product => {
            const imageUrl = product.image 
                ? product.image.startsWith('/') 
                    ? window.location.origin + product.image 
                    : product.image
                : 'https://via.placeholder.com/300x200?text=No+Image';
        
            const productCard = document.createElement('div');
            productCard.className = 'admin-product-card';
            
            const categoryName = getCategoryName(product.category);
            
            // Добавлено отображение количества
            productCard.innerHTML = `
            <div class="product-image-container">
                <img src="${imageUrl}" 
                     alt="${product.product_name}"
                     loading="lazy"
                     onerror="this.onerror=null; this.src='https://via.placeholder.com/300x200?text=Image+Error'">
                <div class="visibility-badge ${product.is_visible ? 'visible' : 'hidden'}">
                    ${product.is_visible ? 'Видимый' : 'Скрытый'}
                </div>
                <div class="image-text-overlay">${product.product_name}</div>
            </div>
            <div class="product-info">
                <h4>${product.product_name}</h4>
                <div class="price">${product.product_price.toLocaleString('ru-RU')} ₽</div>
                <div class="category">${categoryName}</div>
                <!-- Добавлено отображение количества -->
                <div class="stock">В наличии: ${product.stock} шт.</div>
            </div>
            <div class="product-actions">
                <button class="btn edit-btn" data-id="${product.id}">✏️ Редактировать</button>
                <button class="btn toggle-visibility-btn" data-id="${product.id}" data-visible="${product.is_visible}">
                    ${product.is_visible ? '👁️ Скрыть' : '👁️ Показать'}
                </button>
                <button class="btn delete-btn" data-id="${product.id}">🗑️ Удалить</button>
            </div>
        `;
        
        // Добавьте обработчик для кнопки переключения видимости
        productCard.querySelector('.toggle-visibility-btn').addEventListener('click', (e) => {
            toggleProductVisibility(e.target.dataset.id, e.target.dataset.visible === '1');
        });
            
            productsGrid.appendChild(productCard);
        });

        // Добавьте обработчики здесь
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => fillEditForm(e.target.dataset.id));
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => deleteProduct(e.target.dataset.id));
        });

    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        productsGrid.innerHTML = `<p class="error">Ошибка загрузки: ${error.message}</p>`;
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

async function fillEditForm(productId) {
    try {
        console.log(`Загрузка данных для товара ID: ${productId}`);
        const response = await fetch(`php/get_product_by_id.php?id=${productId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const product = await response.json();
        console.log("Данные товара:", product);
        
        // 1. Заполнение названия
        const nameField = document.getElementById('product-name');
        if (nameField) {
            nameField.value = product.product_name || '';
            console.log("Название установлено:", product.product_name);
        } else {
            console.error('Поле product-name не найдено!');
        }
        
        // 2. Заполнение цены
        const priceField = document.getElementById('product-price');
        if (priceField) {
            priceField.value = product.product_price || 0;
            console.log("Цена установлена:", product.product_price);
        } else {
            console.error('Поле product-price не найдено!');
        }
        
        // 3. Заполнение категории
        const categorySelect = document.getElementById('product-category');
        if (categorySelect) {
            const categoryValue = (product.category || '').trim().toLowerCase();
            
            let foundOption = null;
            for (let option of categorySelect.options) {
                const optionValue = option.value.toLowerCase();
                if (optionValue === categoryValue) {
                    foundOption = option;
                    break;
                }
            }
            
            if (foundOption) {
                foundOption.selected = true;
            } else {
                console.warn(`Категория "${product.category}" не найдена, сброс выбора`);
                categorySelect.selectedIndex = 0;
            }
        }
        
        // 4. Заполнение описания
        const descriptionField = document.getElementById('product-description');
        if (descriptionField) {
            descriptionField.value = product.description || '';
            console.log("Описание установлено:", product.description);
        } else {
            console.error('Поле product-description не найдено!');
        }
        
        // 5. Заполнение количества (ДОБАВЛЕНО)
        const stockField = document.getElementById('product-stock');
        if (stockField) {
            stockField.value = product.stock || 0;
            console.log("Количество установлено:", product.stock);
        } else {
            console.error('Поле product-stock не найдено!');
        }
        
        // 6. Установка ID товара
        const idField = document.getElementById('edit-product-id');
        if (idField) {
            idField.value = product.id;
            console.log("ID товара установлен:", product.id);
        }
        
        // 7. Превью изображения
        const preview = document.getElementById('image-preview');
        if (preview) {
            if (product.image && product.image.trim() !== '') {
                const fullImageUrl = product.image.startsWith('/') 
                    ? window.location.origin + product.image
                    : product.image;
                
                preview.src = fullImageUrl;
                preview.style.display = 'block';
            } else {
                preview.style.display = 'none';
            }
        }
        
        // 8. Обновление интерфейса
        document.getElementById('form-title').textContent = '✏️ Редактировать товар';
        document.getElementById('submit-btn').textContent = '💾 Сохранить изменения';
        document.getElementById('cancel-edit').style.display = 'inline-block';
        
        console.log("Форма успешно заполнена");
        
    } catch (error) {
        console.error('Ошибка при загрузке данных товара:', error);
        alert('Не удалось загрузить данные товара для редактирования: ' + error.message);
    }
}

// ================ Вспомогательные функции ================


function getCategoryName(category) {
    const normalizedCategory = category ? category.trim().toLowerCase() : '';
    
    const names = {
        'dogs': '🐕 Для собак',
        'cats': '🐱 Для кошек',
        'other': '🐾 Другое'
    };
    
    return names[normalizedCategory] || category || ' ';
}

// ================ Удаление товара ================
async function deleteProduct(productId) {
    if (!confirm('Вы уверены, что хотите удалить товар?')) return;

    try {
        const response = await fetch(`php/delete_product.php?id=${productId}`);
        const result = await response.json();
        
        if (result.success) {
            alert(result.message);
            loadAdminProducts();
        } else {
            alert(`Ошибка: ${result.error}`);
        }
    } catch (error) {
        console.error('Ошибка удаления:', error);
        alert('Ошибка при удалении товара');
    }
}

async function toggleProductVisibility(productId, currentVisibility) {
    try {
        const response = await fetch('php/toggle_visibility.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `id=${productId}&is_visible=${currentVisibility ? 0 : 1}`
        });
        
        const result = await response.json();
        
        if (result.success) {
            loadAdminProducts();
        } else {
            alert(`Ошибка: ${result.error}`);
        }
    } catch (error) {
        console.error('Ошибка изменения видимости:', error);
        alert('Ошибка при изменении видимости товара');
    }
}

// ================ Инициализация страницы ================
document.addEventListener('DOMContentLoaded', () => {
    loadAdminProducts();

    document.getElementById('cancel-edit').addEventListener('click', () => {
        document.getElementById('add-product-form').reset();
        document.getElementById('edit-product-id').value = '';
        document.getElementById('image-preview').style.display = 'none';
        document.getElementById('form-title').textContent = '➕ Добавить новый товар';
        document.getElementById('submit-btn').textContent = '🚀 Добавить товар';
        document.getElementById('cancel-edit').style.display = 'none';
    });

    document.getElementById('product-image').addEventListener('change', function(e) {
        const preview = document.getElementById('image-preview');
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
            reader.readAsDataURL(this.files[0]);
        }
    });
});

document.getElementById('add-product-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const isEditMode = !!document.getElementById('edit-product-id').value;
    const url = isEditMode ? 'php/update_product.php' : 'php/add_product.php';

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });
        
        // Проверяем статус ответа
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            alert(result.message);
            this.reset();
            document.getElementById('edit-product-id').value = '';
            document.getElementById('image-preview').style.display = 'none';
            document.getElementById('form-title').textContent = '➕ Добавить новый товар';
            document.getElementById('submit-btn').textContent = '🚀 Добавить товар';
            document.getElementById('cancel-edit').style.display = 'none';
            
        } else {
            // Обработка ошибок
            const errorMsg = result.error || 
                            (result.errors ? result.errors.join('\n') : 
                            'Неизвестная ошибка');
            alert(`Ошибка: ${errorMsg}`);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Произошла ошибка: ' + error.message);
    }
});