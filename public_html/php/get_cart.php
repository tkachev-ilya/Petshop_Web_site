<?php
session_start();
require_once __DIR__ . '/db.php';

if (!isset($_SESSION['user_id'])) {
    die(json_encode(['error' => 'Необходима авторизация']));
}

try {
    $stmt = $pdo->prepare("
        SELECT p.id, p.product_name, p.product_price, p.image, uc.quantity 
        FROM user_carts uc
        JOIN products p ON uc.product_id = p.id
        WHERE uc.user_id = ?
    ");
    $stmt->execute([$_SESSION['user_id']]);
    $cartItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($cartItems);
} catch (PDOException $e) {
    die(json_encode(['error' => 'Ошибка базы данных: ' . $e->getMessage()]));
}
?>