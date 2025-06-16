<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';

if (!isset($_SESSION['user_id'])) {
    die(json_encode(['error' => 'Необходима авторизация']));
}

// Читаем JSON из тела запроса
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

$productId = $input['product_id'] ?? null;
$quantity = $input['quantity'] ?? 1;

if (!$productId) {
    die(json_encode(['error' => 'Не указан товар']));
}

try {
    // Проверяем наличие товара на складе
    $stmt = $pdo->prepare("SELECT stock FROM products WHERE id = ?");
    $stmt->execute([$productId]);
    $product = $stmt->fetch();

    if (!$product) {
        die(json_encode(['error' => 'Товар не найден']));
    }

    // Проверяем, есть ли уже товар в корзине
    $stmt = $pdo->prepare("SELECT * FROM user_carts WHERE user_id = ? AND product_id = ?");
    $stmt->execute([$_SESSION['user_id'], $productId]);
    $existingItem = $stmt->fetch();

    if ($existingItem) {
        // Проверяем, не превысит ли новое количество доступный stock
        $newQuantity = $existingItem['quantity'] + $quantity;
        if ($newQuantity > $product['stock']) {
            die(json_encode(['error' => 'Превышено доступное количество. Доступно: ' . $product['stock']]));
        }
        
        // Обновляем количество
        $stmt = $pdo->prepare("UPDATE user_carts SET quantity = quantity + ? WHERE id = ?");
        $stmt->execute([$quantity, $existingItem['id']]);
    } else {
        // Проверяем, не превышает ли запрашиваемое количество доступный stock
        if ($quantity > $product['stock']) {
            die(json_encode(['error' => 'Превышено доступное количество. Доступно: ' . $product['stock']]));
        }
        
        // Добавляем новый товар
        $stmt = $pdo->prepare("INSERT INTO user_carts (user_id, product_id, quantity) VALUES (?, ?, ?)");
        $stmt->execute([$_SESSION['user_id'], $productId, $quantity]);
    }

    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    die(json_encode(['error' => 'Ошибка базы данных: ' . $e->getMessage()]));
}
?>