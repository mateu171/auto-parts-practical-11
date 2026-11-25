# Практична робота №10
## Комунікація у реальному часі та система нотифікацій

**Варіант 7 — Автозапчастини.** Кімната: `request_<vinCode>`, WebSocket-подія: `partFound`, email: «Результати підбору сумісної запчастини менеджером».

**Мета роботи:** реалізувати двосторонній обмін даними в реальному часі (WebSocket / Socket.IO), потокову передачу подій (SSE) та відправку HTML-листів (nodemailer + Mailpit) поверх API автозапчастин із практичної роботи №9.

### Використані технології
- NestJS, TypeORM, PostgreSQL, JWT-авторизація (з практичної №9)
- `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`
- RxJS (`interval`, `map`) + `@Sse()`
- `nodemailer` + Mailpit (Docker)

### Структура доданого коду

| Файл | Призначення |
|---|---|
| `src/notifications/events.gateway.ts` | WebSocket Gateway: lifecycle-хуки, `ping`/`pong`, `broadcastNotification`, `joinRoom`/`leaveRoom`, `emitToRoom()` |
| `src/notifications/notifications.controller.ts` | SSE-ендпоінт `GET /notifications/events/stream` (кожні 5 с) |
| `src/notifications/part-requests.controller.ts` | `POST /requests/:vinCode/part-found` (ролі ADMIN, MECHANIC) |
| `src/notifications/notifications.service.ts` | Бізнес-сценарій: WebSocket у кімнату + лист покупцю |
| `src/mail/mail.service.ts` | `MailService.sendNotificationEmail(to, subject, htmlContent)` |
| `src/mail/templates/part-found.template.ts` | Адаптивний HTML-шаблон листа (логотип, таблиця параметрів, кнопка) |
| `src/dto/part-found.dto.ts`, `src/common/pipes/parse-vin.pipe.ts` | Валідація вхідних даних і VIN-коду |
| `public/client.html` | Тестовий клієнт (Socket.IO + EventSource) |
| `docker-compose.yml` | Додано сервіс `mailpit` (SMTP 1025, Web UI 8025) |

Зміни в наявному коді: `main.ts` (CORS, роздача `public/`), `JwtAuthGuard` / `RolesGuard` / `ResponseTimeInterceptor` (пропускають не-HTTP контекст і SSE, щоб не ламати WebSocket та потік подій), `PartsModule` експортує `PartsService`.

### Запуск

```bash
npm install
npm i @nestjs/websockets @nestjs/platform-socket.io socket.io nodemailer
npm i -D @types/nodemailer

docker compose up -d          # PostgreSQL + Mailpit
npm run migration:run
npm run start:dev
```

- Клієнт: http://localhost:3000/client.html
- Mailpit Web UI: http://localhost:8025

Для виклику `POST /requests/:vinCode/part-found` потрібен токен користувача з роллю `MECHANIC` або `ADMIN`
(роль можна виставити в БД: `UPDATE users SET role = 'MECHANIC' WHERE email = '...';`) та `id` існуючої запчастини (`GET /parts`).
Готові запити — у файлі `requests.http`.

### Реалізований функціонал

**Рівень 1**
1. `EventsGateway` з `@WebSocketGateway({ cors: { origin: '*' } })`, логування підключень/відключень із `socket.id`.
2. `ping` → відповідь `pong` з таймстемпом; `broadcastNotification` → `server.emit('globalAlert', ...)` усім клієнтам.
3. `client.html`: поле введення, кнопка відправки, список подій; перевірено у двох вкладках.

**Рівень 2**
1. `joinRoom` / `leaveRoom` (серверний `client.join()` / `client.leave()`), формат кімнати `request_<VIN із 17 символів>` перевіряється на сервері; метод `emitToRoom(roomId, event, data)`.
2. `NotificationsController` з `@Sse('events/stream')`: `interval(5000)` + `map()` → статус сервера, uptime, кількість активних підключень, час сервера. SSE-ендпоінт публічний (`@Public()`), оскільки `EventSource` не передає заголовок `Authorization`.
3. У `client.html` додано блоки кімнати та SSE.

**Рівень 3**
1. Mailpit у `docker-compose.yml` (порти 1025 / 8025).
2. `MailService` на `nodemailer` (`localhost:1025`, `ignoreTLS`), HTML-шаблон з екрануванням користувацького тексту.
3. `POST /requests/:vinCode/part-found`: менеджер вказує `partId`, `customerEmail`, `managerComment`. Сервіс одночасно надсилає подію `partFound` у кімнату `request_<VIN>` і HTML-лист покупцю. Помилки: 400 — невалідний VIN/дані, 401 — без токена, 403 — недостатньо прав, 404 — запчастину не знайдено, 503 — не вдалося відправити лист.

### Приклад роботи

```
[EventsGateway] Клієнт підключився: s8A1fk29LmPq0192AB
[EventsGateway] Клієнт s8A1fk29LmPq0192AB приєднався до кімнати: request_WVWZZZ1JZXW000001

POST /requests/WVWZZZ1JZXW000001/part-found
{ "partId": "<uuid>", "customerEmail": "client@example.com", "managerComment": "..." }

HTTP/1.1 200 OK
{ "success": true, "message": "Запчастину підібрано, сповіщення надіслано в кімнату та на пошту", ... }

[EventsGateway] Сповіщення надіслано в кімнату request_WVWZZZ1JZXW000001: {"event":"partFound","recipients":1}
[MailService] Лист успішно надіслано на адресу client@example.com (Message ID: <...>)
```

### Скріншоти

1. Запуск Docker-контейнерів (PostgreSQL, Mailpit) та сервера без помилок

![Docker і запуск сервера](screenshots/01-docker-server.png)

2. Broadcast-повідомлення у двох вкладках браузера

![Broadcast у двох вкладках](screenshots/02-broadcast.png)

3. Приєднання до кімнати та SSE-потік у `client.html`

![Кімната та SSE](screenshots/03-rooms-sse.png)

4. Запит `POST /requests/:vinCode/part-found` та логи сервера

![Запит part-found](screenshots/04-part-found-request.png)

5. Подія `partFound` на сторінці клієнта в кімнаті

![Подія partFound у клієнті](screenshots/05-client-partfound.png)

6. Лист у Mailpit (http://localhost:8025)

![Лист у Mailpit](screenshots/06-mailpit.png)

### Висновок

У ході роботи розширено API автозапчастин механізмами real-time комунікації: реалізовано WebSocket Gateway з широкомовленням і кімнатами, односторонній потік подій через SSE на основі RxJS та відправку HTML-листів через nodemailer із тестуванням у Mailpit. Бізнес-сценарій підбору запчастини менеджером одночасно сповіщає клієнта у відкритій вкладці (WebSocket) та на пошту (email), що поєднує миттєве й довгострокове інформування.
