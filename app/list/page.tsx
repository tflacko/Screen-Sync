'use client';

import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { uploadToIPFS } from '@/lib/pinata';
import { createListing } from '@/lib/solana';
import type { ListingType } from '@/lib/mockData';
import { TYPE_LABELS, TYPE_ICONS } from '@/lib/mockData';
import KickerLabel from '@/components/KickerLabel';
import Button from '@/components/Button';
import WalletButton from '@/components/WalletButton';
import styles from '@/styles/CreateListing.module.css';

const ALL_TYPES = Object.keys(TYPE_LABELS) as ListingType[];
const STEPS = ['Type', 'Details', 'Media', 'Submit'];

export default function CreateListingPage() {
  const { connected } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [type, setType] = useState<ListingType | null>(null);
  const [form, setForm] = useState({ title: '', location: '', price: '', description: '' });
  const [file, setFile] = useState<File | null>(null);
  const [cid, setCid] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  if (!connected) {
    return (
      <div className={styles.page}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70svh', gap: '1.2rem', textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '3rem' }}>🔐</div>
          <h1 className={styles.title} style={{ fontSize: '1.8rem' }}>Connect Wallet to List</h1>
          <p style={{ color: 'var(--beige-dim)', maxWidth: '320px', lineHeight: 1.65 }}>
            You need a Solana wallet to create a listing on Screen Sync.
          </p>
          <WalletButton />
        </div>
      </div>
    );
  }

  async function handleUpload(f: File) {
    setUploading(true);
    setUploadError('');
    try {
      const result = await uploadToIPFS(f);
      setCid(result);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      setFile(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    const tx = await createListing({ type: type!, ...form, ipfsCid: cid });
    setTxHash(tx);
    setStep(4);
    setSubmitting(false);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <KickerLabel>List Inventory</KickerLabel>
        <h1 className={styles.title}>Create a Listing</h1>
      </div>

      <div className={styles.body}>
        {/* Stepper */}
        <div className={styles.stepper}>
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`${styles.step} ${i === step ? styles.active : ''} ${i < step ? styles.done : ''}`}
            >
              <div className={styles.stepNum}>{i < step ? '✓' : i + 1}</div>
              <div className={styles.stepLabel}>{label}</div>
            </div>
          ))}
        </div>

        {/* Step 0 — Type */}
        {step === 0 && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Select Inventory Type</h2>
            <div className={styles.typeGrid}>
              {ALL_TYPES.map((t) => (
                <button
                  key={t}
                  className={`${styles.typeBtn} ${type === t ? styles.selected : ''}`}
                  onClick={() => setType(t)}
                >
                  <span className={styles.typeBtnIcon}>{TYPE_ICONS[t]}</span>
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <div className={styles.actions} style={{ marginTop: '1.5rem' }}>
              <Button variant="cherry" onClick={() => type && setStep(1)} disabled={!type}>
                Next →
              </Button>
            </div>
          </div>
        )}

        {/* Step 1 — Details */}
        {step === 1 && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Listing Details</h2>
            <div className={styles.field}>
              <label className={styles.label}>Title</label>
              <input className={styles.input} placeholder="e.g. Downtown LA Digital Billboard" value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Location / Context</label>
              <input className={styles.input} placeholder="e.g. Los Angeles, CA · Wilshire Blvd" value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
            </div>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Price Per Day (SOL)</label>
                <input className={styles.input} type="number" min="0.01" step="0.01" placeholder="0.00" value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Description</label>
              <textarea className={styles.textarea} placeholder="Describe the ad placement, visibility, audience..." value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className={styles.actions}>
              <Button variant="ghost" onClick={() => setStep(0)}>← Back</Button>
              <Button variant="cherry" onClick={() => setStep(2)}
                disabled={!form.title || !form.location || !form.price}>
                Next →
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 — Media */}
        {step === 2 && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Upload Media</h2>
            <div
              className={styles.uploadZone}
              onClick={() => fileRef.current?.click()}
            >
              <div className={styles.uploadIcon}>📁</div>
              <div className={styles.uploadText}>{uploading ? 'Uploading to IPFS…' : 'Click to upload'}</div>
              <div className={styles.uploadSub}>Images or video · Max 5MB · Stored on IPFS via Pinata</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/*" hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) { setFile(f); await handleUpload(f); }
              }} />
            {file && cid && (
              <div className={styles.uploadedFile}>
                ✓ {file.name} · CID: {cid.slice(0, 20)}…
              </div>
            )}
            {uploadError && (
              <div className={styles.uploadError}>⚠ {uploadError}</div>
            )}
            <div className={styles.actions} style={{ marginTop: '1.5rem' }}>
              <Button variant="ghost" onClick={() => setStep(1)}>← Back</Button>
              <Button variant="cherry" onClick={() => setStep(3)} disabled={!cid || uploading}>
                Next →
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 — Submit */}
        {step === 3 && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Review & Submit</h2>
            {[
              ['Type', TYPE_LABELS[type!]],
              ['Title', form.title],
              ['Location', form.location],
              ['Price', `${form.price} SOL / day`],
              ['IPFS CID', cid.slice(0, 24) + '…'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid rgba(234,227,211,0.07)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--beige-dim)' }}>{k}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9rem' }}>{v}</span>
              </div>
            ))}
            <div className={styles.actions} style={{ marginTop: '1.5rem' }}>
              <Button variant="ghost" onClick={() => setStep(2)}>← Back</Button>
              <Button variant="cherry" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit On-Chain'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4 — Success */}
        {step === 4 && (
          <div className={styles.successBox}>
            <div className={styles.successIcon}>✅</div>
            <div className={styles.successTitle}>Listing Submitted!</div>
            <p className={styles.successSub}>
              Your listing has been submitted to the Solana devnet (mock). It will appear in the marketplace once confirmed on-chain.
            </p>
            <Button href="/marketplace" variant="cherry">Browse Marketplace</Button>
            <div className={styles.mockTx}>Mock TX: {txHash}</div>
          </div>
        )}
      </div>
    </div>
  );
}
