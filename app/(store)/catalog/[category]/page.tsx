import { permanentRedirect } from "next/navigation";

/**
 * /catalog/[category] → перенаправляет на /catalog?category=[slug]
 * Это обеспечивает работу ссылок с главной страницы (категории-карточки)
 */
export default function CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  permanentRedirect(`/catalog?category=${params.category}`);
}
