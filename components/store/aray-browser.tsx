"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, useDragControls, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, RotateCcw, Maximize2, Minimize2, ExternalLink } from "lucide-react";

export interface ArayBrowserAction {
  type: "navigate" | "spotlight" | "highlight";
  url?: string;
  label?: string;
  hint?: string;         // "Нажми сюда!" текст указателя
  spotX?: number;        // процент X от ширины iframe (0-100)
  spotY?: number;        // процент Y от высоты iframe (0-100)
}

interface ArayBrowserProps {
  initialUrl: string;
  title?: string;
  onClose: () => void;
  pendingAction?: ArayBrowserAction | null;
  isMobile?: boolean;
}

// Анимированная стрелка-указатель
function ArayPointer({ x, y, hint }: { x: number; y: number; hint?: string }) {
  return (
    <motion.div
      className="absolute pointer-events-none z-50"
      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      {/* Пульсирующее кольцо */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          width: 48, height: 48,
          background: "rgba(232, 112, 10, 0.25)",
          left: -8, top: -8,
        }}
        animate={{ scale: [1, 1.6, 1], opacity: [0.7, 0, 0.7] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Сам указатель — палец */}
      <motion.div
        className="relative flex items-center justify-center"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-lg"
          style={{
            background: "linear-gradient(135deg, #e8700a, #f59e0b)",
            boxShadow: "0 0 20px rgba(232,112,10,0.7)",
          }}
        >
          👆
        </div>
      </motion.div>

      {/* Подсказка */}
      {hint && (
        <motion.div
          className="absolute left-10 top-0 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold text-white shadow-lg"
          style={{
            background: "linear-gradient(135deg, #e8700a, #c2410c)",
            boxShadow: "0 4px 16px rgba(232,112,10,0.5)",
          }}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          {hint}
        </motion.div>
      )}
    </motion.div>
  );
}

export function ArayBrowser({ initialUrl, title, onClose, pendingAction, isMobile }: ArayBrowserProps) {
  const [url, setUrl] = useState(initialUrl);
  const [history, setHistory] = useState<string[]>([initialUrl]);
  const [histIdx, setHistIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [maximized, setMaximized] = useState(false);
  const [pointer, setPointer] = useState<{ x: number; y: number; hint?: string } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dragControls = useDragControls();

  // Обрабатываем входящие действия от Арай
  useEffect(() => {
    if (!pendingAction) return;
    if (pendingAction.type === "navigate" && pendingAction.url) {
      navigateTo(pendingAction.url);
    }
    if ((pendingAction.type === "spotlight" || pendingAction.type === "highlight") &&
      pendingAction.spotX !== undefined && pendingAction.spotY !== undefined) {
      setPointer({ x: pendingAction.spotX, y: pendingAction.spotY, hint: pendingAction.hint });
      // Убираем указатель через 5 сек
      setTimeout(() => setPointer(null), 5000);
    }
  }, [pendingAction]);

  const navigateTo = useCallback((newUrl: string) => {
    setUrl(newUrl);
    setLoading(true);
    setPointer(null);
    const newHistory = history.slice(0, histIdx + 1);
    newHistory.push(newUrl);
    setHistory(newHistory);
    setHistIdx(newHistory.length - 1);
    if (iframeRef.current) iframeRef.current.src = newUrl;
  }, [history, histIdx]);

  const goBack = () => {
    if (histIdx <= 0) return;
    const newIdx = histIdx - 1;
    setHistIdx(newIdx);
    setUrl(history[newIdx]);
    setPointer(null);
    if (iframeRef.current) iframeRef.current.src = history[newIdx];
  };

  const goForward = () => {
    if (histIdx >= history.length - 1) return;
    const newIdx = histIdx + 1;
    setHistIdx(newIdx);
    setUrl(history[newIdx]);
    setPointer(null);
    if (iframeRef.current) iframeRef.current.src = history[newIdx];
  };

  const reload = () => {
    setLoading(true);
    setPointer(null);
    if (iframeRef.current) iframeRef.current.src = url;
  };

  // Размеры — адаптивные от viewport (не торчат за края, на больших мониторах крупнее)
  // Default:  min(620, viewport*45%) × min(700, viewport*78%)
  // Maximized: min(1100, viewport*82%) × min(820, viewport*88%)
  // Mobile:   почти full-screen
  const panelW = isMobile
    ? "calc(100vw - 16px)"
    : maximized
      ? "min(1100px, 82vw)"
      : "min(620px, 45vw)";
  const panelH = isMobile
    ? "72dvh"
    : maximized
      ? "min(820px, 88vh)"
      : "min(700px, 78vh)";

  const displayUrl = url.replace(/^https?:\/\/[^/]+/, "") || "/";

  return (
    <motion.div
      drag={!isMobile}
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0}
      className="fixed z-[150] overflow-hidden"
      style={{
        width: panelW,
        height: panelH,
        borderRadius: 20,
        background: "rgba(12, 12, 14, 0.95)",
        backdropFilter: "blur(32px) saturate(200%)",
        WebkitBackdropFilter: "blur(32px) saturate(200%)",
        border: "1px solid rgba(255,255,255,0.13)",
        boxShadow: "0 32px 80px rgba(0,0,0,0.65), 0 1px 0 rgba(255,255,255,0.08) inset",
        bottom: isMobile ? 0 : undefined,
        left: isMobile ? 8 : undefined,
        right: isMobile ? undefined : "420px",
        top: isMobile ? undefined : "80px",
      }}
      initial={{ opacity: 0, scale: 0.88, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: 24 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
    >
      {/* ── Шапка браузера ── */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 select-none"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          cursor: isMobile ? "default" : "grab",
          background: "rgba(255,255,255,0.03)",
        }}
        onPointerDown={!isMobile ? (e) => dragControls.start(e) : undefined}
      >
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onClose}
            className="w-3 h-3 rounded-full transition-opacity hover:opacity-80 active:scale-90"
            style={{ background: "#ff5f57" }}
            title="Закрыть"
          />
          <button
            onClick={() => setMaximized(!maximized)}
            className="w-3 h-3 rounded-full transition-opacity hover:opacity-80 active:scale-90"
            style={{ background: "#ffbd2e" }}
            title={maximized ? "Уменьшить" : "Увеличить"}
          />
          <button
            onClick={reload}
            className="w-3 h-3 rounded-full transition-opacity hover:opacity-80 active:scale-90"
            style={{ background: "#28ca42" }}
            title="Обновить"
          />
        </div>

        {/* Навигация */}
        <button
          onClick={goBack}
          disabled={histIdx <= 0}
          className="w-6 h-6 flex items-center justify-center rounded-lg transition-all disabled:opacity-25"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={goForward}
          disabled={histIdx >= history.length - 1}
          className="w-6 h-6 flex items-center justify-center rounded-lg transition-all disabled:opacity-25"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* URL bar */}
        <div
          className="flex-1 flex items-center gap-2 px-2.5 py-1 rounded-lg text-[11px] truncate"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.50)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="truncate">pilo-rus.ru{displayUrl}</span>
          {loading && (
            <motion.div
              className="w-3 h-3 border border-white/30 border-t-white/70 rounded-full shrink-0 ml-auto"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
          )}
        </div>

        {/* Открыть в новой вкладке */}
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="w-6 h-6 flex items-center justify-center rounded-lg shrink-0 transition-colors hover:bg-white/10"
          style={{ color: "rgba(255,255,255,0.4)" }}
          title="Открыть в браузере"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* ── iframe + overlay ── */}
      <div className="relative flex-1 overflow-hidden" style={{ height: "calc(100% - 48px)" }}>
        {/* Загрузчик */}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center"
            style={{ background: "rgba(12,12,14,0.7)" }}>
            <div className="flex flex-col items-center gap-3">
              <motion.div
                className="w-10 h-10 border-2 rounded-full"
                style={{ borderColor: "rgba(232,112,10,0.2)", borderTopColor: "#e8700a" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
              />
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Загружаю...</p>
            </div>
          </div>
        )}

        {/* Прогресс-бар загрузки */}
        {loading && (
          <motion.div
            className="absolute top-0 left-0 h-0.5 z-20 rounded-full"
            style={{ background: "linear-gradient(90deg, #e8700a, #f59e0b)" }}
            initial={{ width: "0%", opacity: 1 }}
            animate={{ width: "85%", opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        )}

        <iframe
          ref={iframeRef}
          src={initialUrl}
          className="w-full h-full border-0"
          onLoad={() => setLoading(false)}
          title="Арай — просмотр страницы"
          sandbox="allow-same-origin allow-scripts allow-forms allow-navigation"
        />

        {/* Указатель "Нажми сюда" */}
        <AnimatePresence>
          {pointer && (
            <ArayPointer x={pointer.x} y={pointer.y} hint={pointer.hint} />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
