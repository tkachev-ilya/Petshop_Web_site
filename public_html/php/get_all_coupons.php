<?php
require 'db.php';

header('Content-Type: application/json');

try {
    $query = "SELECT id, code, discount, expiry_date FROM coupons";
    $stmt = $pdo->prepare($query);
    $stmt->execute();
    
    $coupons = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($coupons ?: []);
} catch (PDOException $e) {
    echo json_encode(['error' => 'Ошибка базы данных: ' . $e->getMessage()]);
}
?>