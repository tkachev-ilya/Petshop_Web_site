<?php
session_start();
require_once 'db.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Пользователь не авторизован']);
    exit;
}

$userId = $_SESSION['user_id'];

try {
    // Получаем список заказов
    $stmt = $pdo->prepare("
        SELECT id, customer_name, phone, address, total_price, created_at, discount
        FROM orders
        WHERE user_id = :user_id
        ORDER BY created_at DESC
    ");
    $stmt->execute(['user_id' => $userId]);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Если заказов нет - возвращаем пустой массив
    if (!$orders) {
        echo json_encode([]);
        exit;
    }
    
    // Для каждого заказа получаем товары
    foreach ($orders as &$order) {
        $stmt = $pdo->prepare("
            SELECT oi.product_id, p.product_name, p.product_price, oi.quantity
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = :order_id
        ");
        $stmt->execute(['order_id' => $order['id']]);
        $order['items'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    echo json_encode($orders);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Ошибка базы данных: ' . $e->getMessage()]);
}
?>