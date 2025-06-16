<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

$selectedCategory = $_GET['category'] ?? '';

try {
    if ($selectedCategory && in_array($selectedCategory, ['dogs', 'cats', 'other'])) {
        $stmt = $pdo->prepare("SELECT id, product_name, product_price, product_category, image, stock FROM products WHERE product_category = :category AND is_visible = 1");
        $stmt->execute([':category' => $selectedCategory]);
    } else {
         $stmt = $pdo->query("SELECT id, product_name, product_price, product_category, image, stock FROM products WHERE is_visible = 1");
    }
    
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($products);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Ошибка при получении товаров: ' . $e->getMessage()]);
}
?>