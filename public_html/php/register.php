<?php
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';

$data = json_decode(file_get_contents('php://input'), true);
$email = $data['email'] ?? '';
$password = $data['password'] ?? '';
$name = $data['name'] ?? '';

if (empty($email) || empty($password) || empty($name)) {
    http_response_code(400);
    die(json_encode(['error' => 'Все поля обязательны']));
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    die(json_encode(['error' => 'Некорректный email']));
}

try {
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    
    if ($stmt->fetch()) {
        http_response_code(400);
        die(json_encode(['error' => 'Email уже занят']));
    }

    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (email, password, name) VALUES (?, ?, ?)");
    $stmt->execute([$email, $hashedPassword, $name]);
    
    session_start();
    $_SESSION['user_id'] = $pdo->lastInsertId();
    $_SESSION['user_email'] = $email;
    $_SESSION['user_name'] = $name;
    
    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $_SESSION['user_id'],
            'email' => $email,
            'name' => $name
        ]
    ]);
    exit;
} catch (PDOException $e) {
    http_response_code(500);
    die(json_encode(['error' => 'Ошибка сервера: ' . $e->getMessage()]));
}
