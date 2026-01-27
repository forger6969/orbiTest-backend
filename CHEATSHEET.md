# 📌 Быстрая справка - Шпаргалка по API

Сохраните себе для быстрого доступа!

---

## 🔗 Все URL

```
Swagger UI:           http://localhost:5000/api-docs
JSON спец:            http://localhost:5000/swagger.json
Здоровье:             http://localhost:5000/health
API базовый URL:      http://localhost:5000
```

---

## 🔑 Аутентификация

### Регистрация

```
POST /api/auth/register
Body: {
  "username": "name",
  "email": "email@example.com",
  "password": "password",
  "firstName": "First",
  "lastName": "Last"
}
```

### Вход

```
POST /api/auth/login
Body: {
  "email": "email@example.com",
  "password": "password"
}
Ответ: {token: "JWT_TOKEN"}
```

### Использование токена

```
Headers: Authorization: Bearer JWT_TOKEN
```

---

## 👤 Профиль

```
GET /api/user/me
Header: Authorization: Bearer TOKEN
```

---

## 📚 Тесты

```
GET /api/test/all                    # Все тесты
GET /api/test/get/:id                # Конкретный тест
GET /api/test/types                  # Типы тестов
POST /api/test/create (ADMIN)        # Создать
POST /api/test/result (AUTH)         # Отправить результат
GET /api/test/myResults (AUTH)       # Мои результаты
```

---

## 👥 Группы

```
GET /api/group/all                   # Все группы
POST /api/group/create (ADMIN)       # Создать группу
POST /api/group/add (ADMIN)          # Добавить студента
```

---

## 📝 Экзамены

```
GET /api/exam/all                    # Все экзамены
POST /api/exam/create (ADMIN)        # Создать экзамен
```

---

## 📊 Типы данных

### Уровни квалификации

```
junior < strongJunior < middle < strongMiddle < senior
```

### Типы тестов

```
react, node, javaScript, python, html, css, vue
```

### Варианты ответов

```
a, b, c, d
```

### Роли

```
user, admin
```

### День занятий

```
even (четные), odd (нечетные)
```

### Статусы экзамена

```
underway (проводится), completed (завершен)
```

---

## 🔴 Коды ошибок

```
200 - OK
201 - Created
400 - Bad Request (неверные данные)
401 - Unauthorized (нет токена)
403 - Forbidden (нет прав admin)
404 - Not Found (не существует)
500 - Server Error
```

---

## 💾 Быстрые примеры

### Пример 1: Регистрация

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Пример 2: Вход

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'
```

### Пример 3: Получить профиль

```bash
curl -X GET http://localhost:5000/api/user/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Пример 4: Получить тесты

```bash
curl -X GET http://localhost:5000/api/test/all
```

### Пример 5: Отправить результат теста

```bash
curl -X POST http://localhost:5000/api/test/result \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testId": "TEST_ID",
    "answers": [
      {"questionId": "1", "answer": "a"}
    ]
  }'
```

---

## 🧙 Советы и трюки

### Сохраните токен в переменную (Linux/Mac)

```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123"}' | jq -r '.token')
echo $TOKEN
```

### Используйте переменные в curl

```bash
export TOKEN="your_token_here"
curl -X GET http://localhost:5000/api/user/me \
  -H "Authorization: Bearer $TOKEN"
```

### Красивый вывод JSON

```bash
curl ... | jq '.'
```

### Сохранить ответ в файл

```bash
curl ... -o response.json
```

---

## 🏃 Быстрый workflow

### Для студента (5 шагов)

```
1. POST /api/auth/register       → получить ID пользователя
2. POST /api/auth/login          → получить токен
3. GET /api/user/me              → проверить профиль
4. GET /api/test/all             → найти тест
5. POST /api/test/result         → отправить результат
```

### Для администратора (6 шагов)

```
1. POST /api/auth/login          → получить токен admin
2. POST /api/group/create        → создать группу
3. POST /api/group/add           → добавить студентов
4. POST /api/test/create         → создать тест
5. POST /api/exam/create         → создать экзамен
6. GET /api/test/myResults       → посмотреть результаты
```

---

## 🔍 Поиск в документации

| Ищите             | Смотрите               |
| ----------------- | ---------------------- |
| Быстрый старт     | QUICK_START.md         |
| Полная справка    | API_DOCUMENTATION.md   |
| Swagger интерфейс | SWAGGER_GUIDE.md       |
| Примеры curl      | CURL_EXAMPLES.sh       |
| Postman           | POSTMAN_INTEGRATION.md |
| Все файлы         | INDEX.md               |

---

## ⚡ Основные операции

```
Регистрация:        POST /api/auth/register
Вход:               POST /api/auth/login
Мой профиль:        GET /api/user/me
Все тесты:          GET /api/test/all
Один тест:          GET /api/test/get/:id
Отправить результат: POST /api/test/result
Мои результаты:     GET /api/test/myResults
Все группы:         GET /api/group/all
Все экзамены:       GET /api/exam/all
```

---

## 🛠️ Инструменты

```
Swagger UI:    http://localhost:5000/api-docs
Postman:       Импорт из http://localhost:5000/swagger.json
Curl:          Смотрите CURL_EXAMPLES.sh
JavaScript:    Используйте fetch с токеном в Authorization
Python:        requests.post(..., headers={'Authorization': f'Bearer {token}'})
```

---

## 🔐 Защищенные эндпоинты (требуют токен)

```
✅ GET /api/user/me
✅ POST /api/test/result
✅ GET /api/test/myResults
✅ POST /api/test/create (ADMIN)
✅ POST /api/group/create (ADMIN)
✅ POST /api/group/add (ADMIN)
✅ POST /api/exam/create (ADMIN)
```

---

## 🆓 Открытые эндпоинты (без токена)

```
✅ GET /
✅ GET /health
✅ POST /api/auth/register
✅ POST /api/auth/login
✅ GET /api/test/all
✅ GET /api/test/get/:id
✅ GET /api/test/types
✅ GET /api/group/all
✅ GET /api/exam/all
```

---

## 📝 Шаблоны запросов

### Header для всех запросов

```
Content-Type: application/json
```

### Header для защищенных запросов

```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Структура успешного ответа

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {...}
}
```

### Структура ошибки

```json
{
  "success": false,
  "message": "Error description",
  "errors": "Additional info"
}
```

---

## 🎯 Проверочный список

- [ ] npm install выполнен
- [ ] npm start запущен
- [ ] http://localhost:5000/health работает
- [ ] http://localhost:5000/api-docs открывается
- [ ] Зарегистрировался в API
- [ ] Получил JWT токен
- [ ] Авторизовался в Swagger UI
- [ ] Выполнил GET /api/user/me
- [ ] Выполнил GET /api/test/all
- [ ] Готов к разработке!

---

## 🚨 SOS - Решение проблем

```
Проблема: 401 Unauthorized
Решение:  Получите новый токен через POST /api/auth/login

Проблема: 403 Forbidden
Решение:  Используйте admin аккаунт для admin операций

Проблема: 400 Bad Request
Решение:  Проверьте синтаксис JSON и обязательные поля

Проблема: 404 Not Found
Решение:  Проверьте правильность ID в URL

Проблема: 500 Server Error
Решение:  Смотрите логи консоли, может быть problem с БД

Проблема: Cannot connect
Решение:  Запустите npm start и проверьте порт 5000
```

---

## 📚 Документация

- [INDEX.md](INDEX.md) - Полный индекс
- [QUICK_START.md](QUICK_START.md) - Старт за 5 минут
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - Полная справка
- [SWAGGER_GUIDE.md](SWAGGER_GUIDE.md) - Гайд интерфейса
- [CURL_EXAMPLES.sh](CURL_EXAMPLES.sh) - Примеры команд
- [POSTMAN_INTEGRATION.md](POSTMAN_INTEGRATION.md) - Постман

---

## 🎓 Изучение

**День 1:** Прочитайте QUICK_START.md + поэкспериментируйте в Swagger UI  
**День 2:** Прочитайте API_DOCUMENTATION.md + используйте CURL_EXAMPLES.sh  
**День 3:** Настройте Postman + создайте свой workflow  
**День 4:** Начните интегрировать в свой проект

---

**Последнее обновление:** 2025-01-27  
**Версия API:** 1.0.0  
**Статус:** ✅ Production Ready

---

## 🎉 Готовы?

```bash
# Запустите сервер
npm start

# Откройте в браузере
http://localhost:5000/api-docs

# Начните работать!
```

**Успехов в разработке!** 🚀
