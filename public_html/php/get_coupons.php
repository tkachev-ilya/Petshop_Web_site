<?php
session_start();
require 'db.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

$userId = $_SESSION['user_id'];

try {
    // Добавлено поле title и фильтрация по сроку действия
    $query = "SELECT c.code, c.discount, c.expiry_date 
          FROM user_coupons uc
          JOIN coupons c ON uc.coupon_id = c.id
          WHERE uc.user_id = :userId
            AND uc.used = 0
            AND c.expiry_date > NOW()";
                
    $stmt = $pdo->prepare($query);
    $stmt->bindParam(':userId', $userId, PDO::PARAM_INT);
    $stmt->execute();
    
    $coupons = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($coupons ?: []);
} catch (PDOException $e) {
    echo json_encode(['error' => 'Ошибка базы данных: ' . $e->getMessage()]);
}
?>