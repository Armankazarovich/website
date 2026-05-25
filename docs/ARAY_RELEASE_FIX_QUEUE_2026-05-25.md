# ARAY / PiloRus Release Fix Queue

Date: 2026-05-25
Owner: Codex + Arman
Goal: привести систему к показу и деплою без потери замечаний из чата.

## Process Rule

- Все новые замечания сначала попадают сюда.
- Самый свежий баг не отменяет старые.
- Перед деплоем каждый пункт должен быть либо `done`, либо иметь понятный стоп-фактор.
- Пользователь не должен вручную повторять баги по разным чатам.

## P0 - Now

1. `in_progress` PWA PiloRus mobile:
   - логотип в мобильной PWA должен быть виден;
   - splash / логотип приложения показывается только при запуске приложения, не при каждом переходе;
   - проверить manifest, icons, standalone launch screen.

2. `in_progress` Cart add animation:
   - восстановить анимацию, где иконка товара летит в корзину;
   - проверить мобильную нижнюю навигацию и desktop header cart target;
   - корзина не должна тупить после добавления;
   - Checkout must keep calculator/cart items and never open empty after mini-cart has items.

3. `in_progress` ARAY Messenger:
   - убрать бардак из разрозненных панелей;
   - единый центр: чат, ARAY, CRM, задачи, звонок, видео, документы;
   - кнопки должны делать реальные действия, а не просто выглядеть красиво;
   - мессенджер должен быть удобным в мобильной и desktop версии.

4. `in_progress` AR Phone:
   - внутренний номер должен находить контакт и давать звонок;
   - набор формата `6229 16 33` / `AR 6229 16 33` должен работать одинаково;
   - если контакта нет, система должна предложить создать контакт.

5. `in_progress` Video gateway:
   - видео должно открываться внутри AR Phone / мессенджера;
   - iframe должен иметь права camera / microphone / fullscreen;
   - если шлюз недоступен, показывать понятный статус, а не пустоту.

6. `in_progress` Tasks / lost queue:
   - пользователь помнит 9 задач/замечаний;
   - текущая база показывает меньше;
   - найти источник: текущая PostgreSQL, backups, docs, старые файлы, возможно другой чат;
   - восстановить важные пункты в эту очередь.

## P0 - Already Patched In This Pass, Needs Final Browser Check

7. `patched` Admin nav capsule over ARAY:
   - меню навигации открывается поверх ARAY;
   - клик по маршруту не закрывает ARAY сам по себе;
   - клиент может закрыть ARAY вручную.

8. `patched` Menu size / phone-like capsule:
   - меню настроек стало уже и аккуратнее;
   - должно сидеть как телефонная капсула, не перекрывая всё.

9. `patched` Header search over ARAY:
   - выпадающий поиск вынесен в portal над ARAY;
   - ARAY не должен перекрывать результаты поиска.

10. `patched` Confusing "ARAY открыт" toast:
    - обычный баннер открытия ARAY скрыт;
    - важные действия остаются видимыми.

11. `patched` Stories media picker:
    - фильтр `Сторис` больше не должен скрывать все медиа;
    - в picker mode сначала видно все подходящие файлы;
    - stories media идут первыми, но пользователь не заперт в пустом фильтре.

12. `patched` Mobile CRM stage:
    - если выбранный статус пустой, но заказы есть в другом статусе, мобильный CRM переключается на живой статус;
    - карточки и фильтры уплотнены для мобильной версии.

13. `patched` Message long links:
    - длинные ссылки в ARAY Messenger больше не ломают пузырь сообщения;
    - URL показываются компактно и кликабельно.

## P1 - Release Polish

14. `todo` Full ARAY system review:
    - ARAY widget;
    - messenger;
    - AI assistant;
    - calls;
    - video;
    - voice;
    - mobile ARAY everywhere.

15. `todo` ARAY omnichannel center:
    - ARAY is not a separate social messenger. It is one work center for external channels.
    - Channels to organize under one style: Telegram, WhatsApp, Zangi, MAX, VK, phone, video, email, mailings/newsletters, site forms.
    - User command model: "find who", "show where", "write through which channel", "save to CRM", "create task/follow-up".
    - Every channel action must show source/channel, keep consent/confirmation before sending, and save the conversation context in CRM.

15a. `queued` Product card constructor reference:
    - Hide the SKU/tags meta strip from live product pages for now.
    - Later bring it back as an optional Woodmart-style compact product meta template inside the site/card constructor.
    - The live product page should stay quiet, focused on the product, price, cart and seller actions.

16. `todo` Cart performance:
    - проверить открытие/закрытие корзины на mobile;
    - проверить badge, totals, item update/remove;
    - не должно быть задержки после add-to-cart.

17. `todo` Pilorus mobile stories:
    - сторисы должны быть видны на мобильной версии;
    - stories widget не должен закрывать важные кнопки;
    - admin stories upload / library / cover should work.

18. `todo` Admin search / ARAY coexistence:
    - поиск не должен мешать ARAY;
    - dropdown над ARAY;
    - ARAY можно сдвинуть/закрыть вручную.

19. `todo` Release checks:
    - TypeScript;
    - design check;
    - navigation check;
    - stories check;
    - content check;
    - admin UI integrity;
    - responsive;
    - performance;
    - full quality gate;
    - production build.

20. `todo` Deploy:
    - деплой только после зеленых проверок;
    - если деплой требует внешних прав, указать точный стоп-фактор.
