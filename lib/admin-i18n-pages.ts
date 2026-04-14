import type { LangCode } from "./admin-i18n";

export type PageTranslationKey =
  | "page_orders" | "page_products" | "page_clients" | "page_delivery" | "page_staff"
  | "page_settings" | "page_notifications" | "page_dashboard"
  | "btn_save" | "btn_cancel" | "btn_delete" | "btn_edit" | "btn_add" | "btn_back"
  | "btn_open" | "btn_close" | "btn_search" | "btn_export" | "btn_import" | "btn_filter"
  | "btn_reset" | "btn_confirm" | "btn_send" | "btn_subscribe" | "btn_check" | "btn_create"
  | "lbl_client" | "lbl_status" | "lbl_total" | "lbl_date" | "lbl_phone" | "lbl_email"
  | "lbl_name" | "lbl_address" | "lbl_comment" | "lbl_payment" | "lbl_delivery_cost"
  | "lbl_amount" | "lbl_price" | "lbl_quantity" | "lbl_category" | "lbl_size" | "lbl_product"
  | "status_new" | "status_confirmed" | "status_processing" | "status_shipped"
  | "status_in_delivery" | "status_ready_pickup" | "status_delivered" | "status_completed" | "status_cancelled"
  | "unit_m3" | "unit_pcs"
  | "empty_no_orders" | "empty_no_products" | "empty_no_clients" | "empty_no_data"
  | "dash_welcome" | "dash_revenue_30d" | "dash_new_orders" | "dash_quick_access"
  | "dash_recent_orders" | "dash_no_orders_yet" | "dash_new_orders_alert" | "dash_pending_reviews"
  | "dash_pending_staff"
  | "ord_phone_order" | "ord_trash" | "ord_order_num" | "ord_items_count" | "ord_order_details"
  | "ord_order_items" | "ord_subtotal" | "ord_restore" | "ord_delete_permanent"
  | "ord_delete_confirm_title" | "ord_delete_confirm_text" | "ord_clear_trash" | "ord_trash_empty"
  | "ord_change_status" | "ord_open_full" | "ord_contact"
  | "del_rates_calc" | "del_active" | "del_archive" | "del_pickup" | "del_no_active"
  | "del_orders_count" | "del_volume" | "del_calculate" | "del_suitable_for" | "del_optimal"
  | "del_exceeds" | "del_price_list" | "del_add_rate"
  | "prod_add_product" | "prod_variants_count" | "prod_in_stock" | "prod_out_of_stock" | "prod_tracking"
  | "cli_subtitle" | "cli_total" | "cli_with_orders" | "cli_revenue" | "cli_order_history"
  | "cli_reset_password" | "cli_promote_staff"
  | "staff_super_admin" | "staff_admin" | "staff_manager" | "staff_courier" | "staff_accountant"
  | "staff_warehouse" | "staff_seller" | "staff_active" | "staff_suspended" | "staff_pending"
  | "staff_online" | "staff_never" | "staff_just_now" | "staff_mins_ago" | "staff_hours_ago"
  | "staff_days_ago"
  | "notif_push" | "notif_subtitle" | "notif_send_tab" | "notif_subscribers_tab" | "notif_diagnostics"
  | "notif_segment_all" | "notif_segment_registered" | "notif_segment_guests" | "notif_segment_inactive"
  | "notif_segment_never_ordered" | "notif_title_placeholder" | "notif_text_placeholder"
  | "notif_link_placeholder" | "notif_sent_count" | "notif_errors_count" | "notif_auto_new_order"
  | "notif_auto_status_change" | "notif_telegram_bot" | "notif_webhook_ok" | "notif_webhook_wrong"
  | "notif_webhook_missing"
  | "set_contacts" | "set_company" | "set_seo" | "set_design" | "set_watermark" | "set_telegram"
  | "set_email_smtp" | "set_push" | "set_catalog" | "set_stock" | "set_import_export"
  | "set_delivery_rates" | "set_promotions" | "set_reviews" | "set_email_campaign" | "set_analytics"
  | "set_advertising" | "set_team" | "set_finance" | "set_system_health" | "set_search_placeholder"
  | "set_subtitle" | "set_nothing_found" | "set_found_count"
  | "role_owner" | "role_admin" | "role_manager" | "role_courier" | "role_accountant"
  | "role_warehouse" | "role_seller"
  | "aray_interface_color" | "aray_theme" | "aray_dark_theme" | "aray_light_theme" | "aray_bg_panel"
  | "aray_bg_classic" | "aray_bg_video" | "aray_font_size" | "aray_compact" | "aray_normal"
  | "aray_large" | "aray_language";

type Translations = Record<PageTranslationKey, string>;

export const PAGE_TRANSLATIONS: Partial<Record<LangCode, Translations>> = {
  ru: {
    page_orders: "Заказы", page_products: "Товары", page_clients: "Клиенты", page_delivery: "Доставка",
    page_staff: "Команда", page_settings: "Настройки", page_notifications: "Уведомления", page_dashboard: "Дашборд",
    btn_save: "Сохранить", btn_cancel: "Отмена", btn_delete: "Удалить", btn_edit: "Редактировать",
    btn_add: "Добавить", btn_back: "Назад", btn_open: "Открыть", btn_close: "Закрыть",
    btn_search: "Поиск", btn_export: "Экспорт", btn_import: "Импорт", btn_filter: "Фильтр",
    btn_reset: "Сбросить", btn_confirm: "Подтвердить", btn_send: "Отправить", btn_subscribe: "Подписаться",
    btn_check: "Проверить", btn_create: "Создать",
    lbl_client: "Клиент", lbl_status: "Статус", lbl_total: "Итого", lbl_date: "Дата",
    lbl_phone: "Телефон", lbl_email: "Email", lbl_name: "Имя", lbl_address: "Адрес",
    lbl_comment: "Комментарий", lbl_payment: "Способ оплаты", lbl_delivery_cost: "Стоимость доставки",
    lbl_amount: "Сумма", lbl_price: "Цена", lbl_quantity: "Количество", lbl_category: "Категория",
    lbl_size: "Размер", lbl_product: "Товар",
    status_new: "Новый", status_confirmed: "Подтверждён", status_processing: "В обработке",
    status_shipped: "Отгружен", status_in_delivery: "Доставляется", status_ready_pickup: "Готов к самовывозу",
    status_delivered: "Доставлен", status_completed: "Завершён", status_cancelled: "Отменён",
    unit_m3: "м³", unit_pcs: "шт",
    empty_no_orders: "Заказов не найдено", empty_no_products: "Товаров не найдено",
    empty_no_clients: "Клиентов не найдено", empty_no_data: "Данные отсутствуют",
    dash_welcome: "Добро пожаловать", dash_revenue_30d: "Выручка за 30 дней", dash_new_orders: "Новые заказы",
    dash_quick_access: "Быстрый доступ", dash_recent_orders: "Последние заказы", dash_no_orders_yet: "Заказов пока нет",
    dash_new_orders_alert: "Новых заказов", dash_pending_reviews: "Ожидают модерации отзывы",
    dash_pending_staff: "Ожидают одобрения сотрудники",
    ord_phone_order: "Заказ по телефону", ord_trash: "Корзина", ord_order_num: "№ заказа",
    ord_items_count: "товаров", ord_order_details: "Детали заказа", ord_order_items: "Товары в заказе",
    ord_subtotal: "Сумма", ord_restore: "Восстановить", ord_delete_permanent: "Удалить навсегда",
    ord_delete_confirm_title: "Удалить заказ?", ord_delete_confirm_text: "Это действие нельзя отменить",
    ord_clear_trash: "Очистить корзину", ord_trash_empty: "Корзина пуста", ord_change_status: "Изменить статус",
    ord_open_full: "Открыть полностью", ord_contact: "Связаться",
    del_rates_calc: "Расчёт тарифов", del_active: "Активные", del_archive: "Архив",
    del_pickup: "Самовывоз", del_no_active: "Активных доставок нет", del_orders_count: "заказов",
    del_volume: "Объём", del_calculate: "Рассчитать", del_suitable_for: "Подходит для",
    del_optimal: "Оптимально", del_exceeds: "Превышает", del_price_list: "Прайс-лист",
    del_add_rate: "Добавить тариф",
    prod_add_product: "Добавить товар", prod_variants_count: "вариантов", prod_in_stock: "В наличии",
    prod_out_of_stock: "Нет в наличии", prod_tracking: "Отслеживание",
    cli_subtitle: "Управление клиентами", cli_total: "Всего клиентов", cli_with_orders: "С заказами",
    cli_revenue: "Выручка от клиентов", cli_order_history: "История заказов", cli_reset_password: "Сбросить пароль",
    cli_promote_staff: "Назначить сотрудником",
    staff_super_admin: "Суперадминистратор", staff_admin: "Администратор", staff_manager: "Менеджер",
    staff_courier: "Курьер", staff_accountant: "Бухгалтер", staff_warehouse: "Складовщик", staff_seller: "Продавец",
    staff_active: "Активен", staff_suspended: "Заблокирован", staff_pending: "На рассмотрении",
    staff_online: "Онлайн", staff_never: "Никогда", staff_just_now: "Только что", staff_mins_ago: "мин назад",
    staff_hours_ago: "ч назад", staff_days_ago: "дн назад",
    notif_push: "Push-уведомления", notif_subtitle: "Управление уведомлениями", notif_send_tab: "Рассылка",
    notif_subscribers_tab: "Подписчики", notif_diagnostics: "Диагностика", notif_segment_all: "Все",
    notif_segment_registered: "Зарегистрированные", notif_segment_guests: "Гости", notif_segment_inactive: "Давно не заказывали",
    notif_segment_never_ordered: "Никогда не заказывали", notif_title_placeholder: "Заголовок уведомления",
    notif_text_placeholder: "Текст уведомления", notif_link_placeholder: "Ссылка (опционально)",
    notif_sent_count: "Отправлено", notif_errors_count: "ошибок", notif_auto_new_order: "Автоуведомление при новом заказе",
    notif_auto_status_change: "Автоуведомление при смене статуса", notif_telegram_bot: "Telegram-бот",
    notif_webhook_ok: "Webhook настроен правильно", notif_webhook_wrong: "Webhook неверный",
    notif_webhook_missing: "Webhook не найден",
    set_contacts: "Контакты", set_company: "Компания", set_seo: "SEO", set_design: "Дизайн",
    set_watermark: "Водяной знак", set_telegram: "Telegram", set_email_smtp: "Email SMTP",
    set_push: "Push-уведомления", set_catalog: "Каталог", set_stock: "Склад", set_import_export: "Импорт/Экспорт",
    set_delivery_rates: "Тарифы доставки", set_promotions: "Акции", set_reviews: "Отзывы",
    set_email_campaign: "Email-рассылка", set_analytics: "Аналитика", set_advertising: "Реклама",
    set_team: "Команда", set_finance: "Финансы", set_system_health: "Здоровье системы",
    set_search_placeholder: "Поиск по настройкам...", set_subtitle: "Параметры сайта",
    set_nothing_found: "Ничего не найдено", set_found_count: "найдено",
    role_owner: "Владелец", role_admin: "Администратор", role_manager: "Менеджер",
    role_courier: "Курьер", role_accountant: "Бухгалтер", role_warehouse: "Складовщик", role_seller: "Продавец",
    aray_interface_color: "Цвет интерфейса", aray_theme: "Тема", aray_dark_theme: "Тёмная",
    aray_light_theme: "Светлая", aray_bg_panel: "Фон панели", aray_bg_classic: "Классический",
    aray_bg_video: "Видеофон", aray_font_size: "Размер шрифта", aray_compact: "Компакт",
    aray_normal: "Обычный", aray_large: "Крупный", aray_language: "Язык",
  },
  en: {
    page_orders: "Orders", page_products: "Products", page_clients: "Clients", page_delivery: "Delivery",
    page_staff: "Team", page_settings: "Settings", page_notifications: "Notifications", page_dashboard: "Dashboard",
    btn_save: "Save", btn_cancel: "Cancel", btn_delete: "Delete", btn_edit: "Edit",
    btn_add: "Add", btn_back: "Back", btn_open: "Open", btn_close: "Close",
    btn_search: "Search", btn_export: "Export", btn_import: "Import", btn_filter: "Filter",
    btn_reset: "Reset", btn_confirm: "Confirm", btn_send: "Send", btn_subscribe: "Subscribe",
    btn_check: "Check", btn_create: "Create",
    lbl_client: "Client", lbl_status: "Status", lbl_total: "Total", lbl_date: "Date",
    lbl_phone: "Phone", lbl_email: "Email", lbl_name: "Name", lbl_address: "Address",
    lbl_comment: "Comment", lbl_payment: "Payment Method", lbl_delivery_cost: "Delivery Cost",
    lbl_amount: "Amount", lbl_price: "Price", lbl_quantity: "Quantity", lbl_category: "Category",
    lbl_size: "Size", lbl_product: "Product",
    status_new: "New", status_confirmed: "Confirmed", status_processing: "Processing",
    status_shipped: "Shipped", status_in_delivery: "In Delivery", status_ready_pickup: "Ready for Pickup",
    status_delivered: "Delivered", status_completed: "Completed", status_cancelled: "Cancelled",
    unit_m3: "m³", unit_pcs: "pcs",
    empty_no_orders: "No orders found", empty_no_products: "No products found",
    empty_no_clients: "No clients found", empty_no_data: "No data available",
    dash_welcome: "Welcome", dash_revenue_30d: "Revenue (30 days)", dash_new_orders: "New Orders",
    dash_quick_access: "Quick Access", dash_recent_orders: "Recent Orders", dash_no_orders_yet: "No orders yet",
    dash_new_orders_alert: "New orders", dash_pending_reviews: "Pending reviews",
    dash_pending_staff: "Pending staff approvals",
    ord_phone_order: "Phone Order", ord_trash: "Trash", ord_order_num: "Order #",
    ord_items_count: "items", ord_order_details: "Order Details", ord_order_items: "Items in Order",
    ord_subtotal: "Subtotal", ord_restore: "Restore", ord_delete_permanent: "Delete Permanently",
    ord_delete_confirm_title: "Delete order?", ord_delete_confirm_text: "This action cannot be undone",
    ord_clear_trash: "Empty Trash", ord_trash_empty: "Trash is empty", ord_change_status: "Change Status",
    ord_open_full: "Open Full", ord_contact: "Contact",
    del_rates_calc: "Rate Calculator", del_active: "Active", del_archive: "Archive",
    del_pickup: "Self-Pickup", del_no_active: "No active deliveries", del_orders_count: "orders",
    del_volume: "Volume", del_calculate: "Calculate", del_suitable_for: "Suitable for",
    del_optimal: "Optimal", del_exceeds: "Exceeds", del_price_list: "Price List",
    del_add_rate: "Add Rate",
    prod_add_product: "Add Product", prod_variants_count: "variants", prod_in_stock: "In Stock",
    prod_out_of_stock: "Out of Stock", prod_tracking: "Tracking",
    cli_subtitle: "Client Management", cli_total: "Total Clients", cli_with_orders: "With Orders",
    cli_revenue: "Revenue from Clients", cli_order_history: "Order History", cli_reset_password: "Reset Password",
    cli_promote_staff: "Promote to Staff",
    staff_super_admin: "Super Admin", staff_admin: "Administrator", staff_manager: "Manager",
    staff_courier: "Courier", staff_accountant: "Accountant", staff_warehouse: "Warehouse", staff_seller: "Seller",
    staff_active: "Active", staff_suspended: "Suspended", staff_pending: "Pending",
    staff_online: "Online", staff_never: "Never", staff_just_now: "Just now", staff_mins_ago: "mins ago",
    staff_hours_ago: "hours ago", staff_days_ago: "days ago",
    notif_push: "Push Notifications", notif_subtitle: "Notification Management", notif_send_tab: "Send",
    notif_subscribers_tab: "Subscribers", notif_diagnostics: "Diagnostics", notif_segment_all: "All",
    notif_segment_registered: "Registered", notif_segment_guests: "Guests", notif_segment_inactive: "Inactive",
    notif_segment_never_ordered: "Never Ordered", notif_title_placeholder: "Notification Title",
    notif_text_placeholder: "Notification Text", notif_link_placeholder: "Link (optional)",
    notif_sent_count: "Sent", notif_errors_count: "errors", notif_auto_new_order: "Auto-notify on new order",
    notif_auto_status_change: "Auto-notify on status change", notif_telegram_bot: "Telegram Bot",
    notif_webhook_ok: "Webhook configured correctly", notif_webhook_wrong: "Webhook invalid",
    notif_webhook_missing: "Webhook not found",
    set_contacts: "Contacts", set_company: "Company", set_seo: "SEO", set_design: "Design",
    set_watermark: "Watermark", set_telegram: "Telegram", set_email_smtp: "Email SMTP",
    set_push: "Push Notifications", set_catalog: "Catalog", set_stock: "Stock", set_import_export: "Import/Export",
    set_delivery_rates: "Delivery Rates", set_promotions: "Promotions", set_reviews: "Reviews",
    set_email_campaign: "Email Campaign", set_analytics: "Analytics", set_advertising: "Advertising",
    set_team: "Team", set_finance: "Finance", set_system_health: "System Health",
    set_search_placeholder: "Search settings...", set_subtitle: "Site Settings",
    set_nothing_found: "Nothing found", set_found_count: "found",
    role_owner: "Owner", role_admin: "Administrator", role_manager: "Manager",
    role_courier: "Courier", role_accountant: "Accountant", role_warehouse: "Warehouse", role_seller: "Seller",
    aray_interface_color: "Interface Color", aray_theme: "Theme", aray_dark_theme: "Dark",
    aray_light_theme: "Light", aray_bg_panel: "Panel Background", aray_bg_classic: "Classic",
    aray_bg_video: "Video Background", aray_font_size: "Font Size", aray_compact: "Compact",
    aray_normal: "Normal", aray_large: "Large", aray_language: "Language",
  },
  kk: {
    page_orders: "Тапсырыстар", page_products: "Тауарлар", page_clients: "Клиенттер", page_delivery: "Жеткізу",
    page_staff: "Команда", page_settings: "Параметрлер", page_notifications: "Хабарламалар", page_dashboard: "Бақылау",
    btn_save: "Сохранау", btn_cancel: "Болдырмау", btn_delete: "Өшіру", btn_edit: "Өндеу",
    btn_add: "Қосу", btn_back: "Артқа", btn_open: "Ашу", btn_close: "Жабу",
    btn_search: "Іздеу", btn_export: "Экспорт", btn_import: "Импорт", btn_filter: "Сүзгі",
    btn_reset: "Сүзгіні өшіру", btn_confirm: "Растау", btn_send: "Жіберу", btn_subscribe: "Подписка",
    btn_check: "Тексеру", btn_create: "Құру",
    lbl_client: "Клиент", lbl_status: "Күйі", lbl_total: "Барлығы", lbl_date: "Күні",
    lbl_phone: "Телефон", lbl_email: "Email", lbl_name: "Атауы", lbl_address: "Мекен-жайы",
    lbl_comment: "Пікір", lbl_payment: "Төлем әдісі", lbl_delivery_cost: "Жеткізу құны",
    lbl_amount: "Сома", lbl_price: "Баға", lbl_quantity: "Саны", lbl_category: "Санат",
    lbl_size: "Өлшемі", lbl_product: "Тауар",
    status_new: "Жаңа", status_confirmed: "Расталған", status_processing: "Өндеу",
    status_shipped: "Жіберілген", status_in_delivery: "Жеткізілуде", status_ready_pickup: "Өндеуге дайын",
    status_delivered: "Жеткізілген", status_completed: "Аяқталған", status_cancelled: "Болдырылған",
    unit_m3: "м³", unit_pcs: "дана",
    empty_no_orders: "Тапсырыстар табылмады", empty_no_products: "Тауарлар табылмады",
    empty_no_clients: "Клиенттер табылмады", empty_no_data: "Деректер жоқ",
    dash_welcome: "Қош келдіңіз", dash_revenue_30d: "Табыс (30 күн)", dash_new_orders: "Жаңа тапсырыстар",
    dash_quick_access: "Жылдам қатынау", dash_recent_orders: "Соңғы тапсырыстар", dash_no_orders_yet: "Тапсырыстар әлі жоқ",
    dash_new_orders_alert: "Жаңа тапсырыстар", dash_pending_reviews: "Өндеуге күтіліп отырған пікірлер",
    dash_pending_staff: "Өндеуге күтіліп отырған ынамдарыма",
    ord_phone_order: "Телефон тапсырысы", ord_trash: "Қоқыс", ord_order_num: "Тапсырыс #",
    ord_items_count: "элеметтер", ord_order_details: "Тапсырыс бөлшектері", ord_order_items: "Тапсырыстағы элементтер",
    ord_subtotal: "Ішінде барлығы", ord_restore: "Қалпына келтіру", ord_delete_permanent: "Түпкілікті өшіру",
    ord_delete_confirm_title: "Тапсырысты өшіру?", ord_delete_confirm_text: "Бұл әрекетті болдырмау мүмкін емес",
    ord_clear_trash: "Қоқысты тазалау", ord_trash_empty: "Қоқыс бос", ord_change_status: "Күйін өзгерту",
    ord_open_full: "Толығымен ашу", ord_contact: "Байланыс",
    del_rates_calc: "Тариф калькуляторы", del_active: "Белсенді", del_archive: "Архив",
    del_pickup: "Өндеудегі өндеу", del_no_active: "Белсенді жеткізу жоқ", del_orders_count: "тапсырыстар",
    del_volume: "Көлемі", del_calculate: "Есептеу", del_suitable_for: "Сәйкес келеді",
    del_optimal: "Оңтайлы", del_exceeds: "Асып кетеді", del_price_list: "Баға тізімі",
    del_add_rate: "Тариф қосу",
    prod_add_product: "Тауар қосу", prod_variants_count: "нұсқалар", prod_in_stock: "Қойында",
    prod_out_of_stock: "Қойындағы жоқ", prod_tracking: "Қ жүргіндеуі",
    cli_subtitle: "Клиент басқарысы", cli_total: "Барлық клиенттер", cli_with_orders: "Тапсырыстары бар",
    cli_revenue: "Клиенттерден табыс", cli_order_history: "Тапсырыс тарихы", cli_reset_password: "Құпия сөзді қалпына келтіру",
    cli_promote_staff: "Қызметтіге ынамдар",
    staff_super_admin: "Супер администратор", staff_admin: "Администратор", staff_manager: "Менеджер",
    staff_courier: "Жеткізушісі", staff_accountant: "Есепші", staff_warehouse: "Қойма", staff_seller: "Сатушы",
    staff_active: "Белсенді", staff_suspended: "Тоқтатылды", staff_pending: "Күтіліп отыр",
    staff_online: "Онлайн", staff_never: "Ешқашан", staff_just_now: "Ғана қазір", staff_mins_ago: "мин бұрын",
    staff_hours_ago: "сағат бұрын", staff_days_ago: "күн бұрын",
    notif_push: "Push хабарламалар", notif_subtitle: "Хабарлама басқарысы", notif_send_tab: "Жіберу",
    notif_subscribers_tab: "Жазылушылар", notif_diagnostics: "Диагностика", notif_segment_all: "Барлығы",
    notif_segment_registered: "Тіркелгендер", notif_segment_guests: "Қонақтар", notif_segment_inactive: "Белсенді емес",
    notif_segment_never_ordered: "Ешқашан тапсырыс бермеген", notif_title_placeholder: "Хабарлама тақырыбы",
    notif_text_placeholder: "Хабарлама мәтіні", notif_link_placeholder: "Сілтеме (опционально)",
    notif_sent_count: "Жіберілді", notif_errors_count: "қателер", notif_auto_new_order: "Жаңа тапсырыс кезінде автоматты хабарлама",
    notif_auto_status_change: "Күй өзгергенінде автоматты хабарлама", notif_telegram_bot: "Telegram ботысы",
    notif_webhook_ok: "Webhook дұрыс баптелген", notif_webhook_wrong: "Webhook жарамсыз",
    notif_webhook_missing: "Webhook табылмады",
    set_contacts: "Контактілер", set_company: "Компания", set_seo: "SEO", set_design: "Дизайн",
    set_watermark: "Су белгісі", set_telegram: "Telegram", set_email_smtp: "Email SMTP",
    set_push: "Push хабарламалар", set_catalog: "Каталог", set_stock: "Қойма", set_import_export: "Импорт/Экспорт",
    set_delivery_rates: "Жеткізу тарифтері", set_promotions: "Барлық ынамдарыма", set_reviews: "Пікірлер",
    set_email_campaign: "Email науқасы", set_analytics: "Аналитика", set_advertising: "Жарнама",
    set_team: "Команда", set_finance: "Қаржы", set_system_health: "Жүйе сағдығы",
    set_search_placeholder: "Параметрлерді іздеу...", set_subtitle: "Сайт параметрлері",
    set_nothing_found: "Ештеме табылмады", set_found_count: "табылды",
    role_owner: "Ие", role_admin: "Администратор", role_manager: "Менеджер",
    role_courier: "Жеткізушісі", role_accountant: "Есепші", role_warehouse: "Қойма", role_seller: "Сатушы",
    aray_interface_color: "Интерфейс түсі", aray_theme: "Тақырыбы", aray_dark_theme: "Қоңыр",
    aray_light_theme: "Жарық", aray_bg_panel: "Панель өңі", aray_bg_classic: "Классикалық",
    aray_bg_video: "Бейне фону", aray_font_size: "Қаріптің көлемі", aray_compact: "Тығыз",
    aray_normal: "Қалыпты", aray_large: "Үлкен", aray_language: "Тіл",
  },
};
