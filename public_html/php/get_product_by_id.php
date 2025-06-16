<?php
require_once 'db.php';

// Включить отображение ошибок для отладки
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

// Проверяем наличие ID товара
if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Неверный ID товара']);
    exit;
}

$id = intval($_GET['id']);

try {
    // Проверка наличия параметров подключения
    if (empty($dsn) || empty($user) || empty($options)) {
        throw new Exception('Параметры подключения не настроены');
    }
    
    // Создаем подключение
    $pdo = new PDO($dsn, $user, $pass, $options);
    
    // Подготавливаем запрос 
    $stmt = $pdo->prepare("SELECT 
        id,
        product_name AS product_name,
        product_price AS product_price,
        product_description AS description,
        product_category AS category,
        image AS image, 
        stock AS stock
    FROM products WHERE id = :id");
    
    $stmt->bindParam(':id', $id, PDO::PARAM_INT);
    $stmt->execute();
    
    // Получаем результат
    $product = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Проверяем найден ли товар
    if (!$product) {
        http_response_code(404);
        echo json_encode(['error' => 'Товар не найден']);
        exit;
    }
    
    // Возвращаем данные товара
    echo json_encode($product);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Ошибка базы данных',
        'details' => $e->getMessage(),
        'dsn' => $dsn,
        'user' => $user
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Серверная ошибка',
        'details' => $e->getMessage(),
        'config' => [
            'dsn' => $dsn ?? 'не определен',
            'user' => $user ?? 'не определен',
            'pass' => isset($pass) ? 'установлен' : 'не установлен'
        ]
    ]);
}
?>