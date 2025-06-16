<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json; charset=utf-8');

require_once 'db.php';

try {
    // Проверка ID
    if (empty($_POST['id'])) {
        throw new Exception('ID товара не указан');
    }

    // Валидация данных
    $required = ['name', 'price', 'category', 'description', 'stock'];
    foreach ($required as $field) {
        if (empty($_POST[$field])) {
            throw new Exception("Поле $field обязательно для заполнения");
        }
    }

    $id = intval($_POST['id']);
    $name = htmlspecialchars($_POST['name']);
    $price = floatval($_POST['price']);
    $category = $_POST['category'];
    $description = htmlspecialchars($_POST['description']);
    $stock = intval($_POST['stock']);

    // Обработка изображения
    $imagePath = null;
    if (!empty($_FILES['image']['tmp_name']) && is_uploaded_file($_FILES['image']['tmp_name'])) {
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($_FILES['image']['tmp_name']);
        $allowed = ['image/jpeg', 'image/png', 'image/webp'];

        if (!in_array($mime, $allowed)) {
            throw new Exception('Недопустимый тип файла. Разрешены JPG, PNG, WebP');
        }

        $uploadDir = $_SERVER['DOCUMENT_ROOT'] . '/uploads/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
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
        } else {
            throw new Exception('Ошибка сохранения файла');
        }
    }

    // Подключение к БД
    $pdo = new PDO($dsn, $user, $pass, $options);

    if ($imagePath) {
        $stmt = $pdo->prepare("UPDATE products SET 
            product_name = :name,
            product_price = :price,
            product_category = :category,
            product_description = :description,
            image = :image,
            stock = :stock
            WHERE id = :id");
        $stmt->bindParam(':image', $imagePath);
    } else {
        $stmt = $pdo->prepare("UPDATE products SET 
            product_name = :name,
            product_price = :price,
            product_category = :category,
            product_description = :description,
            stock = :stock
            WHERE id = :id");
    }

    $stmt->bindParam(':name', $name);
    $stmt->bindParam(':price', $price);
    $stmt->bindParam(':category', $category);
    $stmt->bindParam(':description', $description);
    $stmt->bindParam(':stock', $stock);
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);

    if (!$stmt->execute()) {
        $errorInfo = $stmt->errorInfo();
        throw new Exception('Ошибка базы данных: ' . $errorInfo[2]);
    }

    echo json_encode(['success' => true, 'message' => 'Товар успешно обновлен']);

} catch (Exception $e) {
    echo json_encode([
        'success' => false, 
        'error' => $e->getMessage()
    ]);
}
?>