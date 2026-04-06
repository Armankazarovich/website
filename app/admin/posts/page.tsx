"use client";

import { useState, useEffect, useRef } from "react";
import { AdminSectionTitle } from "@/components/admin/admin-section-title";
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
  X,
  Check,
  ExternalLink,
  Wand2,
  Database,
} from "lucide-react";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  topic: string | null;
  readTime: number;
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
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(post.id, { title, excerpt, topic, readTime });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <p className="font-display font-semibold">Редактировать статью</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Заголовок</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Краткое описание</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Тема</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="w-24">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Мин чтения</label>
              <input
                type="number"
                value={readTime}
                onChange={(e) => setReadTime(Number(e.target.value))}
                min={1}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-5">
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Сохранить
          </Button>
        </div>
      </div>
    </div>
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
    if (!topic.trim()) { setError("Введите тему статьи"); return; }
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
    await onConfirm(preview);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            <p className="font-display font-semibold">Генерация статьи с Арай</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!preview ? (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Тема статьи *</label>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="напр: Как выбрать брус для каркасного дома"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Ключевые слова (опционально)</label>
                <input
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="напр: брус, каркасный дом, Подмосковье, строительство"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted/40 rounded-xl p-4 space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Превью статьи</p>
                <p className="font-display font-bold text-lg">{preview.title}</p>
                <p className="text-sm text-muted-foreground">{preview.excerpt}</p>
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full">{preview.topic}</span>
                  <span className="text-muted-foreground">{preview.readTime} мин чтения</span>
                  <span className="text-muted-foreground">/{preview.slug}</span>
                </div>
              </div>
              <div className="border border-border rounded-xl p-4 max-h-64 overflow-y-auto">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">Содержание</p>
                <div
                  className="text-sm prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: preview.content }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 pb-5 sticky bottom-0 bg-card pt-2 border-t border-border">
          {!preview ? (
            <>
              <Button variant="outline" onClick={onClose}>Отмена</Button>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? "Генерирую..." : "Сгенерировать"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setPreview(null)}>Перегенерировать</Button>
              <Button onClick={handleConfirm} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Сохранить как черновик
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
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

  const loadPosts = async () => {
    try {
      const res = await fetch("/api/admin/posts");
      if (res.ok) setPosts(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPosts(); }, []);

  const updatePost = async (id: string, data: Partial<Post>) => {
    const res = await fetch(`/api/admin/posts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      setPosts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm("Удалить статью?")) return;
    const next = new Set(deletingRef.current);
    next.add(id);
    deletingRef.current = next;
    setDeletingIds(new Set(next));
    await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
    setPosts((prev) => prev.filter((p) => p.id !== id));
    deletingRef.current.delete(id);
    setDeletingIds(new Set(deletingRef.current));
  };

  const togglePublish = (post: Post) =>
    updatePost(post.id, { published: !post.published });

  const handleGenerate = async (data: GeneratedPost) => {
    const res = await fetch("/api/admin/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, aiGenerated: true, published: false }),
    });
    if (res.ok) {
      const created = await res.json();
      setPosts((prev) => [created, ...prev]);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMsg("");
    try {
      const res = await fetch("/api/admin/posts/seed", { method: "POST" });
      const data = await res.json();
      setSeedMsg(data.message || "Готово");
      await loadPosts();
    } catch {
      setSeedMsg("Ошибка");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl">
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
              {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
              Стартовые данные
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowGenerate(true)}>
              <Sparkles className="w-3.5 h-3.5" />
              Генерировать с Арай
            </Button>
            <Button size="sm" onClick={() => {/* TODO: create blank post */}}>
              <Plus className="w-3.5 h-3.5" />
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

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Загрузка...
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-2xl">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium mb-1">Статей нет</p>
          <p className="text-sm mb-4">Создайте первую статью или загрузите стартовые данные</p>
          <Button size="sm" variant="outline" onClick={handleSeed} disabled={seeding}>
            <Database className="w-4 h-4" />
            Загрузить стартовые данные
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <div
              key={post.id}
              className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/20 transition-colors"
            >
              {/* Status dot */}
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${post.published ? "bg-green-500" : "bg-zinc-400"}`}
                title={post.published ? "Опубликована" : "Черновик"}
              />

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{post.title}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {post.topic && (
                    <span className="text-xs text-muted-foreground">{post.topic}</span>
                  )}
                  {post.aiGenerated && (
                    <Badge variant="outline" className="text-[10px] py-0 h-4 border-primary/30 text-primary">
                      <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                      AI
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{post.readTime} мин</span>
                  {post.views > 0 && (
                    <span className="text-xs text-muted-foreground">{post.views} просмотров</span>
                  )}
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
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => togglePublish(post)}
                  title={post.published ? "Скрыть" : "Опубликовать"}
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  {post.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setEditPost(post)}
                  title="Редактировать"
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <a
                  href={`/news/${post.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Открыть на сайте"
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => deletePost(post.id)}
                  disabled={deletingIds.has(post.id)}
                  title="Удалить"
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
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
