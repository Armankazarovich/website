# Local Workspace Map

Date: 2026-06-12

## Source Of Truth

- PiloRus / ARAY Production workspace: `D:\проект\pilorus\website`
- Git remote: `https://github.com/Armankazarovich/website.git`
- Production domain: `https://pilo-rus.ru`
- Local dev URL: `http://localhost:3101`

## Convenience Links

- `C:\PilRus` is a symbolic link to `D:\проект\pilorus\website`.
- Do not use the old desktop path `C:\Users\StormPC\Desktop\ПилоРус\website`; it no longer exists.

## Moved From C To D

- `C:\Users\StormPC\Documents\New project` moved to `D:\проект\_moved_from_C\Documents\New project`.
- `C:\Users\StormPC\Documents\New project 2` moved to `D:\проект\_moved_from_C\Documents\New project 2`.

These were empty stray Git project folders and are kept only as an archive.

## Cleaned On C

- Cleared user temp files in `C:\Users\StormPC\AppData\Local\Temp`.
- Cleared Node/npm cache in `C:\Users\StormPC\AppData\Local\npm-cache`.

This restored free space on `C:` so the browser and Codex runtime can write cache/session files again.

## Left In Place

- Browser profiles were not moved or deleted.
- `C:\Users\StormPC\.codex` was not moved. It contains Codex runtime data and archived sessions. A large folder exists at `C:\Users\StormPC\.codex\archived_sessions`; move it only as a separate maintenance step with a symlink back if more space is needed.
- `C:\Users\StormPC\OpenHands` was not moved because it is a separate tool.
