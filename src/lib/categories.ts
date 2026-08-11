import type { Jersey } from '../types/jersey';

export const ALL = 'Todos';

export interface CategoryNode {
  label: string;
  children: string[];
}

/**
 * Árvore de categorias do menu, montada a partir do próprio catálogo.
 *
 * A loja tem dois níveis — "Europeus > Italianos", "De Jogo > Autografadas" —
 * e o filtro precisa casar tanto o pai quanto o filho.
 */
export function buildCategoryTree(jerseys: Jersey[]): CategoryNode[] {
  const tree = new Map<string, Set<string>>();

  for (const j of jerseys) {
    const parent = j.category || 'Outros';
    if (!tree.has(parent)) tree.set(parent, new Set());
    if (j.subcategory) tree.get(parent)!.add(j.subcategory);
  }

  return [...tree.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
    .map(([label, children]) => ({
      label,
      children: [...children].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    }));
}

/** Rótulos em lista plana, para os componentes que só precisam disso. */
export function flatCategories(tree: CategoryNode[]): string[] {
  return [ALL, ...tree.flatMap((n) => [n.label, ...n.children])];
}

/** Um produto casa a seleção se ela for o pai ou a própria subcategoria. */
export function matchesCategory(jersey: Jersey, selected: string): boolean {
  if (selected === ALL) return true;
  return jersey.category === selected || jersey.subcategory === selected;
}
