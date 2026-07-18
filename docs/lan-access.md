# Доступ із домашньої мережі

## Автоматичне налаштування сервера

На Ubuntu/Debian сервері з Docker і Docker Compose:

```bash
git clone https://github.com/RomaSorokivskiy/homeservicehelper.git
cd homeservicehelper
bash scripts/configure-lan-access.sh
```

Скрипт визначає LAN IP і gateway, генерує секрети, перевіряє Compose, запускає CoreDNS на LAN-порту 53, переносить Caddy на стандартний HTTPS-порт 443 і тестує всі маршрути. Невідомі процеси на потрібних портах він не зупиняє.

## Один ручний крок у роутері

У налаштуваннях DHCP/LAN роутера встановіть IP домашнього сервера як DNS server. Для поточного сервера це `192.168.31.163`. Після збереження перепідключіть Wi-Fi на телефоні й комп'ютері або оновіть DHCP lease.

Не змінюйте WAN Internet DNS, якщо роутер має окремі поля WAN і LAN/DHCP. Потрібне саме поле DNS, яке DHCP роздає домашнім пристроям.

## Адреси

- `https://home.home.arpa`
- `https://mealie.home.arpa`
- `https://tasks.home.arpa`
- `https://things.home.arpa`
- `https://vault.home.arpa`
- `https://status.home.arpa`

## Сертифікат

Caddy створює приватний локальний центр сертифікації. Щоб прибрати попередження браузера, встановіть його root certificate на кожен довірений пристрій. Сертифікат зберігається всередині Docker volume `apartment-home_caddy_data` за шляхом `/data/caddy/pki/authorities/local/root.crt`.

Експортувати сертифікат у поточний каталог можна командою:

```bash
bash scripts/export-local-ca.sh
```

Передавайте `caddy-local-root.crt` лише власним довіреним пристроям. На Windows його потрібно імпортувати в `Trusted Root Certification Authorities`, а на Android/iOS — встановити як користувацький CA certificate і явно ввімкнути довіру.

DNS і вебсервіси призначені лише для домашньої LAN. Не відкривайте порти 53, 80, 443 або 8088 через port forwarding роутера.
