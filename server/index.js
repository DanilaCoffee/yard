require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const http = require('http');
const socketio = require('socket.io');
const { VK } = require('vk-io');

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const PORT = process.env.PORT || 3000;

const vk = new VK({
    token: process.env.VK_TOKEN
});

async function sendVKNotification(text) {
    try {
        const keyboard = JSON.stringify({
            buttons: [
                [
                    {
                        action: {
                            type: "open_link",
                            link: 'https://danilacoffee.github.io/Layout-test/',
                            label: "👑 Перейти в админ-панель"
                        }
                    }
                ]
            ],
            inline: false
        });

        await vk.api.messages.send({
            peer_id: parseInt(process.env.ADMIN_ID),
            message: text,
            random_id: Date.now(),
            keyboard: keyboard
        });
    } catch (error) {
        console.error('Ошибка ВК:', error.message);
    }
}

function isAuthenticated(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    return res.status(401).json({ 
        error: 'Unauthorized',
        needAuth: true 
    });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(new Error('Только JPG и PNG изображения'), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: fileFilter
});

async function startServer() {
  try {
    const db = await mysql.createConnection({
        host: "192.168.0.4",
        user: "gen_user",
        password: "46oQ,#Y)g_js*6",
        database: "default_db",
        port: 3306,
        ssl: {
            rejectUnauthorized: false
        }
    });
    
    console.log('Подключено к БД');
    
    app.use(express.json());
    app.use(express.static(path.join(__dirname, '../client')));
    app.use('/admin', express.static(path.join(__dirname, '../admin')));
    app.use('/uploads', express.static('uploads'));

    const sessionMiddleware = session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 3 * 24 * 60 * 60 * 1000
      },
      rolling: true
    });

    app.use(sessionMiddleware);
    io.engine.use(sessionMiddleware);

    io.use((socket, next) => {
      const session = socket.request.session;
      socket.session = session;
      next();
    });

    async function shouldSendNotification(chatId) {
      const [rows] = await db.query(
        `SELECT created_at 
         FROM messages 
         WHERE chat_id = ? AND sender_type = 'user' 
         ORDER BY created_at DESC 
         LIMIT 1 OFFSET 1`,
        [chatId]
      );
      
      if (rows.length === 0) {
        return true;
      }
      
      const lastMessageTime = new Date(rows[0].created_at);
      const currentTime = new Date();
      const timeDiffMinutes = (currentTime - lastMessageTime) / (1000 * 60);
      
      return timeDiffMinutes > 5;
    }

    app.post('/api/admin/login', async (req, res) => {
        const { login, password } = req.body;
        
        const adminLogin = process.env.ADMIN_LOGIN;
        const adminPassword = process.env.ADMIN_PASSWORD;
        
        if (login !== adminLogin) {
            return res.status(401).json({ 
                success: false, 
                message: 'Неверный логин или пароль' 
            });
        }
        
        if (password !== adminPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Неверный логин или пароль' 
            });
        }
        
        req.session.isAdmin = true;
        req.session.login = login;
        
        res.json({ 
            success: true, 
            message: 'Вход выполнен успешно' 
        });
    });

    app.get('/api/admin/check-auth', (req, res) => {
        if (req.session && req.session.isAdmin) {
            res.json({ 
                isAuthenticated: true,
                login: req.session.login
            });
        } else {
            res.json({ 
                isAuthenticated: false 
            });
        }
    });

    app.post('/api/admin/logout', (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Ошибка при выходе' 
                });
            }
            res.json({ 
                success: true, 
                message: 'Вы вышли из системы' 
            });
        });
    });

    app.get('/api/requests', isAuthenticated, async (req, res) => {
      try {
          const [rows] = await db.query(
              'SELECT * FROM client_orders ORDER BY is_viewed ASC, created_at DESC'
          );
          res.json(rows);
      } catch (error) {
          console.error('Ошибка при получении заявок:', error);
          res.status(500).json({ error: 'Ошибка сервера' });
      }
    });

    app.put('/api/requests/:id/view', isAuthenticated, async (req, res) => {
      const { id } = req.params;
      
      try {
          const [result] = await db.query(
              'UPDATE client_orders SET is_viewed = TRUE WHERE id = ?',
              [id]
          );
          
          if (result.affectedRows === 0) {
              return res.status(404).json({ error: 'Заявка не найдена' });
          }
          
          res.json({ success: true, message: 'Статус обновлен' });
      } catch (error) {
          console.error('Ошибка при обновлении заявки:', error);
          res.status(500).json({ error: 'Ошибка сервера' });
      }
    });

    app.delete('/api/requests/:id', isAuthenticated, async (req, res) => {
      const { id } = req.params;
      
      try {
          const [result] = await db.query(
              'DELETE FROM client_orders WHERE id = ?',
              [id]
          );
          
          if (result.affectedRows === 0) {
              return res.status(404).json({ error: 'Заявка не найдена' });
          }
          
          res.json({ success: true, message: 'Заявка успешно удалена' });
      } catch (error) {
          console.error('Ошибка при удалении заявки:', error);
          res.status(500).json({ error: 'Ошибка сервера' });
      }
    });

    app.post('/api/requests', async (req, res) => {
        const { 
            client_name, 
            client_email, 
            client_phone, 
            client_uuid, 
            request_type, 
            client_comment 
        } = req.body;
        
        if (!client_name || !client_email || !client_phone || !client_uuid || !request_type) {
            return res.status(400).json({ 
                error: 'Все поля обязательны для заполнения' 
            });
        }
        
        try {
            const [result] = await db.query(
                `INSERT INTO client_orders 
                (client_name, client_email, client_phone, client_uuid, request_type, client_comment) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [client_name, client_email, client_phone, client_uuid, request_type, client_comment || null]
            );
            
            res.status(201).json({ 
                success: true, 
                message: 'Заявка создана',
                id: result.insertId 
            });

            sendVKNotification(
              `🔔 НОВАЯ ЗАЯВКА!\n\n` +
              `Имя пользователя: ${client_name}\n` +
              `Тип заявки: ${request_type}`
            );
        } catch (error) {
            console.error('Ошибка при создании заявки:', error);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });

    app.get('/api/projects', async (req, res) => {
      try {
          const [projects] = await db.query('SELECT * FROM projects ORDER BY id DESC');
          
          for (let project of projects) {
              const [images] = await db.query(
                  'SELECT image_url FROM project_images WHERE project_id = ?',
                  [project.id]
              );
              project.images = images.map(img => img.image_url);
          }
          
          res.json(projects);
      } catch (error) {
          console.error('Ошибка при получении проектов:', error);
          res.status(500).json({ error: 'Ошибка сервера' });
      }
    });

    app.post('/api/projects', isAuthenticated, upload.array('images', 100), async (req, res) => {
      try {
          if (!req.files || req.files.length === 0) {
              return res.status(400).json({ 
                  error: 'Необходимо загрузить хотя бы одну картинку' 
              });
          }

          const { name, area, renovation_type, duration_days, comment } = req.body;

          const errors = [];
          
          if (!name || name.trim() === '') {
              errors.push('Название проекта обязательно');
          }
          
          if (!area || isNaN(area) || parseFloat(area) <= 0) {
              errors.push('Площадь должна быть положительным числом');
          }
          
          if (!renovation_type || renovation_type === '') {
              errors.push('Тип ремонта обязателен');
          }
          
          if (!duration_days || isNaN(duration_days) || parseInt(duration_days) < 1) {
              errors.push('Срок должен быть положительным целым числом');
          }

          if (errors.length > 0) {
              req.files.forEach(file => {
                  fs.unlink(file.path, (err) => {
                      if (err) console.error('Ошибка удаления файла:', err);
                  });
              });
              
              return res.status(400).json({ 
                  error: 'Ошибка валидации',
                  details: errors 
              });
          }

          const [projectResult] = await db.query(
              `INSERT INTO projects (name, area, renovation_type, duration_days, comment) 
               VALUES (?, ?, ?, ?, ?)`,
              [
                  name.trim(), 
                  parseFloat(area), 
                  renovation_type, 
                  parseInt(duration_days), 
                  comment ? comment.trim() : ''
              ]
          );

          const projectId = projectResult.insertId;

          if (!projectId) {
              throw new Error('Не удалось создать проект');
          }

          if (req.files && req.files.length > 0) {
              const imageValues = req.files.map(file => [file.filename, projectId]);
              
              const [imageResult] = await db.query(
                  `INSERT INTO project_images (image_url, project_id) VALUES ?`,
                  [imageValues]
              );

              if (imageResult.affectedRows !== req.files.length) {
                  throw new Error('Не все картинки были сохранены');
              }
          }

          const [project] = await db.query(
              `SELECT * FROM projects WHERE id = ?`,
              [projectId]
          );

          const [images] = await db.query(
              `SELECT image_url FROM project_images WHERE project_id = ?`,
              [projectId]
          );

          const imageUrls = images.map(img => `/uploads/${img.image_url}`);

          const newProject = {
              ...project[0],
              images: imageUrls
          };

          res.status(201).json({
              message: 'Проект успешно создан',
              project: newProject
          });

      } catch (error) {
          console.error('Ошибка при создании проекта:', error);
          
          if (req.files) {
              req.files.forEach(file => {
                  fs.unlink(file.path, (err) => {
                      if (err) console.error('Ошибка удаления файла:', err);
                  });
              });
          }
          
          res.status(500).json({ 
              error: 'Ошибка сервера при создании проекта',
              message: error.message || 'Неизвестная ошибка'
          });
      }
    });

    app.delete('/api/projects/:id', isAuthenticated, async (req, res) => {
        try {
            const projectId = req.params.id;

            if (!projectId || isNaN(projectId)) {
                return res.status(400).json({ error: 'Неверный ID проекта' });
            }

            const [images] = await db.query(
                'SELECT image_url FROM project_images WHERE project_id = ?',
                [projectId]
            );

            const [project] = await db.query(
                'SELECT id FROM projects WHERE id = ?',
                [projectId]
            );

            if (project.length === 0) {
                return res.status(404).json({ error: 'Проект не найден' });
            }

            let deletedFiles = 0;
            let failedFiles = 0;

            if (images.length > 0) {
                for (const image of images) {
                    const filePath = path.join(__dirname, 'uploads', image.image_url);
                    try {
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                            deletedFiles++;
                        }
                    } catch (err) {
                        console.error(`Ошибка удаления файла ${image.image_url}:`, err);
                        failedFiles++;
                    }
                }
            }

            const [result] = await db.query(
                'DELETE FROM projects WHERE id = ?',
                [projectId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Проект не найден' });
            }

            res.json({
                message: 'Проект успешно удален',
                deletedFiles: deletedFiles,
                failedFiles: failedFiles,
                projectId: projectId
            });

        } catch (error) {
            console.error('Ошибка при удалении проекта:', error);
            res.status(500).json({ 
                error: 'Ошибка сервера при удалении проекта',
                message: error.message 
            });
        }
    });

    app.get('/api/chats', isAuthenticated, async (req, res) => {
      try {
        const [chats] = await db.query(`
          SELECT 
            c.id, 
            c.user_id, 
            c.created_at,
            m.text as last_message,
            m.created_at as last_message_time
          FROM chats c
          LEFT JOIN messages m ON m.id = (
            SELECT id 
            FROM messages 
            WHERE chat_id = c.id 
            ORDER BY created_at DESC 
            LIMIT 1
          )
          WHERE m.id IS NOT NULL
          ORDER BY m.created_at DESC
        `);
        res.json(chats);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.delete('/api/chats/:userId', isAuthenticated, async (req, res) => {
      try {
        const { userId } = req.params;
        const [chat] = await db.query('SELECT id FROM chats WHERE user_id = ?', [userId]);
        
        if (chat.length === 0) {
          return res.status(404).json({ error: 'Чат не найден' });
        }
        
        const chatId = chat[0].id;

        await db.query('DELETE FROM messages WHERE chat_id = ?', [chatId]);
        await db.query('DELETE FROM chats WHERE id = ?', [chatId]);
        
        res.json({ 
          success: true, 
          message: 'Чат и все сообщения успешно удалены',
          chatId: chatId
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/messages/:userId', isAuthenticated, async (req, res) => {
      try {
        const [chat] = await db.query('SELECT id FROM chats WHERE user_id = ?', [req.params.userId]);
        if (chat.length === 0) {
          return res.json([]);
        }
        
        const [messages] = await db.query(
          'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC',
          [chat[0].id]
        );
        res.json(messages);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.use((error, req, res, next) => {
      if (error instanceof multer.MulterError) {
          if (error.code === 'FILE_TOO_LARGE') {
              return res.status(400).json({ error: 'Файл слишком большой. Максимальный размер 5MB' });
          }
          if (error.code === 'LIMIT_UNEXPECTED_FILE') {
              return res.status(400).json({ error: 'Максимум 100 файлов' });
          }
          return res.status(400).json({ error: error.message });
      }
      next(error);
    });

    io.on('connection', async (socket) => {
      const session = socket.request.session;
      
      const isAdmin = session && session.isAdmin === true;
      const userId = socket.handshake.query.userId;
      
      if (!userId && !isAdmin) {
        console.log('❌ Подключение отклонено: нет userId и не админ');
        socket.disconnect();
        return;
      }
      
      socket.isAdmin = isAdmin;
      socket.userId = userId;
      
      console.log(`🔌 Подключен: ${isAdmin ? 'Админ' : 'Пользователь ' + userId}`);
      
      if (isAdmin) {
        socket.join('admin_room');
        socket.on('admin_get_chats', async () => {
          if (!socket.isAdmin) {
            socket.emit('admin_error', 'Доступ запрещен');
            return;
          }

          const [chats] = await db.query('SELECT * FROM chats ORDER BY created_at DESC');
          socket.emit('admin_chats_list', chats);
        });
        
        socket.on('admin_join_chat', async (targetUserId) => {
          if (!socket.isAdmin) {
            socket.emit('admin_error', 'Доступ запрещен');
            return;
          }

          const [chat] = await db.query('SELECT id FROM chats WHERE user_id = ?', [targetUserId]);
          if (chat.length === 0) {
            socket.emit('admin_error', 'Чат не найден');
            return;
          }

          socket.join(targetUserId);
          
          const [messages] = await db.query(
            'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC',
            [chat[0].id]
          );
          socket.emit('admin_chat_history', { userId: targetUserId, messages });
        });
        
        socket.on('admin_reply', async ({ userId, text }) => {
          if (!socket.isAdmin) {
            socket.emit('admin_error', 'Доступ запрещен. Требуются права администратора.');
            return;
          }
          
          if (!text || !text.trim()) return;
          
          const [chat] = await db.query('SELECT id FROM chats WHERE user_id = ?', [userId]);
          if (chat.length === 0) return;
          
          await db.query(
            'INSERT INTO messages (chat_id, sender_type, text) VALUES (?, ?, ?)',
            [chat[0].id, 'admin', text]
          );
          
          io.to(userId).emit('new_admin_message', { text, time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) });
          io.to('admin_room').emit('admin_new_reply', { userId, text });
        });
        
        return;
      }
      
      if (userId) {
        let [chat] = await db.query('SELECT id FROM chats WHERE user_id = ?', [userId]);
        let chatId;
        
        if (chat.length === 0) {
          const [result] = await db.query('INSERT INTO chats (user_id) VALUES (?)', [userId]);
          chatId = result.insertId;
        } else {
          chatId = chat[0].id;
        }

        socket.join(userId);

        const [messages] = await db.query(
          'SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC',
          [chatId]
        );
        socket.emit('chat_history', messages);

        socket.on('user_message', async (text) => {
          if (!text || !text.trim()) return;
          
          await db.query(
            'INSERT INTO messages (chat_id, sender_type, text) VALUES (?, ?, ?)',
            [chatId, 'user', text]
          );
          
          io.to('admin_room').emit('new_user_message', {
            userId,
            text,
            timestamp: new Date()
          });

          const shouldNotify = await shouldSendNotification(chatId);

          if (shouldNotify) {
            const truncatedText = text.length > 70 
              ? `${text.slice(0, 70)}...` 
              : text;
              
            sendVKNotification(
              `🙋‍♂️ НОВОЕ СООБЩЕНИЕ!\n\n` +
              `UUID пользователя: ${userId.slice(0, 8)}...\n` +
              `Текст сообщения: ${truncatedText}`
            );
          }
        });
      }
    });
    
    server.listen(PORT, () => {
      console.log(`✅ Сервер запущен на порту ${PORT}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка при запуске сервера:', error);
    process.exit(1);
  }
}

startServer();