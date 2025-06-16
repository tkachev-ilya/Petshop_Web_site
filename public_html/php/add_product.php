<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json; charset=utf-8');

// Подключаем БД
require_once __DIR__ . '/db.php';

// Проверка метода
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Неправильный метод запроса']);
    exit;
}

// Логирование входящих данных
file_put_contents('add_product.log', date('Y-m-d H:i:s') . " - Запрос получен\n", FILE_APPEND);

try {
    // Проверяем наличие данных
    if (empty($_POST)) {
        file_put_contents('add_product.log', "Данные формы не получены\n", FILE_APPEND);
        throw new Exception('Данные формы не получены');
    }
    
    file_put_contents('add_product.log', "POST данные: " . print_r($_POST, true) . "\n", FILE_APPEND);
    file_put_contents('add_product.log', "FILES данные: " . print_r($_FILES, true) . "\n", FILE_APPEND);

    // Валидация полей
    $required = ['name', 'description', 'price', 'category', 'stock'];
    $errors = [];
    
    foreach ($required as $field) {
        if (empty($_POST[$field])) {
            $errors[] = "Поле '$field' обязательно для заполнения";
        }
    }

    // Дополнительная валидация
    $price = filter_var($_POST['price'], FILTER_VALIDATE_FLOAT);
    if ($price === false || $price <= 0) {
        $errors[] = "Некорректная цена товара";
    }

    $stock = filter_var($_POST['stock'], FILTER_VALIDATE_INT);
    if ($stock === false || $stock < 0) {
        $errors[] = "Некорректное количество товара";
    }

    $category = $_POST['category'];
    if (!in_array($category, ['dogs', 'cats', 'other'])) {
        $errors[] = "Недопустимая категория товара";
    }

    if (!empty($errors)) {
        file_put_contents('add_product.log', "Ошибки валидации: " . print_r($errors, true) . "\n", FILE_APPEND);
        echo json_encode(['success' => false, 'errors' => $errors]);
        exit;
    }

    // Обработка изображения
    $imagePath = null;
    if (!empty($_FILES['image']['tmp_name']) && is_uploaded_file($_FILES['image']['tmp_name'])) {
        file_put_contents('add_product.log', "Начало обработки изображения\n", FILE_APPEND);
        
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($_FILES['image']['tmp_name']);
        $allowed = ['image/jpeg', 'image/png', 'image/webp'];
        
        if (!in_array($mime, $allowed)) {
            file_put_contents('add_product.log', "Недопустимый тип файла: $mime\n", FILE_APPEND);
            echo json_encode(['success' => false, 'error' => 'Недопустимый тип файла. Разрешены JPG, PNG, WebP']);
            exit;
        }
        
        $uploadDir = $_SERVER['DOCUMENT_ROOT'] . '/uploads/';
        if (!is_dir($uploadDir)) {
            if (!mkdir($uploadDir, 0777, true)) {
                file_put_contents('add_product.log', "Ошибка создания директории: $uploadDir\n", FILE_APPEND);
                throw new Exception('Ошибка создания директории для загрузки');
            }
        }
        
        $ext = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp'
        ][$mime];
        
        $filename = uniqid('product_') . '.' . $ext;
        $target = $uploadDir . $filename;
        
        if (move_uploaded_file($_FILES['image']['tmp_name'], $target)) {
            $imagePath = '/uploads/' . $filename;
            file_put_contents('add_product.log', "Изображение сохранено: $imagePath\n", FILE_APPEND);
        } else {
            file_put_contents('add_product.log', "Ошибка сохранения файла\n", FILE_APPEND);
            throw new Exception('Ошибка сохранения файла');
        }
    } else {
        file_put_contents('add_product.log', "Изображение не загружено\n", FILE_APPEND);
    }

    // Проверка подключения к БД
    if (!isset($pdo)) {
        file_put_contents('add_product.log', "Подключение к БД не установлено\n", FILE_APPEND);
        throw new Exception('Ошибка подключения к базе данных');
    }

    // Сохранение в БД
    $stmt = $pdo->prepare("INSERT INTO products (product_name, product_price, product_description, product_category, image, stock) 
                           VALUES (:name, :price, :description, :category, :image_path, :stock)");

    $params = [
        ':name' => htmlspecialchars($_POST['name']),
        ':price' => $price,
        ':description' => htmlspecialchars($_POST['description']),
        ':category' => $category,
        ':image_path' => $imagePath,
        ':stock' => $stock
    ];
    
    file_put_contents('add_product.log', "Параметры запроса: " . print_r($params, true) . "\n", FILE_APPEND);

    if (!$stmt->execute($params)) {
        $errorInfo = $stmt->errorInfo();
        file_put_contents('add_product.log', "Ошибка выполнения запроса: " . print_r($errorInfo, true) . "\n", FILE_APPEND);
        throw new Exception('Ошибка базы данных: ' . $errorInfo[2]);
    }
    
    $lastId = $pdo->lastInsertId();
    file_put_contents('add_product.log', "Товар успешно добавлен, ID: $lastId\n", FILE_APPEND);
    
    // Успешный ответ
    echo json_encode([
        'success' => true,
        'message' => 'Товар успешно добавлен',
        'product_id' => $lastId
    ]);

} catch (Throwable $e) {
    $errorMsg = "Error: " . $e->getMessage();
    file_put_contents('add_product.log', $errorMsg . "\n", FILE_APPEND);
    
    // Ответ с ошибкой
    echo json_encode([
        'success' => false,
        'error' => 'Системная ошибка',
        'details' => $errorMsg
    ]);
}
?>