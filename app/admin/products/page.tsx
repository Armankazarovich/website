"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { ProductsClient } from "./products-client";
import { ProductsActions } from "./products-actions";

type ApiProduct = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  active: boolean;
  featured: boolean;
  images: string[];
  description?: string | null;
  category?: { name?: string | null } | null;
  variants?: {
    size?: string | null;
    pricePerCube?: number | string | null;
    pricePerPiece?: number | string | null;
    pricePerSquareMeter?: number | string | null;
    inStock?: boolean;
  }[];
};

type ApiCategory = {
  id: string;
  name: string;
};

function normalizeProducts(products: ApiProduct[]) {
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId,
    active: product.active,
    featured: product.featured,
    images: product.images ?? [],
    description: product.description ?? null,
    category: { name: product.category?.name ?? "Без категории" },
    variants: (product.variants ?? []).map((variant) => ({
      size: variant.size ?? null,
      pricePerCube: variant.pricePerCube ?? null,
      pricePerPiece: variant.pricePerPiece ?? null,
      pricePerSquareMeter: variant.pricePerSquareMeter ?? null,
      inStock: variant.inStock,
    })),
  }));
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ReturnType<typeof normalizeProducts>>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch("/api/admin/products?scope=active", { cache: "no-store" }),
        fetch("/api/admin/categories", { cache: "no-store" }),
      ]);

      if (!productsRes.ok) throw new Error("Не удалось загрузить каталог товаров");
      if (!categoriesRes.ok) throw new Error("Не удалось загрузить категории");

      const [productsJson, categoriesJson] = await Promise.all([
        productsRes.json() as Promise<ApiProduct[]>,
        categoriesRes.json() as Promise<ApiCategory[]>,
      ]);

      setProducts(normalizeProducts(productsJson));
      setCategories(categoriesJson.map((category) => ({ id: category.id, name: category.name })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Каталог не загрузился");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  if (loading) {
    return (
      <div className="admin-page-frame admin-page-frame-fluid">
        <ProductsActions />
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-border bg-card p-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div>
              <p className="font-semibold text-foreground">Загружаю каталог</p>
              <p className="mt-1 text-sm text-muted-foreground">Товары, цены, фото и статусы публикации</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page-frame admin-page-frame-fluid">
        <ProductsActions />
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-border bg-card p-8 text-center">
          <div className="flex max-w-md flex-col items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Каталог не открылся</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
            <button
              type="button"
              onClick={loadProducts}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              <RefreshCw className="h-4 w-4" />
              Повторить
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-frame admin-page-frame-fluid">
      <ProductsClient products={products} categories={categories} />
      <ProductsActions />
    </div>
  );
}
