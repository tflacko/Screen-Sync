'use client';

import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { uploadToIPFS } from '@/lib/pinata';
import { pinListingMetadata, listingMemo, type ListingMetadata } from '@/lib/listings';
import { sendTreasuryTx } from '@/lib/transactions';
import { PAYMENTS_ENABLED } from '@/lib/config';
import { LISTING_FEE_SOL } from '@/lib/constants';
import { txUrl } from '@/lib/explorer';
import type { ListingType } from '@/lib/mockData';
import { TYPE_LABELS, TYPE_ICONS } from '@/lib/mockData';
import KickerLabel from '@/components/KickerLabel';
import Button from '@/components/Button';
import WalletButton from '@/components/WalletButton';
import styles from '@/styles/CreateListing.module.css';

const ALL_TYPES = Object.keys(TYPE_LABELS) as ListingType[];
const STEPS = ['Type', 'Details', 'Media', 'Submit'];

export default function CreateListingPage() {
  const { connected, publicKey, sendTransaction } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [type, setType] = useState<ListingType | null>(null);
  const [form, setForm] = useState({ title: '', location: '', price: '', description: '' });
  const [file, setFile] = useState<File | null>(null);
  const [cid, setCid] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
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
    if (!publicKey) { setSubmitError('Wallet not connected'); return; }
    setSubmitting(true);
    setSubmitError('');
    try {
      // 1. Pin the listing metadata to IPFS.
      const meta: ListingMetadata = {
        v: 1,
        type: type!,
        title: form.title,
        location: form.location,
        pricePerDay: parseFloat(form.price) || 0,
        description: form.description,
        tags: [],
        audience: '',
        impressionsPerDay: 0,
        publisherType: 'commercial',
        mediaCid: cid,
        owner: publicKey.toBase58(),
        createdAt: Date.now(),
      };
      const metadataCid = await pinListingMetadata(meta);

      // 2. Anchor the metadata CID on-chain (skipped in mock mode without a treasury).
      let sig = '';
      if (PAYMENTS_ENABLED) {
        sig = await sendTreasuryTx({
          payer: publicKey,
          amountSol: LISTING_FEE_SOL,
          memo: listingMemo(metadataCid),
          sendTransaction,
        });
      }
      setTxHash(sig);
      setStep(4);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
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
            <p style={{ color: 'var(--beige-dim)', fontSize: '0.8rem', marginTop: '1rem', lineHeight: 1.6 }}>
              {PAYMENTS_ENABLED
                ? `Registers your listing on-chain (≈ ${LISTING_FEE_SOL} SOL network/registry fee). Metadata is stored on IPFS.`
                : 'Mock mode: metadata is pinned but no on-chain tx is sent (set a treasury address to go live).'}
            </p>
            {submitError && <div className={styles.uploadError}>⚠ {submitError}</div>}
            <div className={styles.actions} style={{ marginTop: '1.5rem' }}>
              <Button variant="ghost" onClick={() => setStep(2)}>← Back</Button>
              <Button variant="cherry" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting…' : PAYMENTS_ENABLED ? 'Submit On-Chain' : 'Submit (Mock)'}
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
              {txHash
                ? 'Your listing is registered on-chain and will appear in the marketplace.'
                : 'Mock submission complete. Configure a treasury + Pinata to register on-chain.'}
            </p>
            <Button href="/" variant="cherry">Browse Marketplace</Button>
            {txHash ? (
              <a className={styles.mockTx} href={txUrl(txHash)} target="_blank" rel="noreferrer"
                style={{ color: 'var(--cherry-bright)', textDecoration: 'underline' }}>
                View transaction on Solana Explorer ↗
              </a>
            ) : (
              <div className={styles.mockTx}>Mock submission (no on-chain tx)</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
