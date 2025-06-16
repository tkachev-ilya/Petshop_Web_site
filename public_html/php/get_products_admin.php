<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

try {
    // Исправлено: убрал лишний $
    $stmt = $pdo->query("SELECT id, product_name, product_price, product_category, image, is_visible, stock FROM products");
    
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($products);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Ошибка при получении товаров: ' . $e->getMessage()]);
}