# ARAY Recovered Tasks

Date: 2026-05-24
Source: copied notes from a stalled chat.
Project: `D:\проект\pilorus\website`

## P0 - protect product and stock work

- Check the whole availability chain: `В наличии`, `Под заказ`, stock remains, `Нет в наличии`.
- A status click must not silently switch `В наличии` to `Нет в наличии`.
- Product edit page needs the main action block fixed while scrolling, like a footer for product settings.
- PWA install should be re-checked: the browser used to offer installation from a button.

## P1 - keep ARAY close at hand

- Explore making ARAY open or ready by default so users do not need to search for the assistant every time.
- Search and ARAY should feel available while reading and working.
- ARAY should explain important changes before or while doing them, so the user does not miss what happened.

## P2 - live visible ARAY operator

- Research the best way to make ARAY move, click and scroll visibly like a human operator.
- Voice command target: a user can say what to do, ARAY acts on screen, shows the cursor and speaks briefly.
- Demo mode should work on monitor or TV: clients, admins and freelancers can watch ARAY perform work.
- ARAY should understand commands like "press the fourth product from the top", adapt cursor speed, open the item, and explain it in the right professional language for the current role.

## Done in this pass

- Added confirmation before inventory stock status changes.
- Added confirmation before product variant availability changes.
- Made the bottom save/action block on product settings sticky while scrolling.
- Adjusted product availability logic so tracked zero stock resolves to `Нет в наличии`, not `Под заказ`.
- Added early PWA install prompt capture at the global manifest sync layer.
