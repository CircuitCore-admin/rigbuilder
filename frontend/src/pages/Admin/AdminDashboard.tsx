import { useState, useCallback } from 'react';
import styles from './AdminDashboard.module.scss';
import { AdminProductTable } from '../../components/AdminProductTable/AdminProductTable';
import { AdminProductForm } from '../../components/AdminProductForm/AdminProductForm';
import type { Product } from '../../types/product';

/**
 * `/admin` — Product Manager dashboard.
 *
 * Renders the searchable product table and opens the dynamic form
 * as a slide-over overlay for create/edit operations.
 */
export function AdminDashboard() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  /** Increment to force table refetch after mutations. */
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAdd = useCallback(() => {
    setEditingProduct(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((product: Product) => {
    setEditingProduct(product);
    setFormOpen(true);
  }, []);

  const handleSaved = useCallback(() => {
    setFormOpen(false);
    setEditingProduct(null);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleClose = useCallback(() => {
    setFormOpen(false);
    setEditingProduct(null);
  }, []);

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <div className={styles.logo}>
          Rig<span>Builder</span>
        </div>
        <span className={styles.badge}>Admin</span>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <h1 className={styles.heading}>Product Manager</h1>
        <p className={styles.subtitle}>
          Add, edit, and manage the sim racing product catalogue.
        </p>

        <AdminProductTable
          key={refreshKey}
          onAdd={handleAdd}
          onEdit={handleEdit}
        />
      </div>

      {/* Form overlay */}
      {formOpen && (
        <AdminProductForm
          product={editingProduct}
          onSaved={handleSaved}
          onClose={handleClose}
        />
      )}
    </div>
  );
}

export default AdminDashboard;
