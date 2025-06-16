<?php
require 'db.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['code'], $data['discount'], $data['expiry_date'])) {
    echo json_encode(['error' => 'Недостаточно данных']);
    exit;
}

$code = $data['code'];
$discount = $data['discount'];
$expiry_date = $data['expiry_date'];

// Валидация данных
if (empty($code)) {
    echo json_encode(['error' => 'Код купона не может быть пустым']);
    exit;
}

// Всегда процентная скидка (1-100%)
if ($discount < 1 || $discount > 100) {
    echo json_encode(['error' => 'Неверное значение скидки (должно быть 1-100%)']);
    exit;
}

try {
    // Проверка на уникальность кода
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM coupons WHERE code = ?");
    $stmt->execute([$code]);
    if ($stmt->fetchColumn() > 0) {
        echo json_encode(['error' => 'Купон с таким кодом уже существует']);
        exit;
    }

    // Добавление нового купона (всегда тип 'percentage')
    $query = "INSERT INTO coupons (code, discount, expiry_date, type) VALUES (?, ?, ?, 'percentage')";
    $stmt = $pdo->prepare($query);
    $stmt->execute([$code, $discount, $expiry_date]);
    
    echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
} catch (PDOException $e) {
    echo json_encode(['error' => 'Ошибка базы данных: ' . $e->getMessage()]);
}