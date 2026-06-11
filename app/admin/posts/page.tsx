"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { AdminSectionTitle } from "@/components/admin/admin-section-title";
import { AdminModal } from "@/components/admin/admin-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Plus,
  Sparkles,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Check,
  ExternalLink,
  Wand2,
  Database,
  ImageIcon,
  Upload,
  Library,
  Link2,
} from "lucide-react";

const MediaPickerModal = dynamic(
  () =>
    import("@/app/admin/media/media-client").then((m) => ({
      default: m.MediaPickerModal,
    })),
  { ssr: false },
);

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  topic: string | null;
  readTime: number;
  coverImage: string | null;
  published: boolean;
  aiGenerated: boolean;
  views: number;
  createdAt: string;
};

type GeneratedPost = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  topic: string;
  readTime: number;
};

/* ── Edit Modal ───────────────────────────────────────────────────────── */
function EditModal({
  post,
  onClose,
  onSave,
}: {
  post: Post;
  onClose: () => void;
  onSave: (id: string, data: Partial<Post>) => Promise<void>;
}) {
  const [title, setTitle] = useState(post.title);
  const [excerpt, setExcerpt] = useState(post.excerpt);
  const [topic, setTopic] = useState(post.topic ?? "");
  const [readTime, setReadTime] = useState(post.readTime);
  const [coverImage, setCoverImage] = useState(post.coverImage ?? "");
  const [saving, setSaving] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave(post.id, {
        title,
        excerpt,
        topic,
        readTime,
        coverImage: coverImage.trim() || null,
      });
      onClose();
    } catch (error: any) {
      setError(error.message || "Не удалось сохранить статью");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "banners");
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (data.url) setCoverImage(data.url);
    } catch {
      /* silent */
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  return (
    <>
      <AdminModal
        open
        onClose={onClose}
        title="Редактировать статью"
        subtitle="Заголовок, SEO-анонс, тема, время чтения и обложка"
        size="lg"
        bodyClassName="p-5 sm:p-6"
        footer={(
          <>
            <Button variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Сохранить
            </Button>
          </>
        )}
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
              Заголовок
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
              Краткое описание
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
                Тема
              </label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="w-24">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
                Мин чтения
              </label>
              <input
                type="number"
                value={readTime}
                onChange={(e) => setReadTime(Number(e.target.value))}
                min={1}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Cover image picker */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" /> Обложка
            </label>

            {/* Preview / Drop zone */}
            <div
              className={`relative rounded-2xl border-2 transition-all duration-150 overflow-hidden ${
                dragging
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : coverImage
                    ? "border-border"
                    : "border-dashed border-border hover:border-primary/50 bg-muted/30"
              }`}
              style={{ height: coverImage ? 180 : 120 }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              {coverImage ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverImage}
                    alt="Обложка"
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all group flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMediaPicker(true)}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 text-black text-xs font-semibold transition-all hover:bg-white"
                    >
                      <Library className="w-3.5 h-3.5" /> Сменить
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverImage("")}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/90 text-white text-xs font-semibold transition-all hover:bg-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Удалить
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                  {uploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 opacity-40" />
                      <p className="text-xs">
                        Перетащите фото или выберите ниже
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowMediaPicker(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-xs font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
              >
                <Library className="w-3.5 h-3.5" /> Медиабиблиотека
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-xs font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> Загрузить
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUrlInput(!showUrlInput);
                  setUrlDraft(coverImage);
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
                aria-label="Вставить URL обложки"
                title="Вставить URL"
              >
                <Link2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* URL input (collapsible) */}
            {showUrlInput && (
              <div className="flex gap-2 mt-2">
                <input
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  placeholder="https://images.pexels.com/..."
                  className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setCoverImage(urlDraft);
                      setShowUrlInput(false);
                    }
                    if (e.key === "Escape") setShowUrlInput(false);
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setCoverImage(urlDraft);
                    setShowUrlInput(false);
                  }}
                  className="px-3 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
            />
          </div>
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
        <div className="hidden">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Сохранить
          </Button>
        </div>
      </AdminModal>

      {/* Media picker modal */}
      <MediaPickerModal
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        initialFolder="posts"
        title="Выбрать обложку статьи"
        onPick={(url) => {
          setCoverImage(url);
          setShowMediaPicker(false);
        }}
      />
    </>
  );
}

/* ── Generate Dialog ──────────────────────────────────────────────────── */
function GenerateDialog({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (data: GeneratedPost) => Promise<void>;
}) {
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<GeneratedPost | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Введите тему статьи");
      return;
    }
    setError("");
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/posts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, keywords }),
      });
      if (!res.ok) throw new Error("Ошибка генерации");
      const data = await res.json();
      setPreview(data);
    } catch {
      setError("Не удалось сгенерировать статью. Проверьте ANTHROPIC_API_KEY.");
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setSaving(true);
    setError("");
    try {
      await onConfirm(preview);
      onClose();
    } catch (error: any) {
      setError(error.message || "Не удалось сохранить статью");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      open
      onClose={onClose}
      title="Генерация статьи с Арай"
      subtitle="SEO-черновик, структура, тема и быстрый предпросмотр перед публикацией"
      size="lg"
      bodyClassName="p-5 sm:p-6"
      footer={(
        !preview ? (
          <>
            <Button variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {generating ? "Генерирую..." : "Сгенерировать"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setPreview(null)}>
              Перегенерировать
            </Button>
            <Button onClick={handleConfirm} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Сохранить как черновик
            </Button>
          </>
        )
      )}
    >
        <div className="space-y-4">
          {!preview ? (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  Тема статьи *
                </label>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="напр: Как выбрать брус для каркасного дома"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  Ключевые слова (опционально)
                </label>
                <input
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="напр: брус, каркасный дом, Подмосковье, строительство"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted/40 rounded-xl p-4 space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  Превью статьи
                </p>
                <p className="font-display font-bold text-lg">
                  {preview.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {preview.excerpt}
                </p>
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                    {preview.topic}
                  </span>
                  <span className="text-muted-foreground">
                    {preview.readTime} мин чтения
                  </span>
                  <span className="text-muted-foreground">/{preview.slug}</span>
                </div>
              </div>
              <div className="border border-border rounded-xl p-4 max-h-64 overflow-y-auto">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">
                  Содержание
                </p>
                <div
                  className="text-sm prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: preview.content }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="hidden">
          {!preview ? (
            <>
              <Button variant="outline" onClick={onClose}>
                Отмена
              </Button>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {generating ? "Генерирую..." : "Сгенерировать"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setPreview(null)}>
                Перегенерировать
              </Button>
              <Button onClick={handleConfirm} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Сохранить как черновик
              </Button>
            </>
          )}
        </div>
    </AdminModal>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────── */
export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");
  const deletingRef = useRef<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState("");

  const handleCreateBlank = async () => {
    if (!confirm("Создать черновик статьи?")) return;
    setCreating(true);
    setActionError("");
    try {
      const res = await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: `novaya-statya-${Date.now()}`,
          title: "Новая статья",
          excerpt: "",
          content: "",
          topic: "",
          readTime: 3,
          published: false,
          confirm: true,
        }),
      });
      const created = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(created.error || "Не удалось создать статью");
      setPosts((prev) => [created, ...prev]);
      setEditPost(created);
    } catch (error: any) {
      setActionError(error.message || "Не удалось создать статью");
    } finally {
      setCreating(false);
    }
  };

  const loadPosts = async () => {
    try {
      const res = await fetch("/api/admin/posts");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Не удалось загрузить статьи");
      setPosts(Array.isArray(data) ? data : []);
      setActionError("");
    } catch (error: any) {
      setActionError(error.message || "Не удалось загрузить статьи");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const updatePost = async (id: string, data: Partial<Post>) => {
    const res = await fetch(`/api/admin/posts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, confirm: true }),
    });
    const updated = await res.json().catch(() => ({}));
    if (!res.ok)
      throw new Error(updated.error || "Не удалось сохранить статью");
    setPosts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    setActionError("");
  };

  const deletePost = async (id: string) => {
    if (!confirm("Удалить статью?")) return;
    const next = new Set(deletingRef.current);
    next.add(id);
    deletingRef.current = next;
    setDeletingIds(new Set(next));
    setActionError("");
    try {
      const res = await fetch(`/api/admin/posts/${id}?confirm=true`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Не удалось удалить статью");
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (error: any) {
      setActionError(error.message || "Не удалось удалить статью");
    } finally {
      deletingRef.current.delete(id);
      setDeletingIds(new Set(deletingRef.current));
    }
  };

  const togglePublish = async (post: Post) => {
    try {
      await updatePost(post.id, { published: !post.published });
    } catch (error: any) {
      setActionError(error.message || "Не удалось изменить публикацию");
    }
  };

  const handleGenerate = async (data: GeneratedPost) => {
    const res = await fetch("/api/admin/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, aiGenerated: true, published: false, confirm: true }),
    });
    const created = await res.json().catch(() => ({}));
    if (!res.ok)
      throw new Error(
        created.error || "Не удалось сохранить сгенерированную статью",
      );
    setPosts((prev) => [created, ...prev]);
    setActionError("");
  };

  const handleSeed = async () => {
    if (!confirm("Создать стартовые статьи и услуги?")) return;
    setSeeding(true);
    setSeedMsg("");
    setActionError("");
    try {
      const res = await fetch("/api/admin/posts/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok)
        throw new Error(data.error || "Не удалось загрузить стартовые данные");
      setSeedMsg(data.message || "Готово");
      await loadPosts();
    } catch (error: any) {
      setActionError(error.message || "Ошибка");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="admin-page-frame admin-page-frame-readable">
      <AdminSectionTitle
        icon={BookOpen}
        title="Статьи и новости"
        subtitle={`${posts.length} статей`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSeed}
              disabled={seeding}
              title="Создать начальные данные (5 статей + 4 услуги)"
            >
              {seeding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Database className="w-3.5 h-3.5" />
              )}
              Стартовые данные
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowGenerate(true)}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Генерировать с Арай
            </Button>
            <Button size="sm" onClick={handleCreateBlank} disabled={creating}>
              {creating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              Новая статья
            </Button>
          </div>
        }
      />

      {seedMsg && (
        <div className="mb-4 px-4 py-2.5 bg-green-500/10 text-green-700 dark:text-green-400 text-sm rounded-xl border border-green-500/20">
          {seedMsg}
        </div>
      )}

      {actionError && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Загрузка...
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-2xl">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium mb-1">Статей нет</p>
          <p className="text-sm mb-4">
            Создайте первую статью или загрузите стартовые данные
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSeed}
            disabled={seeding}
          >
            <Database className="w-4 h-4" />
            Загрузить стартовые данные
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/20 sm:flex-row sm:items-center"
            >
              {/* Main info */}
              <div className="flex min-w-0 flex-1 gap-3">
                <div
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${post.published ? "bg-primary" : "bg-zinc-400"}`}
                  aria-label={post.published ? "Опубликована" : "Черновик"}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{post.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {post.topic && (
                      <span className="text-xs text-muted-foreground">
                        {post.topic}
                      </span>
                    )}
                    {post.aiGenerated && (
                      <Badge
                        variant="outline"
                        className="text-[10px] py-0 h-4 border-primary/30 text-primary"
                      >
                        <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                        AI
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {post.readTime} мин
                    </span>
                    {post.views > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {post.views} просмотров
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status badge */}
              <Badge
                variant={post.published ? "default" : "secondary"}
                className="shrink-0 text-xs"
              >
                {post.published ? "Опубликована" : "Черновик"}
              </Badge>

              {/* Actions */}
              <div className="grid w-full grid-cols-4 gap-2 sm:flex sm:w-auto sm:items-center sm:gap-1">
                <button
                  onClick={() => togglePublish(post)}
                  aria-label={
                    post.published ? "Скрыть статью" : "Опубликовать статью"
                  }
                  className="flex min-h-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:w-11"
                >
                  {post.published ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => setEditPost(post)}
                  aria-label="Редактировать статью"
                  className="flex min-h-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:w-11"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <a
                  href={`/news/${post.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Открыть статью на сайте"
                  className="flex min-h-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:w-11"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => deletePost(post.id)}
                  disabled={deletingIds.has(post.id)}
                  aria-label="Удалить статью"
                  className="flex min-h-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-60 sm:w-11"
                >
                  {deletingIds.has(post.id) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editPost && (
        <EditModal
          post={editPost}
          onClose={() => setEditPost(null)}
          onSave={updatePost}
        />
      )}

      {showGenerate && (
        <GenerateDialog
          onClose={() => setShowGenerate(false)}
          onConfirm={handleGenerate}
        />
      )}
    </div>
  );
}
