#!/bin/bash
# OrbiTest API - Примеры curl команд
# Используйте эти команды для тестирования API в терминале

# ============================================
# 🏥 HEALTH CHECK
# ============================================

# Простая проверка сервера
curl -X GET http://localhost:5000/

# Подробная проверка здоровья
curl -X GET http://localhost:5000/health

# ============================================
# 🔐 AUTHENTICATION - АУТЕНТИФИКАЦИЯ
# ============================================

# Регистрация нового пользователя
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_developer",
    "email": "john@example.com",
    "password": "SecurePass123",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Регистрация студента с добавлением в группу
# ПРИМЕЧАНИЕ: замените GROUP_ID на реальный ID группы
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jane_coder",
    "email": "jane@example.com",
    "password": "MyPassword456",
    "firstName": "Jane",
    "lastName": "Smith",
    "groupID": "GROUP_ID"
  }'

# Вход в систему (получение токена)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'

# СОХРАНИТЕ ПОЛУЧЕННЫЙ TOKEN! Он понадобится для всех защищенных запросов
# Пример токена: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================
# 👤 USER - ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ
# ============================================

# Получить информацию о текущем пользователе
# ЗАМЕНИТЕ YOUR_TOKEN на реальный токен из логина
curl -X GET http://localhost:5000/api/user/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# ============================================
# 📚 TESTS - ТЕСТЫ
# ============================================

# Получить все тесты (без авторизации)
curl -X GET http://localhost:5000/api/test/all

# Получить конкретный тест по ID
# ЗАМЕНИТЕ TEST_ID на реальный ID теста
curl -X GET http://localhost:5000/api/test/get/TEST_ID

# Получить все типы тестов
curl -X GET http://localhost:5000/api/test/types

# Создать новый тест (только администраторы)
# ЗАМЕНИТЕ ADMIN_TOKEN на токен администратора
curl -X POST http://localhost:5000/api/test/create \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "react",
    "testTitle": "React Fundamentals",
    "testDescribe": "Базовый тест по React",
    "testGrade": "junior",
    "gradeExperience": 5,
    "testTime": 1200000,
    "questions": [
      {
        "question": "Что такое JSX?",
        "variants": {
          "a": "JavaScript XML",
          "b": "Java Syntax Extension",
          "c": "JSON Extended",
          "d": "jQuery XML"
        },
        "correctAnswer": "a",
        "questionsScore": 10
      },
      {
        "question": "Как создать компонент в React?",
        "variants": {
          "a": "const Component = () => {}",
          "b": "function Component {}",
          "c": "class Component extends React.Component {}",
          "d": "Все варианты верны"
        },
        "correctAnswer": "d",
        "questionsScore": 10
      }
    ]
  }'

# Отправить результаты теста (прохождение теста)
# ЗАМЕНИТЕ TEST_ID на реальный ID теста
# ЗАМЕНИТЕ YOUR_TOKEN на реальный токен
curl -X POST http://localhost:5000/api/test/result \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testId": "TEST_ID",
    "answers": [
      {
        "questionId": "1",
        "answer": "a"
      },
      {
        "questionId": "2",
        "answer": "d"
      }
    ]
  }'

# Получить результаты текущего пользователя
curl -X GET http://localhost:5000/api/test/myResults \
  -H "Authorization: Bearer YOUR_TOKEN"

# ============================================
# 👥 GROUPS - ГРУППЫ
# ============================================

# Получить все группы (без авторизации)
curl -X GET http://localhost:5000/api/group/all

# Создать новую группу (только администраторы)
# ЗАМЕНИТЕ ADMIN_TOKEN на токен администратора
curl -X POST http://localhost:5000/api/group/create \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "groupName": "Frontend Group",
    "groupDescribe": "Группа для обучения frontend разработке",
    "groupDay": "even",
    "groupTime": "14:00-16:00",
    "avatar": "https://example.com/avatar.jpg",
    "telegramId": "-1001234567890"
  }'

# Добавить студента в группу (только администраторы)
# ЗАМЕНИТЕ GROUP_ID на ID группы, USER_ID на ID студента
curl -X POST http://localhost:5000/api/group/add \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "GROUP_ID",
    "userId": "USER_ID"
  }'

# ============================================
# 📝 EXAMS - ЭКЗАМЕНЫ
# ============================================

# Получить все экзамены (без авторизации)
curl -X GET http://localhost:5000/api/exam/all

# Создать новый экзамен (только администраторы)
# ЗАМЕНИТЕ GROUP_ID на реальный ID группы
curl -X POST http://localhost:5000/api/exam/create \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "examTitle": "React Advanced Exam",
    "examDescribe": "Продвинутый экзамен по React",
    "examStart": "2025-02-15T10:00:00Z",
    "examEnd": "2025-02-15T12:00:00Z",
    "group": "GROUP_ID",
    "requirements": [
      {
        "requirement": "React Hooks",
        "score": 8
      },
      {
        "requirement": "State Management",
        "score": 7
      },
      {
        "requirement": "Performance Optimization",
        "score": 6
      }
    ]
  }'

# ============================================
# 📊 ПОЛНЫЙ WORKFLOW (Полный цикл использования)
# ============================================

# Пример 1: Регистрация и прохождение теста

echo "1️⃣  Регистрация пользователя..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "student1",
    "email": "student1@example.com",
    "password": "Password123",
    "firstName": "Student",
    "lastName": "One"
  }')
echo "$REGISTER_RESPONSE" | jq '.'

echo ""
echo "2️⃣  Вход в систему..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student1@example.com",
    "password": "Password123"
  }')
echo "$LOGIN_RESPONSE" | jq '.'

# Извлеките token из ответа (требуется jq)
# TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')

echo ""
echo "3️⃣  Получение профиля пользователя..."
# curl -s -X GET http://localhost:5000/api/user/me \
#   -H "Authorization: Bearer $TOKEN" | jq '.'

echo ""
echo "4️⃣  Получение всех тестов..."
TEST_RESPONSE=$(curl -s -X GET http://localhost:5000/api/test/all)
echo "$TEST_RESPONSE" | jq '.tests[0]' # Показываем первый тест

echo ""
echo "✅ Workflow завершен!"

# ============================================
# 🛠️ ПОЛЕЗНЫЕ КОМАНДЫ
# ============================================

# Извлечение токена из ответа логина (требуется jq)
# TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
#   -H "Content-Type: application/json" \
#   -d '{"email":"john@example.com","password":"SecurePass123"}' | jq -r '.token')
# echo $TOKEN

# Красивый вывод JSON (требуется jq)
# curl -s ... | jq '.'

# Сохранение ответа в файл
# curl -s ... -o response.json

# Просмотр заголовков ответа
# curl -i ...

# Просмотр всех деталей (verbose)
# curl -v ...

# Установка переменных окружения для токена
# export AUTH_TOKEN="your_token_here"
# curl -X GET http://localhost:5000/api/user/me \
#   -H "Authorization: Bearer $AUTH_TOKEN"

# ============================================
# 💡 ПРИМЕЧАНИЯ
# ============================================

# 1. Замените все заполнители реальными значениями:
#    - YOUR_TOKEN → реальный JWT токен
#    - ADMIN_TOKEN → токен администратора
#    - TEST_ID → ID теста из GET /api/test/all
#    - GROUP_ID → ID группы из GET /api/group/all
#    - USER_ID → ID пользователя

# 2. Убедитесь что сервер запущен на http://localhost:5000

# 3. Для красивого вывода JSON установите jq:
#    Ubuntu/Debian: sudo apt-get install jq
#    macOS: brew install jq

# 4. Используйте postman для более удобного интерфейса

# 5. Все защищенные запросы требуют токена в заголовке:
#    Authorization: Bearer <token>

# ============================================
# 🔗 ДОКУМЕНТАЦИЯ
# ============================================

# Swagger UI: http://localhost:5000/api-docs
# JSON спецификация: http://localhost:5000/swagger.json
# Подробная документация: см. API_DOCUMENTATION.md

echo ""
echo "💡 Совет: для красивого вывода используйте jq"
echo "   Пример: curl ... | jq '.'"
