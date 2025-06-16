<?php
require 'db.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['id'])) {
    echo json_encode(['error' => 'Не указан ID купона']);
    exit;
}

$id = $data['id'];

try {
    // Удаление связанных записей в user_coupons
    $query = "DELETE FROM user_coupons WHERE coupon_id = ?";
    $stmt = $pdo->prepare($query);
    $stmt->execute([$id]);

    // Удаление купона
    $query = "DELETE FROM coupons WHERE id = ?";
    $stmt = $pdo->prepare($query);
    $stmt->execute([$id]);
    
    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['error' => 'Купон не найден']);
    }
} catch (PDOException $e) {
    echo json_encode(['error' => 'Ошибка базы данных: ' . $e->getMessage()]);
}
?>