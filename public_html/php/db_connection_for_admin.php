<?php
$host = 'localhost';
$dbname = 'tcache3t_product';
$user = 'tcache3t_product';
$pass = 'Pn!AT7HS%7BP'; 

$dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";

$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false
];
?>