import { useState, useCallback, useEffect } from 'react';
import styles from './AdminDashboard.module.scss';
import { AdminProductTable } from '../../components/AdminProductTable/AdminProductTable';
import { AdminProductForm } from '../../components/AdminProductForm/AdminProductForm';
import { api } from '../../utils/api';
import { useToast } from '../../components/Toast/Toast';
import type { Product } from '../../types/product';

interface PendingGuide {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string;
  status: string;
  createdAt: string;
  author: { id: string; username: string; avatarUrl: string | null };
}

/**
 * `/admin` — Product Manager dashboard + Guide Review Queue.
 */
export function AdminDashboard() {
  const { showToast } = useToast();
  const [adminTab, setAdminTab] = useState<'products' | 'guides'>('products');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  /** Increment to force table refetch after mutations. */
  const [refreshKey, setRefreshKey] = useState(0);

  // Guide review state
  const [pendingGuides, setPendingGuides] = useState<PendingGuide[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

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

  // Fetch pending guides
  useEffect(() => {
    if (adminTab !== 'guides') return;
    api<PendingGuide[]>('/guides/pending')
      .then(setPendingGuides)
      .catch(() => setPendingGuides([]));
  }, [adminTab, refreshKey]);

  const handleApproveGuide = async (id: string) => {
    try {
      await api(`/guides/${id}/publish`, { method: 'PUT' });
      setPendingGuides(prev => prev.filter(g => g.id !== id));
      showToast('Guide published', 'success');
    } catch { showToast('Failed to publish', 'error'); }
  };

  const handleRejectGuide = async (id: string) => {
    try {
      await api(`/guides/${id}/reject`, { method: 'PUT', body: { reason: rejectReason } });
      setPendingGuides(prev => prev.filter(g => g.id !== id));
      setRejectingId(null);
      setRejectReason('');
      showToast('Guide rejected', 'success');
    } catch { showToast('Failed to reject', 'error'); }
  };

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
        {/* Admin tabs */}
        <div className={styles.adminTabs}>
          <button
            className={`${styles.adminTab} ${adminTab === 'products' ? styles.adminTabActive : ''}`}
            onClick={() => setAdminTab('products')}
          >
            Product Manager
          </button>
          <button
            className={`${styles.adminTab} ${adminTab === 'guides' ? styles.adminTabActive : ''}`}
            onClick={() => setAdminTab('guides')}
          >
            Guide Review
            {pendingGuides.length > 0 && <span className={styles.pendingCount}>{pendingGuides.length}</span>}
          </button>
        </div>

        {adminTab === 'products' && (
          <>
            <h1 className={styles.heading}>Product Manager</h1>
            <p className={styles.subtitle}>
              Add, edit, and manage the sim racing product catalogue.
            </p>

            <AdminProductTable
              key={refreshKey}
              onAdd={handleAdd}
              onEdit={handleEdit}
            />
          </>
        )}

        {adminTab === 'guides' && (
          <>
            <h1 className={styles.heading}>Guide Review Queue</h1>
            <p className={styles.subtitle}>
              Review and approve user-submitted guides before they go live.
            </p>

            {pendingGuides.length === 0 ? (
              <div className={styles.emptyQueue}>No guides pending review</div>
            ) : (
              <div className={styles.guideQueue}>
                {pendingGuides.map(guide => (
                  <div key={guide.id} className={styles.guideQueueCard}>
                    <div className={styles.guideQueueHeader}>
                      <div>
                        <h3 className={styles.guideQueueTitle}>{guide.title}</h3>
                        <span className={styles.guideQueueMeta}>
                          by {guide.author.username} · {guide.category} · {new Date(guide.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {guide.excerpt && (
                      <p className={styles.guideQueueExcerpt}>{guide.excerpt}</p>
                    )}
                    <div className={styles.guideQueueActions}>
                      <a href={`/guides/${guide.slug}`} className={styles.previewLink} target="_blank" rel="noreferrer">
                        Preview
                      </a>
                      <button className={styles.approveBtn} onClick={() => handleApproveGuide(guide.id)}>
                        Approve &amp; Publish
                      </button>
                      {rejectingId === guide.id ? (
                        <div className={styles.rejectForm}>
                          <textarea
                            className={styles.rejectTextarea}
                            placeholder="Reason for rejection..."
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            rows={2}
                          />
                          <div className={styles.rejectFormButtons}>
                            <button className={styles.rejectConfirmBtn} onClick={() => handleRejectGuide(guide.id)}>
                              Confirm Reject
                            </button>
                            <button className={styles.rejectCancelBtn} onClick={() => { setRejectingId(null); setRejectReason(''); }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button className={styles.rejectBtn} onClick={() => setRejectingId(guide.id)}>
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
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
