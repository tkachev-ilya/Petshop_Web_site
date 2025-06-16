<?php
session_start();
require_once 'db.php';

header('Content-Type: application/json');

try {
    // ИЗМЕНЕНИЕ: Добавляем discount и coupon_id в запрос
    $stmt = $pdo->query("
        SELECT id, user_id, customer_name, phone, address, total_price, created_at, discount, coupon_id
        FROM orders
        ORDER BY created_at DESC
    ");
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($orders as &$order) {
        $stmt = $pdo->prepare("
            SELECT 
                oi.product_id, 
                p.product_name, 
                oi.price AS product_price, 
                oi.quantity
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = :order_id
        ");
        $stmt->execute(['order_id' => $order['id']]);
        $order['items'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    echo json_encode($orders);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Ошибка базы данных',
        'message' => $e->getMessage()
    ]);
}
?>