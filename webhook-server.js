// Простой webhook сервер для автоматического деплоя
// Запускается отдельно на сервере для приема webhook'ов от Git сервисов
// Использование: node webhook-server.js

const http = require('http');
const { exec } = require('child_process');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

const PORT = process.env.WEBHOOK_PORT || 9000;
const SECRET = process.env.WEBHOOK_SECRET || 'your-secret-key-change-me';
const DEPLOY_SCRIPT = path.join(__dirname, 'deploy.sh');

// Функция для проверки подписи (для GitHub)
function verifySignature(payload, signature) {
    if (!signature) return false;
    
    const hmac = crypto.createHmac('sha256', SECRET);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(digest)
    );
}

// Функция выполнения деплоя
function deploy() {
    return new Promise((resolve, reject) => {
        console.log(`[${new Date().toISOString()}] 🚀 Запуск деплоя...`);
        
        exec(`bash ${DEPLOY_SCRIPT}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`[${new Date().toISOString()}] ❌ Ошибка деплоя:`, error);
                reject(error);
                return;
            }
            
            console.log(`[${new Date().toISOString()}] ✅ Деплой завершен`);
            console.log(stdout);
            if (stderr) console.error(stderr);
            resolve(stdout);
        });
    });
}

// HTTP сервер
const server = http.createServer((req, res) => {
    // Только POST запросы
    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
    }

    let body = '';
    
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        try {
            // Проверка подписи для GitHub
            const signature = req.headers['x-hub-signature-256'] || req.headers['x-hub-signature'];
            
            if (signature && !verifySignature(body, signature)) {
                console.error(`[${new Date().toISOString()}] ⚠️  Неверная подпись webhook`);
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid signature' }));
                return;
            }
            
            // Проверка события (для GitHub)
            const event = req.headers['x-github-event'];
            const payload = JSON.parse(body);
            
            // Проверяем, что это push в нужную ветку
            if (event === 'push') {
                const branch = payload.ref?.replace('refs/heads/', '');
                const allowedBranches = ['main', 'master', 'production'];
                
                if (!allowedBranches.includes(branch)) {
                    console.log(`[${new Date().toISOString()}] ℹ️  Пропущен push в ветку: ${branch}`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Branch not deployed', branch }));
                    return;
                }
            }
            
            // Запускаем деплой асинхронно
            deploy()
                .then(() => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        message: 'Deployment started',
                        timestamp: new Date().toISOString()
                    }));
                })
                .catch((error) => {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        error: 'Deployment failed', 
                        message: error.message 
                    }));
                });
                
        } catch (error) {
            console.error(`[${new Date().toISOString()}] ❌ Ошибка обработки webhook:`, error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid request', message: error.message }));
        }
    });
});

server.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] 🎣 Webhook сервер запущен на порту ${PORT}`);
    console.log(`[${new Date().toISOString()}] 📍 URL: http://0.0.0.0:${PORT}`);
    console.log(`[${new Date().toISOString()}] ⚠️  Убедитесь, что SECRET настроен правильно!`);
});

// Обработка ошибок
server.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] ❌ Ошибка сервера:`, error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log(`[${new Date().toISOString()}] 🛑 Получен SIGTERM, завершение работы...`);
    server.close(() => {
        console.log(`[${new Date().toISOString()}] ✅ Сервер остановлен`);
        process.exit(0);
    });
});

