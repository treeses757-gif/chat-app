const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Хранилище пользователей
const users = new Map();

io.on('connection', (socket) => {
  console.log('Новое подключение:', socket.id);

  // Новый пользователь
  socket.on('join', (username) => {
    users.set(socket.id, {
      id: socket.id,
      username: username || `User${socket.id.slice(0, 4)}`,
      joinedAt: new Date()
    });

    // Уведомляем всех о новом пользователе
    io.emit('user_joined', {
      username: users.get(socket.id).username,
      usersCount: users.size,
      timestamp: new Date().toISOString()
    });

    // Отправляем текущих пользователей новому подключению
    socket.emit('users_list', Array.from(users.values()));
  });

  // Обработка сообщений
  socket.on('message', (data) => {
    const user = users.get(socket.id);
    if (!user) return;

    const message = {
      id: Date.now(),
      username: user.username,
      text: data.text,
      timestamp: new Date().toISOString(),
      userId: socket.id
    };

    // Рассылаем сообщение всем
    io.emit('new_message', message);
    console.log(`[${message.username}]: ${message.text}`);
  });

  // Отключение пользователя
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);
      
      io.emit('user_left', {
        username: user.username,
        usersCount: users.size,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Пользователь отключился: ${user.username}`);
    }
  });

  // Системное сообщение при подключении
  socket.emit('system', {
    text: 'Добро пожаловать в чат! Введите имя:',
    type: 'info'
  });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Откройте http://localhost:${PORT} в браузере`);
});