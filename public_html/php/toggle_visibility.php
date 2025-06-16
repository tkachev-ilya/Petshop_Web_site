<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json; charset=utf-8');

require_once 'db.php';

try {
    // Логирование входящих данных
    file_put_contents('debug.log', print_r($_POST, true), FILE_APPEND);

    // Проверка ID товара
    if (empty($_POST['id'])) {
        throw new Exception('ID товара не указан');
    }

    // Проверка параметра is_visible
    if (!isset($_POST['is_visible'])) {
        throw new Exception('Параметр is_visible не указан');
    }

    $id = intval($_POST['id']);
    $is_visible = filter_var($_POST['is_visible'], FILTER_VALIDATE_BOOLEAN);

    // Подключение к БД
    $pdo = new PDO($dsn, $user, $pass, $options);

    // Начинаем транзакцию
    $pdo->beginTransaction();

    try {
        // 1. Обновляем видимость товара
        $stmt = $pdo->prepare("UPDATE products SET is_visible = :is_visible WHERE id = :id");
        $stmt->bindParam(':is_visible', $is_visible, PDO::PARAM_BOOL);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        
        if (!$stmt->execute()) {
            throw new Exception('Ошибка обновления видимости товара');
        }

        // 2. Если товар скрывается (is_visible = 0), удаляем его из всех корзин
        if (!$is_visible) {
            $deleteStmt = $pdo->prepare("DELETE FROM user_carts WHERE product_id = :product_id");
            $deleteStmt->bindParam(':product_id', $id, PDO::PARAM_INT);
            
            if (!$deleteStmt->execute()) {
                throw new Exception('Ошибка удаления товара из корзин');
            }
            
            $deletedCount = $deleteStmt->rowCount();
            file_put_contents('debug.log', "Удалено из корзин: $deletedCount записей\n", FILE_APPEND);
        }

        // Фиксируем транзакцию
        $pdo->commit();

        $message = $is_visible 
            ? 'Товар теперь видимый' 
            : 'Товар скрыт и удален из корзин пользователей';
            
        echo json_encode([
            'success' => true, 
            'message' => $message,
            'removed_from_carts' => !$is_visible ? $deletedCount : 0
        ]);

    } catch (Exception $e) {
        // Откатываем транзакцию при ошибке
        $pdo->rollBack();
        throw $e;
    }

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>