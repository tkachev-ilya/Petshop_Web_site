<?php
require_once 'db.php';
session_start();

header('Content-Type: application/json');

// Проверка авторизации
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Вы не авторизованы']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$product_id = $data['product_id'] ?? null;
$change = (int)($data['change'] ?? 0);
$user_id = $_SESSION['user_id'];

if (!$product_id || $change === 0) {
    echo json_encode(['error' => 'Неверные данные']);
    exit;
}

try {
    // Получаем текущую запись
    $stmt = $pdo->prepare("SELECT quantity FROM user_carts WHERE user_id = ? AND product_id = ?");
    $stmt->execute([$user_id, $product_id]);
    $row = $stmt->fetch();

    if ($row) {
        $newQty = $row['quantity'] + $change;

        // Проверяем наличие товара
        $stmt = $pdo->prepare("SELECT stock FROM products WHERE id = ?");
        $stmt->execute([$product_id]);
        $product = $stmt->fetch();

        if (!$product) {
            throw new Exception('Товар не найден');
        }

        if ($change > 0 && $newQty > $product['stock']) {
            // Возвращаем текущее доступное количество
            echo json_encode([
                'error' => 'Превышено доступное количество', 
                'max_available' => $product['stock'],
                'current_quantity' => $row['quantity']
            ]);
            exit;
        }

        if ($newQty <= 0) {
            // Удаляем товар
            $stmt = $pdo->prepare("DELETE FROM user_carts WHERE user_id = ? AND product_id = ?");
            $stmt->execute([$user_id, $product_id]);
        } else {
            // Обновляем количество
            $stmt = $pdo->prepare("UPDATE user_carts SET quantity = ? WHERE user_id = ? AND product_id = ?");
            $stmt->execute([$newQty, $user_id, $product_id]);
        }
    } else {
        // Если товара нет и пытаемся добавить
        if ($change > 0) {
            // Проверяем наличие товара
            $stmt = $pdo->prepare("SELECT stock FROM products WHERE id = ?");
            $stmt->execute([$product_id]);
            $product = $stmt->fetch();

            if (!$product) {
                throw new Exception('Товар не найден');
            }

            if ($change > $product['stock']) {
                throw new Exception('Превышено доступное количество');
            }

            // Добавляем товар
            $stmt = $pdo->prepare("INSERT INTO user_carts (user_id, product_id, quantity) VALUES (?, ?, ?)");
            $stmt->execute([$user_id, $product_id, $change]);
        }
    }

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>