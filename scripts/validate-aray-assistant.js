const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function between(source, start, end) {
  const from = source.indexOf(start);
  if (from === -1) return "";
  const to = source.indexOf(end, from);
  return to === -1 ? source.slice(from) : source.slice(from, to);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const agent = read("lib/aray-agent.ts");
const chat = read("app/api/ai/chat/route.ts");
const widget = read("components/store/aray-widget.tsx");
const globalAssistant = read("components/store/aray-global-assistant.tsx");
const arayHome = read("app/admin/aray/page.tsx");

const toolsBlock = between(agent, "const ALL_ARAY_TOOLS", "// Обратная совместимость");
const toolNames = [...toolsBlock.matchAll(/name:\s*"([^"]+)"/g)].map((match) => match[1]);
const uniqueToolNames = [...new Set(toolNames)];

const expectedTools = [
  "search_products",
  "calculate_volume",
  "calculate_project_materials",
  "get_order_status",
  "add_to_cart",
  "show_page",
  "navigate_page",
  "web_search",
  "open_source_search",
  "get_aray_capabilities",
  "get_admin_dashboard",
  "get_orders_list",
  "get_clients_list",
  "get_products_list",
  "get_staff_list",
  "get_tasks_list",
  "get_stock_summary",
  "generate_report",
  "admin_navigate",
  "update_order_status",
  "create_task",
  "update_task",
  "update_product_price",
  "toggle_product_active",
  "send_push_notification",
  "create_lead",
  "create_product",
  "create_category",
  "update_stock",
  "import_price_list",
  "manage_settings",
];

const missingTools = expectedTools.filter((name) => !uniqueToolNames.includes(name));
assert(missingTools.length === 0, `Missing ARAY tools: ${missingTools.join(", ")}`);
assert(uniqueToolNames.length >= 30, `Expected at least 30 ARAY tools, found ${uniqueToolNames.length}`);

const missingHandlers = expectedTools.filter((name) => !new RegExp(`name\\s*===\\s*"${name}"|"${name}"\\s*&&`).test(chat));
assert(missingHandlers.length === 0, `Missing chat route handlers: ${missingHandlers.join(", ")}`);

const confirmationBlock = between(chat, "const MUTATING_ADMIN_TOOLS", "function normalizeConfirmationDraft");
const confirmationTools = [
  "update_order_status",
  "create_task",
  "update_task",
  "update_product_price",
  "toggle_product_active",
  "send_push_notification",
  "create_lead",
  "create_product",
  "create_category",
  "update_stock",
];
const missingConfirmations = confirmationTools.filter((name) => !confirmationBlock.includes(`"${name}"`));
assert(missingConfirmations.length === 0, `Missing confirmation guard tools: ${missingConfirmations.join(", ")}`);
assert(chat.includes('name === "import_price_list" && !Boolean(input.dryRun)'), "import_price_list must require confirmation when dryRun is false");
assert(chat.includes('name === "manage_settings" && String(input.action || "get") !== "get"'), "manage_settings must require confirmation for writes");

const uiChecks = [
  ["prompt action type", widget.includes('"prompt"') && globalAssistant.includes('"prompt"')],
  ["prompt action handler", widget.includes('action.type === "prompt"') && widget.includes("void sendMessage(prompt)")],
  ["contextual quick actions", widget.includes("contextualQuickActions") && widget.includes("mergeArayActions(contextualQuickActions)")],
  ["admin chips visible", widget.includes("const showSmartChips = chips.length > 0")],
  ["admin navigation strip mounted", widget.includes("<ArayAdminNavigationStrip")],
  ["confirmation parser", widget.includes("__ARAY_CONFIRM__")],
  ["cart command parser", widget.includes("__ARAY_ADD_CART")],
  ["navigate command parser", widget.includes("__ARAY_NAVIGATE")],
  ["popup command parser", widget.includes("__ARAY_POPUP") || widget.includes("__ARAY_SHOW_URL")],
  ["voice microphone", widget.includes("SpeechRecognition") && widget.includes("getUserMedia")],
  ["tts endpoint", widget.includes("/api/ai/tts") && exists("app/api/ai/tts/route.ts")],
  ["voice one-button flow", widget.includes("startVoiceRef") && widget.includes("voiceStartGuardRef") && widget.includes("Нажми — говори")],
  ["human empty results", chat.includes("emptyToolResult") && chat.includes("Нет заказов.") && chat.includes("Задач по этому фильтру нет.")],
];
const failedUiChecks = uiChecks.filter(([, ok]) => !ok).map(([name]) => name);
assert(failedUiChecks.length === 0, `Failed UI checks: ${failedUiChecks.join(", ")}`);

const directChecks = [
  "app/api/admin/direct/draft/route.ts",
  "app/api/admin/direct/export/route.ts",
  "app/api/admin/direct/readiness/route.ts",
].filter((relativePath) => !exists(relativePath));
assert(directChecks.length === 0, `Missing Direct endpoints: ${directChecks.join(", ")}`);

const skillLabels = [
  "Короткий бизнес-чат",
  "Голосовой режим",
  "Быстрые переходы и действия",
  "Direct, Метрика и SEO",
  "Безопасные подтверждения",
];
const missingSkillLabels = skillLabels.filter((label) => !arayHome.includes(label));
assert(missingSkillLabels.length === 0, `Missing /admin/aray skill labels: ${missingSkillLabels.join(", ")}`);

console.log("ARAY assistant smoke-check: PASS");
console.log(`Tools: ${uniqueToolNames.length}`);
console.log(`Confirm-protected admin tools: ${confirmationTools.length} + import_price_list/manage_settings rules`);
console.log("UI: prompt actions, admin quick chips, navigation strip, confirmations, voice and TTS are wired");
console.log("Direct: draft/export/readiness endpoints are present");
