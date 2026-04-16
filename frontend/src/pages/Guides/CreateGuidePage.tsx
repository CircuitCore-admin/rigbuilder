import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/Toast/Toast';
import { MarkdownEditor } from '../../components/MarkdownEditor/MarkdownEditor';
import styles from './CreateGuidePage.module.scss';

const CATEGORIES = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'BUYING', label: 'Buying Guide' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'SETUP', label: 'Setup' },
  { value: 'DIY', label: 'DIY' },
  { value: 'COMPARISON', label: 'Comparison' },
  { value: 'TUTORIAL', label: 'Tutorial' },
];

interface GuideData {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  category: string;
  coverImage: string | null;
  tags: string[];
  productMentions: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  status: string;
  rejectionReason: string | null;
  isPublished: boolean;
  authorId: string;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'statusDraft' },
  PENDING_REVIEW: { label: 'Pending Review', className: 'statusPending' },
  PUBLISHED: { label: 'Published', className: 'statusPublished' },
  REJECTED: { label: 'Needs Revision', className: 'statusRejected' },
};

export function CreateGuidePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const showToast = useToast();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('BEGINNER');
  const [excerpt, setExcerpt] = useState('');
  const [body, setBody] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [guide, setGuide] = useState<GuideData | null>(null);

  // Load existing guide for editing
  useEffect(() => {
    if (!id) return;
    api<GuideData>(`/guides/${id}`)
      .then(g => {
        // Use the slug-based fetch which includes mentionedProducts
        // but we need the raw guide data. Try via the guide itself.
        setGuide(g);
        setTitle(g.title);
        setCategory(g.category);
        setExcerpt(g.excerpt ?? '');
        setBody(g.body);
        setTagsInput(g.tags.join(', '));
        setSeoTitle(g.seoTitle ?? '');
        setSeoDescription(g.seoDescription ?? '');
      })
      .catch(() => showToast('Failed to load guide', 'error'));
  }, [id]);

  if (!user) {
    return (
      <div className={styles.container}>
        <p className={styles.emptyState}>Please log in to write a guide.</p>
      </div>
    );
  }

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) {
      showToast('Title and body are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const payload = {
        title: title.trim(),
        category,
        excerpt: excerpt.trim() || undefined,
        body,
        tags,
        seoTitle: seoTitle.trim() || undefined,
        seoDescription: seoDescription.trim() || undefined,
      };

      if (guide) {
        const updated = await api<GuideData>(`/guides/${guide.id}`, { method: 'PUT', body: payload });
        setGuide(updated);
        showToast('Guide saved', 'success');
      } else {
        const created = await api<GuideData>('/guides', { method: 'POST', body: payload });
        setGuide(created);
        showToast('Draft created', 'success');
        navigate(`/guides/edit/${created.id}`, { replace: true });
      }
    } catch {
      showToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!guide) return;
    setSubmitting(true);
    try {
      const updated = await api<GuideData>(`/guides/${guide.id}/submit`, { method: 'POST' });
      setGuide(updated);
      showToast('Submitted for review!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to submit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const status = guide ? STATUS_LABELS[guide.status] ?? STATUS_LABELS.DRAFT : null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>{id ? 'Edit Guide' : 'Write a Guide'}</h1>
        {status && (
          <span className={`${styles.statusBadge} ${styles[status.className]}`}>
            {status.label}
          </span>
        )}
      </header>

      {guide?.status === 'REJECTED' && guide.rejectionReason && (
        <div className={styles.rejectionBanner}>
          <strong>Revision requested:</strong> {guide.rejectionReason}
        </div>
      )}

      <div className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="guide-title">Title</label>
          <input
            id="guide-title"
            type="text"
            className={styles.input}
            placeholder="Your guide title…"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={200}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="guide-category">Category</label>
          <select
            id="guide-category"
            className={styles.select}
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="guide-excerpt">Excerpt</label>
          <textarea
            id="guide-excerpt"
            className={styles.textarea}
            placeholder="A short summary of your guide…"
            value={excerpt}
            onChange={e => setExcerpt(e.target.value)}
            rows={2}
            maxLength={500}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Body</label>
          <MarkdownEditor
            value={body}
            onChange={setBody}
            placeholder="Write your guide content in markdown…"
            rows={16}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="guide-tags">Tags (comma-separated)</label>
          <input
            id="guide-tags"
            type="text"
            className={styles.input}
            placeholder="e.g. direct-drive, setup, beginner"
            value={tagsInput}
            onChange={e => setTagsInput(e.target.value)}
          />
        </div>

        <button
          type="button"
          className={styles.advancedToggle}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? '▾ Hide' : '▸ Show'} Advanced (SEO)
        </button>

        {showAdvanced && (
          <div className={styles.advancedFields}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="guide-seo-title">SEO Title</label>
              <input
                id="guide-seo-title"
                type="text"
                className={styles.input}
                placeholder="Custom SEO title"
                value={seoTitle}
                onChange={e => setSeoTitle(e.target.value)}
                maxLength={120}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="guide-seo-desc">SEO Description</label>
              <textarea
                id="guide-seo-desc"
                className={styles.textarea}
                placeholder="Custom SEO description"
                value={seoDescription}
                onChange={e => setSeoDescription(e.target.value)}
                rows={2}
                maxLength={300}
              />
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : guide ? 'Save Changes' : 'Save Draft'}
          </button>

          {guide && (guide.status === 'DRAFT' || guide.status === 'REJECTED') && (
            <button
              className={styles.submitBtn}
              onClick={handleSubmitForReview}
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit for Review'}
            </button>
          )}

          <button
            className={styles.cancelBtn}
            onClick={() => navigate('/guides')}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
