<?php
session_start();
require 'db.php'; // Используем PDO из db.php

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (!$data) {
    echo json_encode(['error' => 'Неверный формат данных']);
    exit;
}

$userId = $_SESSION['user_id'];
$currentPassword = $data['currentPassword'] ?? '';
$newPasswordInput = $data['newPassword'] ?? '';

// Проверка наличия паролей
if (empty($currentPassword) || empty($newPasswordInput)) {
    echo json_encode(['error' => 'Все поля обязательны']);
    exit;
}

try {
    // Получаем текущий пароль
    $stmt = $pdo->prepare("SELECT password FROM users WHERE id = :id");
    $stmt->bindParam(':id', $userId, PDO::PARAM_INT);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode(['error' => 'Пользователь не найден']);
        exit;
    }

    // Проверка текущего пароля
    if (!password_verify($currentPassword, $user['password'])) {
        echo json_encode(['error' => 'Неверный текущий пароль']);
        exit;
    }

    // Проверка совпадения нового и текущего пароля
    if (password_verify($newPasswordInput, $user['password'])) {
        echo json_encode(['info' => 'Новый пароль совпадает с текущим']);
        exit;
    }

    // Хеширование нового пароля
    $newPassword = password_hash($newPasswordInput, PASSWORD_DEFAULT);

    // Обновление пароля
    $updateStmt = $pdo->prepare("UPDATE users SET password = :password WHERE id = :id");
    $updateStmt->bindParam(':password', $newPassword);
    $updateStmt->bindParam(':id', $userId, PDO::PARAM_INT);
    
    if ($updateStmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['error' => 'Ошибка обновления пароля']);
    }
} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    echo json_encode(['error' => 'Ошибка базы данных: ' . $e->getMessage()]);
} catch (Exception $e) {
    error_log("Error: " . $e->getMessage());
    echo json_encode(['error' => $e->getMessage()]);
}
?>