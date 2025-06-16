<?php
session_start();

require_once __DIR__ . '/db.php';

// Проверка ID
if (empty($_GET['id'])) {
    echo json_encode(['error' => 'Не указан ID товара']);
    exit;
}

$id = (int)$_GET['id'];

try {
    // Удаление товара
    $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
    $stmt->execute([$id]);

    // Проверка успешности удаления
    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Товар успешно удален']);
    } else {
        echo json_encode(['error' => 'Товар не найден']);
    }
} catch (Throwable $e) {
    error_log("Error: " . $e->getMessage());
    echo json_encode(['error' => 'Системная ошибка при удалении']);
}