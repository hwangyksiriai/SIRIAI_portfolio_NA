'use client';

import { useEffect, useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';

export default function AdminPage() {
  const [config, setConfig] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRegionKey, setSelectedRegionKey] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [dragOverCatId, setDragOverCatId] = useState(null);
  const dragSource = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch('/api/admin/config')
      .then((r) => r.json())
      .then((data) => {
        setConfig(data);
        setSelectedId(data.categories[0]?.id);
        const first = data.categories[0];
        if (first?.regions) setSelectedRegionKey(first.regions[0].key);
      });
  }, []);

  if (!config) {
    return <div style={styles.loading}>불러오는 중...</div>;
  }

  const category = config.categories.find((c) => c.id === selectedId);
  const hasRegions = Array.isArray(category?.regions) && category.regions.length > 0;
  const clips = hasRegions
    ? category.regions.find((r) => r.key === selectedRegionKey)?.clips || []
    : category?.clips || [];

  function updateClips(newClips) {
    setConfig((prev) => {
      const next = structuredClone(prev);
      const cat = next.categories.find((c) => c.id === selectedId);
      if (hasRegions) {
        const region = cat.regions.find((r) => r.key === selectedRegionKey);
        region.clips = newClips;
      } else {
        cat.clips = newClips;
      }
      return next;
    });
  }

  function updateCategoryTitle(title) {
    setConfig((prev) => {
      const next = structuredClone(prev);
      const cat = next.categories.find((c) => c.id === selectedId);
      cat.title = title;
      return next;
    });
  }

  function removeClip(index) {
    const next = clips.slice();
    next.splice(index, 1);
    updateClips(next);
  }

  function onDragStart(index) {
    dragSource.current = { catId: selectedId, regionKey: selectedRegionKey, index };
  }

  function onDragOver(e) {
    e.preventDefault();
  }

  function onDrop(index) {
    const src = dragSource.current;
    dragSource.current = null;
    if (!src) return;
    if (src.catId === selectedId && src.regionKey === selectedRegionKey) {
      if (src.index === index) return;
      const next = clips.slice();
      const [moved] = next.splice(src.index, 1);
      next.splice(index, 0, moved);
      updateClips(next);
    } else {
      moveClipAcrossPages(src, { catId: selectedId, regionKey: selectedRegionKey, index });
    }
  }

  function moveClipAcrossPages(src, dest) {
    setConfig((prev) => {
      const next = structuredClone(prev);
      const srcCat = next.categories.find((c) => c.id === src.catId);
      const srcHasRegions = Array.isArray(srcCat.regions) && srcCat.regions.length > 0;
      const srcArr = srcHasRegions
        ? srcCat.regions.find((r) => r.key === src.regionKey).clips
        : srcCat.clips;
      const [moved] = srcArr.splice(src.index, 1);

      const destCat = next.categories.find((c) => c.id === dest.catId);
      const destHasRegions = Array.isArray(destCat.regions) && destCat.regions.length > 0;
      let destArr;
      if (destHasRegions) {
        const regionKey = dest.regionKey && destCat.regions.some((r) => r.key === dest.regionKey)
          ? dest.regionKey
          : destCat.regions[0].key;
        destArr = destCat.regions.find((r) => r.key === regionKey).clips;
      } else {
        destArr = destCat.clips || (destCat.clips = []);
      }
      if (dest.index != null) {
        destArr.splice(dest.index, 0, moved);
      } else {
        destArr.push(moved);
      }
      return next;
    });
  }

  function onSidebarDragOver(e, catId) {
    e.preventDefault();
    if (dragSource.current && dragSource.current.catId !== catId) setDragOverCatId(catId);
  }

  function onSidebarDragLeave(catId) {
    setDragOverCatId((cur) => (cur === catId ? null : cur));
  }

  function onSidebarDrop(catId) {
    const src = dragSource.current;
    dragSource.current = null;
    setDragOverCatId(null);
    if (!src || src.catId === catId) return;
    moveClipAcrossPages(src, { catId, regionKey: null, index: null });
  }

  async function onFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingCount(files.length);
    const uploaded = [];
    for (const file of files) {
      try {
        const blob = await upload(`media/${selectedId}/${Date.now()}-${file.name}`, file, {
          access: 'public',
          handleUploadUrl: '/api/admin/upload',
        });
        uploaded.push(blob.url);
      } catch (err) {
        console.error('upload failed', file.name, err);
        alert(`업로드 실패: ${file.name}`);
      }
      setUploadingCount((c) => c - 1);
    }
    updateClips([...clips, ...uploaded]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function onSave() {
    setSaving(true);
    const res = await fetch('/api/admin/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    setSaving(false);
    if (res.ok) {
      setSavedAt(new Date().toLocaleTimeString('ko-KR'));
    } else {
      alert('저장에 실패했습니다');
    }
  }

  async function onLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  }

  return (
    <div style={styles.wrap}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>SIRIAI Admin</div>
        {config.categories.map((cat, i) => (
          <button
            key={cat.id}
            onClick={() => {
              setSelectedId(cat.id);
              setSelectedRegionKey(cat.regions ? cat.regions[0].key : null);
            }}
            onDragOver={(e) => onSidebarDragOver(e, cat.id)}
            onDragLeave={() => onSidebarDragLeave(cat.id)}
            onDrop={() => onSidebarDrop(cat.id)}
            style={{
              ...styles.navItem,
              ...(cat.id === selectedId ? styles.navItemActive : {}),
              ...(cat.id === dragOverCatId ? styles.navItemDragOver : {}),
            }}
          >
            <span style={styles.navItemIdx}>{String(i + 1).padStart(2, '0')}</span>
            {cat.navLabel}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={onLogout} style={styles.logoutBtn}>로그아웃</button>
      </aside>

      <main style={styles.main}>
        <div style={styles.topBar}>
          <input
            value={category.title}
            onChange={(e) => updateCategoryTitle(e.target.value)}
            style={styles.titleInput}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {savedAt && <span style={styles.savedNote}>저장됨 {savedAt}</span>}
            <button onClick={onSave} disabled={saving} style={styles.saveBtn}>
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>

        {hasRegions && (
          <div style={styles.regionTabs}>
            {category.regions.map((r) => (
              <button
                key={r.key}
                onClick={() => setSelectedRegionKey(r.key)}
                style={{
                  ...styles.regionTab,
                  ...(r.key === selectedRegionKey ? styles.regionTabActive : {}),
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}

        <p style={styles.hint}>카드를 드래그해서 순서를 바꾸세요. 왼쪽 페이지 목록으로 드래그하면 해당 페이지로 영상이 이동합니다. 영상을 추가하려면 아래 버튼을 누르세요.</p>

        <div style={styles.clipGrid}>
          {clips.map((src, i) => (
            <div
              key={src + i}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(i)}
              style={styles.clipCard}
            >
              <video src={src} muted loop playsInline style={styles.clipVideo}
                onMouseEnter={(e) => e.currentTarget.play()}
                onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
              />
              <div style={styles.clipFooter}>
                <span style={styles.clipIndex}>{i + 1}</span>
                <button onClick={() => removeClip(i)} style={styles.removeBtn}>삭제</button>
              </div>
            </div>
          ))}

          <label style={styles.addCard}>
            {uploadingCount > 0 ? `업로드 중 (${uploadingCount})` : '+ 영상 추가'}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,image/png,image/jpeg"
              multiple
              onChange={onFilesSelected}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </main>
    </div>
  );
}

const styles = {
  loading: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#948e82', background: '#0a0908', fontFamily: 'system-ui, sans-serif' },
  wrap: { display: 'flex', minHeight: '100vh', background: '#0a0908', color: '#f2ede4', fontFamily: 'system-ui, sans-serif' },
  sidebar: { width: 220, borderRight: '1px solid #262019', display: 'flex', flexDirection: 'column', padding: 16, gap: 4 },
  sidebarHeader: { fontWeight: 700, fontSize: 15, marginBottom: 12 },
  navItem: { display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', background: 'transparent', border: '1px solid transparent', color: '#948e82', padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
  navItemActive: { background: '#15130f', color: '#f2ede4' },
  navItemDragOver: { borderColor: '#c98a3f', background: 'rgba(201,138,63,.14)', color: '#f2ede4' },
  navItemIdx: { fontSize: 11, color: '#c98a3f', fontVariantNumeric: 'tabular-nums' },
  logoutBtn: { background: 'transparent', border: '1px solid #262019', color: '#948e82', padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12 },
  main: { flex: 1, padding: 28, overflowY: 'auto' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 16 },
  titleInput: { fontSize: 22, fontWeight: 700, background: 'transparent', border: 'none', color: '#f2ede4', borderBottom: '1px solid #262019', padding: '4px 0', flex: 1 },
  savedNote: { fontSize: 12, color: '#948e82' },
  saveBtn: { background: '#c98a3f', border: 'none', color: '#0a0908', fontWeight: 600, padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
  regionTabs: { display: 'flex', gap: 8, marginBottom: 16 },
  regionTab: { background: 'transparent', border: '1px solid #262019', color: '#948e82', padding: '6px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 12 },
  regionTabActive: { color: '#f2ede4', borderColor: '#c98a3f', background: 'rgba(201,138,63,.14)' },
  hint: { fontSize: 12, color: '#948e82', marginBottom: 16 },
  clipGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 },
  clipCard: { background: '#15130f', border: '1px solid #262019', borderRadius: 10, overflow: 'hidden', cursor: 'grab' },
  clipVideo: { width: '100%', aspectRatio: '9/16', objectFit: 'cover', background: '#000' },
  clipFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px' },
  clipIndex: { fontSize: 11, color: '#948e82' },
  removeBtn: { background: 'transparent', border: 'none', color: '#e08a6b', cursor: 'pointer', fontSize: 11 },
  addCard: { aspectRatio: '9/16', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #262019', borderRadius: 10, color: '#948e82', fontSize: 12, cursor: 'pointer', textAlign: 'center', padding: 8 },
};
