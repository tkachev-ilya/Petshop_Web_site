<?php
session_start();
require_once 'db.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Пользователь не авторизован']);
    exit;
}

try {
    $stmt = $pdo->prepare("DELETE FROM user_carts WHERE user_id = :user_id");
    $stmt->execute(['user_id' => $_SESSION['user_id']]);
    
    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    echo json_encode(['error' => 'Ошибка базы данных: ' . $e->getMessage()]);
}
?>