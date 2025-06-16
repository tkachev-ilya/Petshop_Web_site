<?php
session_start();
require_once __DIR__ . '/db.php';
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Необходима авторизация']);
    exit;
}

$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

$requiredFields = ['name', 'phone', 'address'];
foreach ($requiredFields as $field) {
    if (empty($input[$field])) {
        http_response_code(400);
        echo json_encode(['error' => "Поле $field обязательно для заполнения"]);
        exit;
    }
}

$couponCode = $input['coupon_code'] ?? null;
$couponId = null;
$discountAmount = 0;

try {
    $pdo->beginTransaction();

    // Рассчитываем общую сумму заказа
    $stmt = $pdo->prepare("
        SELECT SUM(p.product_price * uc.quantity) AS total
        FROM user_carts uc
        JOIN products p ON uc.product_id = p.id
        WHERE uc.user_id = ?
    ");
    $stmt->execute([$_SESSION['user_id']]);
    $total = $stmt->fetchColumn();

    // Если передан купон, проверяем и применяем скидку
    if ($couponCode) {
        $stmt = $pdo->prepare("
            SELECT id, discount, type 
            FROM coupons 
            WHERE code = ? AND active = 1 AND (expiry_date IS NULL OR expiry_date >= CURDATE())
        ");
        $stmt->execute([$couponCode]);
        $coupon = $stmt->fetch();

        if ($coupon) {
            $couponId = $coupon['id'];
            $discount = (float)$coupon['discount'];
            $type = $coupon['type'];

            // Проверяем, не использовал ли уже пользователь этот купон
            $stmt = $pdo->prepare("
                SELECT coupon_id 
                FROM user_coupons 
                WHERE user_id = ? AND coupon_id = ? AND used = 1
            ");
            $stmt->execute([$_SESSION['user_id'], $couponId]);
            $used = $stmt->fetch();

            if (!$used) {
                // Рассчитываем скидку
                if ($type === 'fixed') {
                    $discountAmount = min($discount, $total);
                } else if ($type === 'percentage') {
                    $discountAmount = $total * $discount / 100;
                }
                $discountAmount = round($discountAmount, 2);
            }
        }
    }

    $finalTotal = $total - $discountAmount;
    if ($finalTotal < 0) $finalTotal = 0;

    // Создаем заказ (с учетом скидки)
    $stmt = $pdo->prepare("
        INSERT INTO orders (user_id, customer_name, phone, address, total_price, discount, coupon_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $_SESSION['user_id'],
        htmlspecialchars($input['name']),
        htmlspecialchars($input['phone']),
        htmlspecialchars($input['address']),
        $finalTotal,
        $discountAmount,
        $couponId
    ]);
    $orderId = $pdo->lastInsertId();

    // Получаем товары из корзины
    $cartItems = $pdo->prepare("
        SELECT uc.product_id, uc.quantity, p.product_name, p.product_price 
        FROM user_carts uc
        JOIN products p ON uc.product_id = p.id
        WHERE uc.user_id = ?
    ");
    $cartItems->execute([$_SESSION['user_id']]);
    $items = $cartItems->fetchAll(PDO::FETCH_ASSOC);

    if (empty($items)) {
        throw new Exception('Корзина пуста');
    }

    // Добавляем товары в заказ
    $orderItemsStmt = $pdo->prepare("
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES (?, ?, ?, ?)
    ");

    foreach ($items as $item) {
        $orderItemsStmt->execute([
            $orderId,
            $item['product_id'],
            $item['quantity'],
            $item['product_price']
        ]);

        // Обновляем склад
        $updateStock = $pdo->prepare("
            UPDATE products SET stock = stock - ? WHERE id = ?
        ");
        $updateStock->execute([$item['quantity'], $item['product_id']]);
    }

    // Если купон был применен и он действителен, отмечаем его как использованный
    if ($couponId && $discountAmount > 0) {
        $stmt = $pdo->prepare("
            INSERT INTO user_coupons (user_id, coupon_id, used) 
            VALUES (?, ?, 1)
            ON DUPLICATE KEY UPDATE used = 1
        ");
        $stmt->execute([
            $_SESSION['user_id'],
            $couponId
        ]);
    }

    // Очищаем корзину
    $clearCart = $pdo->prepare("DELETE FROM user_carts WHERE user_id = ?");
    $clearCart->execute([$_SESSION['user_id']]);

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'order_id' => $orderId,
        'message' => 'Заказ успешно создан'
    ]);
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}