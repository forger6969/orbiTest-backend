# OrbiTest Backend API Документация

Полная документация REST API для платформы тестирования OrbiTest.

## 📋 Оглавление

1. [Быстрый старт](#быстрый-старт)
2. [Структура проекта](#структура-проекта)
3. [Аутентификация](#аутентификация)
4. [API Эндпоинты](#api-эндпоинты)
5. [Типы данных](#типы-данных)
6. [Примеры использования](#примеры-использования)
7. [Коды ошибок](#коды-ошибок)

## Быстрый старт

### Установка зависимостей

```bash
npm install
```

### Запуск сервера

```bash
npm start
```

Сервер запустится на `http://localhost:5000`

### Просмотр документации Swagger

После запуска сервера откройте в браузере:

```
http://localhost:5000/api-docs
```

## Структура проекта

```
orbiTest-backend/
├── auth/                 # Модуль аутентификации
│   ├── auth.controller.js
│   ├── auth.routes.js
│   ├── auth.validator.js
│   └── userZodSchema.js
├── user/                 # Модуль профиля пользователя
│   ├── user.controller.js
│   ├── user.model.js
│   └── user.routes.js
├── tests/                # Модуль тестов
│   ├── test.controller.js
│   ├── test.model.js
│   ├── test.routes.js
│   ├── result.model.js
│   └── result.controller.js
├── groups/               # Модуль групп
│   ├── group.controller.js
│   ├── group.model.js
│   └── group.routes.js
├── exams/                # Модуль экзаменов
│   ├── exam.controller.js
│   ├── exam.model.js
│   └── exam.routes.js
├── middlewares/          # Middleware функции
│   └── auth.middleware.js
├── socket/               # Socket.IO интеграция
├── telegrambot/          # Telegram бот интеграция
├── app.js               # Express приложение
├── server.js            # Точка входа
├── swagger.json         # OpenAPI спецификация
└── package.json         # Зависимости проекта
```

## Аутентификация

Все защищенные эндпоинты требуют JWT токена в заголовке `Authorization`:

```
Authorization: Bearer <ваш_jwt_токен>
```

### Получение токена

1. Зарегистрируйтесь через `POST /api/auth/register`
2. Выполните вход через `POST /api/auth/login`
3. Используйте полученный токен в заголовке `Authorization` для защищенных запросов

## API Эндпоинты

### Здоровье сервера

#### Проверка статуса

```
GET /
```

Простая проверка работы сервера.

**Ответ:**

```
OrbiTest Backend is running
```

#### Подробная проверка

```
GET /health
```

**Ответ:**

```json
{
  "status": "OK",
  "uptime": 3600,
  "timestamp": "2025-01-27T12:00:00.000Z",
  "service": "OrbiTest Backend"
}
```

### Аутентификация

#### Регистрация пользователя

```
POST /api/auth/register
```

**Тело запроса:**

```json
{
  "username": "john_developer",
  "email": "john@example.com",
  "password": "MyPassword123",
  "firstName": "John",
  "lastName": "Doe",
  "groupID": "507f1f77bcf86cd799439011" // опционально
}
```

**Ответ (200):**

```json
{
  "success": true,
  "message": "User registered",
  "newUser": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "john_developer",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "grade": "junior",
    "gradeExperience": 0,
    "role": "user",
    "avatar": "https://..."
  }
}
```

**Требования:**

- `username`: 3-30 символов, уникален
- `email`: валидный email, уникален
- `password`: минимум 6 символов
- `firstName`: имя пользователя
- `lastName`: фамилия пользователя

#### Вход в систему

```
POST /api/auth/login
```

**Тело запроса:**

```json
{
  "email": "john@example.com",
  "password": "MyPassword123"
}
```

**Ответ (200):**

```json
{
  "success": true,
  "message": "User logged in",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "john_developer",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Профиль пользователя

#### Получить информацию о текущем пользователе

```
GET /api/user/me
```

**Заголовки:**

```
Authorization: Bearer <token>
```

**Ответ (200):**

```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "john_developer",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "grade": "junior",
    "gradeExperience": 250,
    "testsHistory": ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"],
    "role": "user",
    "avatar": "https://..."
  }
}
```

### Тесты

#### Создать новый тест (только администраторы)

```
POST /api/test/create
```

**Заголовки:**

```
Authorization: Bearer <admin_token>
```

**Тело запроса:**

```json
{
  "testType": "react",
  "testTitle": "React Fundamentals",
  "testDescribe": "Тест на знание основ React",
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
      "questionsScore": 5
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
      "questionsScore": 5
    }
  ]
}
```

**Ответ (201):**

```json
{
  "success": true,
  "message": "Test created",
  "test": {
    "_id": "507f1f77bcf86cd799439014",
    "testType": "react",
    "testTitle": "React Fundamentals",
    "testGrade": "junior",
    "gradeExperience": 5,
    "questionsCount": 2,
    "maxScore": 10,
    "createdAt": "2025-01-27T12:00:00.000Z"
  }
}
```

#### Получить все тесты

```
GET /api/test/all
```

**Ответ (200):**

```json
{
  "success": true,
  "tests": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "testType": "react",
      "testTitle": "React Fundamentals",
      "testGrade": "junior",
      "questionsCount": 2,
      "maxScore": 10,
      "averageResult": 7.5,
      "createdAt": "2025-01-27T12:00:00.000Z"
    }
  ]
}
```

#### Получить тест по ID

```
GET /api/test/get/{id}
```

**Параметры:**

- `id` (path): ObjectId теста

**Ответ (200):**

```json
{
  "success": true,
  "test": {
    "_id": "507f1f77bcf86cd799439014",
    "testType": "react",
    "testTitle": "React Fundamentals",
    "questions": [
      {
        "questiondId": 1234567890,
        "question": "Что такое JSX?",
        "variants": {
          "a": "JavaScript XML",
          "b": "Java Syntax Extension",
          "c": "JSON Extended",
          "d": "jQuery XML"
        },
        "questionsScore": 5
      }
    ],
    "questionsCount": 2,
    "maxScore": 10,
    "testTime": 1200000
  }
}
```

#### Получить типы тестов

```
GET /api/test/types
```

**Ответ (200):**

```json
{
  "success": true,
  "types": ["react", "node", "javaScript", "python", "html", "css", "vue"]
}
```

#### Отправить результаты теста

```
POST /api/test/result
```

**Заголовки:**

```
Authorization: Bearer <token>
```

**Тело запроса:**

```json
{
  "testId": "507f1f77bcf86cd799439014",
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
}
```

**Ответ (201):**

```json
{
  "success": true,
  "message": "Result added",
  "result": {
    "_id": "507f1f77bcf86cd799439015",
    "user": "507f1f77bcf86cd799439011",
    "test": "507f1f77bcf86cd799439014",
    "score": 10,
    "successRate": 100,
    "answers": [
      {
        "questionId": "1",
        "answer": "a",
        "correct": true
      },
      {
        "questionId": "2",
        "answer": "d",
        "correct": true
      }
    ],
    "createdAt": "2025-01-27T12:00:00.000Z"
  }
}
```

#### Получить результаты пользователя

```
GET /api/test/myResults
```

**Заголовки:**

```
Authorization: Bearer <token>
```

**Ответ (200):**

```json
{
  "success": true,
  "results": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "user": "507f1f77bcf86cd799439011",
      "test": "507f1f77bcf86cd799439014",
      "score": 10,
      "successRate": 100,
      "createdAt": "2025-01-27T12:00:00.000Z"
    }
  ]
}
```

### Группы

#### Создать новую группу (только администраторы)

```
POST /api/group/create
```

**Заголовки:**

```
Authorization: Bearer <admin_token>
```

**Тело запроса:**

```json
{
  "groupName": "Frontend Group",
  "groupDescribe": "Группа для изучения frontend разработки",
  "groupDay": "even",
  "groupTime": "14:00-16:00",
  "avatar": "https://...",
  "telegramId": "-1001234567890"
}
```

**Ответ (201):**

```json
{
  "success": true,
  "message": "Group created",
  "group": {
    "_id": "507f1f77bcf86cd799439016",
    "groupName": "Frontend Group",
    "groupDescribe": "Группа для изучения frontend разработки",
    "students": [],
    "groupDay": "even",
    "groupTime": "14:00-16:00",
    "groupPerformance": 0,
    "createdAt": "2025-01-27T12:00:00.000Z"
  }
}
```

#### Добавить студента в группу (только администраторы)

```
POST /api/group/add
```

**Заголовки:**

```
Authorization: Bearer <admin_token>
```

**Тело запроса:**

```json
{
  "groupId": "507f1f77bcf86cd799439016",
  "userId": "507f1f77bcf86cd799439011"
}
```

**Ответ (200):**

```json
{
  "success": true,
  "message": "Student added to group",
  "group": {
    "_id": "507f1f77bcf86cd799439016",
    "groupName": "Frontend Group",
    "students": ["507f1f77bcf86cd799439011"],
    "groupDay": "even"
  }
}
```

#### Получить все группы

```
GET /api/group/all
```

**Ответ (200):**

```json
{
  "success": true,
  "groups": [
    {
      "_id": "507f1f77bcf86cd799439016",
      "groupName": "Frontend Group",
      "groupDescribe": "Группа для изучения frontend разработки",
      "students": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
      "groupDay": "even",
      "groupTime": "14:00-16:00",
      "groupPerformance": 85,
      "createdAt": "2025-01-27T12:00:00.000Z"
    }
  ]
}
```

### Экзамены

#### Создать новый экзамен (только администраторы)

```
POST /api/exam/create
```

**Заголовки:**

```
Authorization: Bearer <admin_token>
```

**Тело запроса:**

```json
{
  "examTitle": "React Advanced Exam",
  "examDescribe": "Продвинутый экзамен по React",
  "examStart": "2025-02-15T10:00:00Z",
  "examEnd": "2025-02-15T12:00:00Z",
  "group": "507f1f77bcf86cd799439016",
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
}
```

**Ответ (201):**

```json
{
  "success": true,
  "message": "Exam created",
  "exam": {
    "_id": "507f1f77bcf86cd799439017",
    "examTitle": "React Advanced Exam",
    "examDescribe": "Продвинутый экзамен по React",
    "status": "underway",
    "examStart": "2025-02-15T10:00:00.000Z",
    "examEnd": "2025-02-15T12:00:00.000Z",
    "group": "507f1f77bcf86cd799439016",
    "maxScore": 21,
    "requirements": [
      {
        "requirement": "React Hooks",
        "score": 8
      }
    ],
    "createdAt": "2025-01-27T12:00:00.000Z"
  }
}
```

#### Получить все экзамены

```
GET /api/exam/all
```

**Ответ (200):**

```json
{
  "success": true,
  "exams": [
    {
      "_id": "507f1f77bcf86cd799439017",
      "examTitle": "React Advanced Exam",
      "status": "underway",
      "examStart": "2025-02-15T10:00:00.000Z",
      "examEnd": "2025-02-15T12:00:00.000Z",
      "group": "507f1f77bcf86cd799439016",
      "maxScore": 21,
      "isEnd": false,
      "createdAt": "2025-01-27T12:00:00.000Z"
    }
  ]
}
```

## Типы данных

### Уровни квалификации (Grades)

```
junior - Младший разработчик
strongJunior - Сильный junior
middle - Middle разработчик
strongMiddle - Сильный middle
senior - Senior разработчик
```

### Типы тестов

```
react - React
node - Node.js
javaScript - JavaScript
python - Python
html - HTML
css - CSS
vue - Vue.js
```

### Варианты ответов

Все вопросы в тестах имеют 4 варианта ответа:

- `a` - первый вариант
- `b` - второй вариант
- `c` - третий вариант
- `d` - четвертый вариант

### Роли пользователей

```
user - Обычный пользователь
admin - Администратор (может создавать тесты, группы, экзамены)
```

### День проведения занятий

```
even - четные дни недели
odd - нечетные дни недели
```

### Статусы экзаменов

```
underway - Экзамен проводится
completed - Экзамен завершен
```

## Примеры использования

### Пример 1: Полный цикл регистрации и прохождения теста

```bash
# 1. Регистрация
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "student1",
    "email": "student@example.com",
    "password": "Password123",
    "firstName": "John",
    "lastName": "Doe"
  }'

# 2. Вход в систему
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "Password123"
  }'

# Сохранить полученный token из ответа

# 3. Получить профиль
curl -X GET http://localhost:5000/api/user/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Получить список доступных тестов
curl -X GET http://localhost:5000/api/test/all

# 5. Получить конкретный тест
curl -X GET http://localhost:5000/api/test/get/507f1f77bcf86cd799439014

# 6. Отправить результаты теста
curl -X POST http://localhost:5000/api/test/result \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testId": "507f1f77bcf86cd799439014",
    "answers": [
      {"questionId": "1", "answer": "a"},
      {"questionId": "2", "answer": "d"}
    ]
  }'

# 7. Получить результаты
curl -X GET http://localhost:5000/api/test/myResults \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Пример 2: Администратор создает тест и экзамен

```bash
# 1. Вход администратора
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "AdminPassword123"
  }'

# Сохранить admin token

# 2. Создать группу
curl -X POST http://localhost:5000/api/group/create \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "groupName": "Batch 1",
    "groupDescribe": "Первая группа",
    "groupDay": "even",
    "groupTime": "10:00-12:00"
  }'

# Сохранить groupId из ответа

# 3. Создать тест
curl -X POST http://localhost:5000/api/test/create \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testType": "react",
    "testTitle": "React Basics",
    "testGrade": "junior",
    "gradeExperience": 5,
    "questions": [
      {
        "question": "Что такое React?",
        "variants": {
          "a": "JavaScript библиотека",
          "b": "HTML фреймворк",
          "c": "CSS процессор",
          "d": "Базаа данных"
        },
        "correctAnswer": "a",
        "questionsScore": 5
      }
    ]
  }'

# Сохранить testId из ответа

# 4. Создать экзамен
curl -X POST http://localhost:5000/api/exam/create \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "examTitle": "React Final",
    "examStart": "2025-02-20T10:00:00Z",
    "examEnd": "2025-02-20T12:00:00Z",
    "group": "GROUP_ID",
    "requirements": [
      {"requirement": "React Basics", "score": 7},
      {"requirement": "JSX", "score": 6}
    ]
  }'
```

## Коды ошибок

### 200 OK

Успешный запрос

### 201 Created

Ресурс успешно создан

### 400 Bad Request

Ошибка в запросе (неверные данные, не все обязательные поля)

```json
{
  "success": false,
  "message": "Invalid data",
  "errors": "..."
}
```

### 401 Unauthorized

Отсутствует или неверный токен аутентификации

```json
{
  "success": false,
  "message": "Unauthorized"
}
```

### 403 Forbidden

Пользователь не имеет прав администратора для выполнения операции

```json
{
  "success": false,
  "message": "Admin access required"
}
```

### 404 Not Found

Ресурс не найден

```json
{
  "success": false,
  "message": "Not found"
}
```

### 500 Internal Server Error

Внутренняя ошибка сервера

```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Важные примечания

### Безопасность

- Все пароли хэшируются с использованием bcrypt
- JWT токены используются для аутентификации
- Правильные ответы на вопросы не отправляются клиенту (помечены `select: false` в модели)

### Валидация данных

- Используется Zod для валидации входных данных
- Email должен быть уникален
- Username должен быть уникален (3-30 символов)
- Пароль должен содержать минимум 6 символов

### Интеграция с Telegram

- Группа может иметь Telegram ID для отправки уведомлений
- При добавлении студента в группу отправляется уведомление в Telegram

### Socket.IO

- Проект использует Socket.IO для real-time обновлений
- Можно использовать для уведомлений о новых тестах, результатах и т.д.

## Контакты и поддержка

Для вопросов и поддержки обратитесь к команде разработки.
