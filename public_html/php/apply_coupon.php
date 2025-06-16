<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Необходима авторизация']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$couponCode = $input['coupon_code'] ?? '';

if (!$couponCode) {
    echo json_encode(['error' => 'Не указан код купона']);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT id, discount, type, expiry_date 
        FROM coupons 
        WHERE code = ? AND active = 1
    ");
    $stmt->execute([$couponCode]);
    $coupon = $stmt->fetch();

    if (!$coupon) {
        throw new Exception('Недействительный купон');
    }

    // Проверка срока действия
    if ($coupon['expiry_date'] && strtotime($coupon['expiry_date']) < time()) {
        // Автоматическая деактивация просроченного купона
        $deactivateStmt = $pdo->prepare("
            UPDATE coupons SET active = 0 WHERE id = ?
        ");
        $deactivateStmt->execute([$coupon['id']]);
        
        throw new Exception('Срок действия купона истек');
    }

    // Проверка использования купона
    $stmt = $pdo->prepare("
        SELECT 1 
        FROM user_coupons 
        WHERE user_id = ? AND coupon_id = ? AND used = 1
        LIMIT 1
    ");
    $stmt->execute([$_SESSION['user_id'], $coupon['id']]);
    $used = $stmt->fetch();

    if ($used) {
        throw new Exception('Вы уже использовали этот купон');
    }

    // Всегда возвращаем тип 'percentage'
    echo json_encode([
        'success' => true,
        'discount' => (float)$coupon['discount'],
        'type' => 'percentage'
    ]);

} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}