# Деплой ПилоРус на Beget VPS

## Данные хостинга
- SSH: `armankmb.beget.tech`
- Логин: `armankmb`
- Пароль: в файле бегет.txt
- ID: 2559177

## Требования на VPS
- Node.js 18+
- PostgreSQL 14+
- PM2
- Nginx
- Certbot (Let's Encrypt)

---

## 1. Подготовка сервера (один раз)

```bash
# Войти по SSH
ssh armankmb@armankmb.beget.tech

# Установить Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установить PM2
npm install -g pm2

# Установить PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Создать базу данных
sudo -u postgres psql -c "CREATE DATABASE pilo_rus;"
sudo -u postgres psql -c "CREATE USER pilo_rus_user WITH PASSWORD 'YOURPASSWORD';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE pilo_rus TO pilo_rus_user;"
```

## 2. Первый деплой

```bash
# Создать папку
mkdir -p ~/pilo-rus/app

# Загрузить файлы (с локальной машины)
# scp -r ./website/* armankmb@armankmb.beget.tech:~/pilo-rus/app/

# Перейти в папку
cd ~/pilo-rus/app

# Создать .env файл
cp .env.example .env
nano .env  # заполнить переменные

# Установить зависимости
npm install --legacy-peer-deps

# Сгенерировать Prisma client
npx prisma generate

# Применить миграции
npx prisma migrate deploy

# Заполнить начальными данными
npx tsx prisma/seed.ts

# Собрать приложение
npm run build

# Скопировать логотип
cp /path/to/logo.png public/logo.png

# Запустить через PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 3. Настройка Nginx

```nginx
# /etc/nginx/sites-available/pilo-rus.ru
server {
    listen 80;
    server_name pilo-rus.ru www.pilo-rus.ru;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Статика Next.js
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Загруженные фото
    location /uploads/ {
        alias /home/armankmb/pilo-rus/app/public/uploads/;
        add_header Cache-Control "public, max-age=86400";
    }
}
```

```bash
# Включить сайт
sudo ln -s /etc/nginx/sites-available/pilo-rus.ru /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL
sudo certbot --nginx -d pilo-rus.ru -d www.pilo-rus.ru
```

## 4. Обновление (деплой новой версии)

```bash
cd ~/pilo-rus/app
git pull  # если используется git
npm run build
pm2 restart pilo-rus
```

## 5. Переменные окружения (.env)

```env
DATABASE_URL="postgresql://pilo_rus_user:YOURPASSWORD@localhost:5432/pilo_rus"
NEXTAUTH_SECRET="GENERATE_WITH: openssl rand -base64 32"
NEXTAUTH_URL="https://pilo-rus.ru"
ADMIN_EMAIL="info@pilo-rus.ru"
SMTP_HOST="mail.beget.com"
SMTP_PORT="587"
SMTP_USER="info@pilo-rus.ru"
SMTP_PASSWORD="6jEr1MpozQ%P"
GOOGLE_SHEETS_ID="19rN2YNzrn6IHOXnyzDB_JHUGSC-KLxfRHqwfhD3_lmg"
GOOGLE_CLIENT_EMAIL="..."
GOOGLE_PRIVATE_KEY="..."
SYNC_SECRET="RANDOM_SECRET"
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
NEXT_PUBLIC_VAPID_KEY="..."
```

## 6. Генерация VAPID ключей

```bash
cd ~/pilo-rus/app
node -e "const webpush = require('web-push'); const keys = webpush.generateVAPIDKeys(); console.log(keys);"
```

## 7. Admin панель

- URL: https://pilo-rus.ru/admin
- Email: info@pilo-rus.ru
- Пароль: PiloAdmin2026! (изменить после первого входа!)

## Полезные команды

```bash
pm2 status          # статус приложения
pm2 logs pilo-rus   # логи
pm2 restart pilo-rus
npx prisma studio   # GUI для БД (не в prod)
```
