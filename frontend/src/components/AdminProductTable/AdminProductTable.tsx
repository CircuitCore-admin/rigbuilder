import { useState, useEffect, useCallback } from 'react';
import styles from './AdminProductTable.module.scss';
import { api } from '../../utils/api';
import type { Product, ProductCategory, PaginatedResponse, CATEGORY_LABELS } from '../../types/product';

// Re-declare locally to avoid import of value in a type-only import
const CATEGORIES: ProductCategory[] = [
  'COCKPIT', 'WHEELBASE', 'WHEEL_RIM', 'PEDALS',
  'SHIFTER', 'DISPLAY', 'SEAT', 'EXTRAS',
];

const CATEGORY_DISPLAY: Record<ProductCategory, string> = {
  COCKPIT: 'Cockpit',
  WHEELBASE: 'Wheelbase',
  WHEEL_RIM: 'Wheel Rim',
  PEDALS: 'Pedals',
  SHIFTER: 'Shifter',
  DISPLAY: 'Display',
  SEAT: 'Seat',
  EXTRAS: 'Extras',
};

export interface AdminProductTableProps {
  /** Called when user clicks "Add Product". */
  onAdd: () => void;
  /** Called when user clicks "Edit" on a row. */
  onEdit: (product: Product) => void;
}

/**
 * Searchable, filterable, paginated admin product table.
 * Fetches data directly from the API with debounced search.
 */
export function AdminProductTable({ onAdd, onEdit }: AdminProductTableProps) {
  const [items, setItems] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (categoryFilter) params.set('category', categoryFilter);

      const data = await api<PaginatedResponse<Product>>(`/products?${params}`);
      setItems(data.items);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Debounced search: reset to page 1 on search change
  useEffect(() => { setPage(1); }, [search, categoryFilter]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api(`/products/${id}`, { method: 'DELETE' });
      fetchProducts();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  /**
   * Extracts the lowest affiliate price for display.
   */
  const getLowestPrice = (product: Product): string | null => {
    const links = product.affiliateLinks;
    if (!links || links.length === 0) return null;
    const min = Math.min(...links.map((l) => l.price));
    return `£${min.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className={styles.container}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.filterSelect}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{CATEGORY_DISPLAY[cat]}</option>
          ))}
        </select>
        <button type="button" className={styles.addButton} onClick={onAdd}>
          + Add Product
        </button>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th className={styles.th}>Product</th>
              <th className={styles.th}>Category</th>
              <th className={styles.th}>Platforms</th>
              <th className={`${styles.th} ${styles.alignRight}`}>Price (from)</th>
              <th className={`${styles.th} ${styles.alignRight}`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className={styles.empty}>
                  {search || categoryFilter ? 'No products match your filters.' : 'No products yet. Add the first one.'}
                </td>
              </tr>
            )}
            {items.map((product) => (
              <tr key={product.id} className={styles.tr}>
                <td className={styles.td}>
                  <div className={styles.productName}>{product.name}</div>
                  <div className={styles.manufacturer}>{product.manufacturer}</div>
                </td>
                <td className={styles.td}>
                  <span className={styles.categoryBadge}>
                    {CATEGORY_DISPLAY[product.category] ?? product.category}
                  </span>
                </td>
                <td className={styles.td}>
                  {product.platforms.length > 0 ? product.platforms.join(', ') : '—'}
                </td>
                <td className={`${styles.td} ${styles.alignRight}`}>
                  <span className={styles.price}>{getLowestPrice(product) ?? '—'}</span>
                </td>
                <td className={`${styles.td} ${styles.alignRight}`}>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={() => onEdit(product)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(product.id, product.name)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <span className={styles.pageInfo}>
              {total} product{total !== 1 ? 's' : ''} — page {page} of {totalPages}
            </span>
            <div className={styles.pageButtons}>
              <button
                className={styles.pageBtn}
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              <button
                className={styles.pageBtn}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminProductTable;
