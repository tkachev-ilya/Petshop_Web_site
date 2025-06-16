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
$user_id = $_SESSION['user_id'];

if (!$product_id) {
    echo json_encode(['error' => 'Некорректный ID товара']);
    exit;
}

// Удаляем товар из корзины пользователя
$stmt = $pdo->prepare("DELETE FROM user_carts WHERE user_id = ? AND product_id = ?");
$stmt->execute([$user_id, $product_id]);

echo json_encode(['success' => true]);

