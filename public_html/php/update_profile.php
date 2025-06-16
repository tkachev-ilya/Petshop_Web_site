<?php
session_start();
require 'db.php'; 

header('Content-Type: application/json');

// Проверка авторизации
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

// Получение данных
$data = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(['error' => 'Неверный формат данных']);
    exit;
}

$userId = $_SESSION['user_id'];
$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');

// Валидация данных
if (empty($name) || empty($email)) {
    echo json_encode(['error' => 'Все поля обязательны для заполнения']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['error' => 'Некорректный email']);
    exit;
}

try {
    // Проверка, что пользователь существует
    $checkUser = $pdo->prepare("SELECT id FROM users WHERE id = :id");
    $checkUser->bindParam(':id', $userId, PDO::PARAM_INT);
    $checkUser->execute();
    
    if ($checkUser->rowCount() === 0) {
        echo json_encode(['error' => 'Пользователь не найден']);
        exit;
    }

    // Проверка, что email не занят другим пользователем
    $checkEmail = $pdo->prepare("SELECT id FROM users WHERE email = :email AND id != :id");
    $checkEmail->bindParam(':email', $email);
    $checkEmail->bindParam(':id', $userId, PDO::PARAM_INT);
    $checkEmail->execute();
    
    if ($checkEmail->rowCount() > 0) {
        echo json_encode(['error' => 'Этот email уже используется']);
        exit;
    }

    // Обновление данных
    $query = "UPDATE users SET name = :name, email = :email WHERE id = :id";
    $stmt = $pdo->prepare($query);
    $stmt->bindParam(':name', $name);
    $stmt->bindParam(':email', $email);
    $stmt->bindParam(':id', $userId, PDO::PARAM_INT);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['error' => 'Ошибка обновления данных']);
    }
} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    echo json_encode(['error' => 'Ошибка базы данных']);
}
?>