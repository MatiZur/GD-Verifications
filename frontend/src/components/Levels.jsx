import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiBlob, apiRequest, apiUrl } from '../services/api';
import { copy, translateError } from '../i18n';

function youtubeThumbnail(url) {
  try {
    const parsed = new URL(url);
    const id = parsed.hostname.endsWith('youtu.be') ? parsed.pathname.slice(1)
      : parsed.searchParams.get('v') || parsed.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1];
    return id ? `https://img.youtube.com/vi/${encodeURIComponent(id)}/hqdefault.jpg` : '';
  } catch { return ''; }
}

function youtubeEmbed(url) {
  try {
    const parsed = new URL(url);
    const id = parsed.hostname.endsWith('youtu.be') ? parsed.pathname.slice(1)
      : parsed.searchParams.get('v') || parsed.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1];
    return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : '';
  } catch { return ''; }
}

function LevelTitle({ level, language, className, onOpen }) {
  return level.status === 'VERIFIED' && level.gd_level_id
    ? <a className={className} href={`https://gdbrowser.com/${encodeURIComponent(level.gd_level_id)}`}>{level.name}</a>
    : onOpen ? <button className={className} type="button" onClick={onOpen}>{level.name}</button> : <span className={className}>{level.name}</span>;
}

function AredlMinimumPicker({ levels, value, onChange, t }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = levels.find((level) => level.id === value);
  useEffect(() => { setQuery(selected?.name || ''); }, [selected?.name]);
  const normalized = query.trim().toLowerCase();
  const matches = (normalized ? levels.filter((level) => level.name.toLowerCase().includes(normalized)) : levels).slice(0, 12);
  return <div className="level-field level-picker" onBlur={() => setTimeout(() => setOpen(false), 120)}>
    <label htmlFor="minimum-hardest-search">{t.minHardest}</label>
    <input id="minimum-hardest-search" role="combobox" aria-autocomplete="list" aria-expanded={open} value={query}
      onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); if (value) onChange(''); setOpen(true); }}
      placeholder={t.searchHardest} autoComplete="off"/>
    {open && <div className="level-picker-options" role="listbox">
      <button className="level-picker-option" type="button" role="option" aria-selected={!value}
        onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(''); setQuery(''); setOpen(false); }}>{t.noMinimum}</button>
      {matches.map((level) => <button className="level-picker-option" type="button" role="option" aria-selected={level.id === value} key={level.id}
        onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(level.id); setQuery(level.name); setOpen(false); }}>
        <span>{level.name}</span><small>#{level.position}</small>
      </button>)}
      {matches.length === 0 && <p className="level-picker-empty">{t.noMatches}</p>}
    </div>}
  </div>;
}

function LevelCard({ level, language, onOpen }) {
  const t = copy[language];
  const modeLabel = level.game_mode === 'PLATFORMER' ? t.platformerMode : t.classicMode;
  const statusLabel = level.status === 'AVAILABLE' && level.applications_open === false ? t.applicationsClosed
    : ({ VERIFIED: t.statusVerified, IN_PROGRESS: t.statusInProgress, AVAILABLE: t.statusAvailable, REJECTED: t.activityRejected, CANCELLED: t.activityCancelled, PENDING_REVIEW: t.activityReview }[level.status] || level.status);
  const verifiedBy = level.status === 'VERIFIED' && Array.isArray(level.verified_by)
    ? level.verified_by.map((verifier) => verifier.display_name || verifier.username).join(', ')
    : '';
  return <article className="level-card">
    <a className="level-card-image-link" href={level.showcase_url} aria-label={`${t.openVideo}: ${level.name}`}>
      <img className="level-card-image" src={level.has_image ? apiUrl(`/levels/${level.id}/image`) : youtubeThumbnail(level.showcase_url)} alt={level.name} loading="lazy"/>
    </a>
    <div className="level-card-top"><span className="level-mode">{modeLabel}</span><span className={`level-status status-${level.status.toLowerCase()}`}>{statusLabel}</span></div>
    <LevelTitle level={level} language={language} className="level-card-title level-card-open-title" onOpen={onOpen}/>
    <p className="level-card-difficulty">{t.difficultyTop}{level.difficulty_estimate}</p>
    <p className="level-card-creator">{t.createdBy} {level.creator_display_name || level.creator_username}{verifiedBy && <span className="verified-by"> · {t.verifiedBy} {verifiedBy}</span>}</p>
    <div className="level-card-actions"><button className="button button-primary" type="button" onClick={onOpen}>{t.levelDetails}</button></div>
  </article>;
}

export function RecentVerifications({ language, user, onRequireLogin }) {
  const t = copy[language];
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openLevelId, setOpenLevelId] = useState(null);
  useEffect(() => {
    let active = true;
    apiRequest('/levels/recent-verifications').then((data) => { if (active) setLevels(data.levels); })
      .catch(() => {}).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <section className="home-verifications">
    <header className="home-verifications-heading"><p className="profile-eyebrow">{t.verifiedLevelsEyebrow}</p><h2>{t.recentVerificationsTitle}</h2><p>{t.recentVerificationsIntro}</p></header>
    {loading ? <p className="levels-message">{t.loadingLevels}</p> : levels.length === 0 ? <p className="levels-message">{t.emptyVerifiedLevels}</p> :
      <section className="levels-grid home-verifications-grid">{levels.map((level) => <LevelCard key={level.id} level={level} language={language} onOpen={() => setOpenLevelId(level.id)}/>)}</section>}
    {openLevelId && <LevelDetailsModal levelId={openLevelId} language={language} user={user} onRequireLogin={onRequireLogin} onClose={() => setOpenLevelId(null)}/>}
  </section>;
}

export function LevelsPage({ create = false, language, user, sessionLoading, onRequireLogin, onChangeLanguage }) {
  const t = copy[language];
  const navigate = useNavigate();
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(!create);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [classic, setClassic] = useState([]);
  const [platformer, setPlatformer] = useState([]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [openLevelId, setOpenLevelId] = useState(null);
  const [form, setForm] = useState({ name: '', game_mode: 'CLASSIC', difficulty_estimate: '', showcase_url: '', description: '', minimum_hardest_aredl_id: '', open_verification: false });

  useEffect(() => {
    let active = true;
    if (!create) {
      apiRequest('/levels').then((data) => { if (active) setLevels(data.levels); })
        .catch((loadError) => { if (active) setError(translateError(loadError.message, language)); })
        .finally(() => { if (active) setLoading(false); });
    } else if (user) {
      apiRequest('/users/aredl/extremes').then((data) => {
        if (active) { setClassic(data.classic); setPlatformer(data.platformer); }
      }).catch((loadError) => { if (active) setFormError(translateError(loadError.message, language)); });
    }
    return () => { active = false; };
  }, [create, user, language]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: name === 'game_mode' ? value : value }));
  }

  async function submitLevel(event) {
    event.preventDefault(); setSaving(true); setFormError('');
    try {
      const data = await apiRequest('/levels', {
        method: 'POST',
        body: JSON.stringify({ ...form, difficulty_estimate: Number(form.difficulty_estimate) })
      });
      setNotice(t.levelPublished);
      navigate(`/levels/${data.level.id}`, { state: { notice: t.levelPublished } });
    } catch (saveError) { setFormError(translateError(saveError.message, language)); }
    finally { setSaving(false); }
  }

  const minimumLevels = form.game_mode === 'PLATFORMER' ? platformer : classic;
  const unverifiedLevels = levels.filter((level) => level.status === 'AVAILABLE');
  const beingVerified = [...levels].filter((level) => level.status === 'IN_PROGRESS')
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
  const recentFirst = (a, b) => new Date(b.created_at) - new Date(a.created_at);
  const catalogSections = [
    { key: 'classic', title: t.classicMode, items: unverifiedLevels.filter((level) => level.game_mode === 'CLASSIC').sort(recentFirst) },
    { key: 'platformer', title: t.platformerMode, items: unverifiedLevels.filter((level) => level.game_mode === 'PLATFORMER').sort(recentFirst) },
    { key: 'recent', title: t.recentLevels, items: [...unverifiedLevels].sort(recentFirst) },
    { key: 'oldest', title: t.oldestLevels, items: [...unverifiedLevels].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) },
    { key: 'hardest', title: t.hardestLevels, items: [...unverifiedLevels].sort((a, b) => Number(a.difficulty_estimate) - Number(b.difficulty_estimate)) },
    { key: 'easiest', title: t.easiestLevels, items: [...unverifiedLevels].sort((a, b) => Number(b.difficulty_estimate) - Number(a.difficulty_estimate)) }
  ];
  const recentlyVerified = [...levels].filter((level) => level.status === 'VERIFIED')
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
  return <main className="levels-page">
    <div className="levels-content">
      {create ? <>
        <header className="levels-heading"><p className="profile-eyebrow">GD VERIFICATIONS</p><h1>{t.createLevelTitle}</h1><p>{t.createLevelIntro}</p></header>
        {sessionLoading ? <p className="levels-message">{t.loading}</p> : !user ? <section className="levels-login-card"><p>{t.signInToPublish}</p><button className="button button-primary" type="button" onClick={onRequireLogin}>{t.login}</button></section> :
          <form className="level-form" onSubmit={submitLevel}>
            <label className="level-field">{t.levelName}<input name="name" value={form.name} onChange={updateField} maxLength={100} required/></label>
            <div className="level-form-row">
              <label className="level-field">{t.levelMode}<select name="game_mode" value={form.game_mode} onChange={(event) => { updateField(event); setForm((current) => ({ ...current, minimum_hardest_aredl_id: '' })); }}>
                <option value="CLASSIC">{t.classicMode}</option><option value="PLATFORMER">{t.platformerMode}</option>
              </select></label>
              <label className="level-field">{t.estimatedDifficulty}<span className="level-top-input"><span>{t.difficultyTop}</span><input type="number" name="difficulty_estimate" min="1" max="10000" step="1" value={form.difficulty_estimate} onChange={updateField} required/></span><small>{t.difficultyHelp}</small></label>
            </div>
            <AredlMinimumPicker levels={minimumLevels} value={form.minimum_hardest_aredl_id} onChange={(value) => setForm((current) => ({ ...current, minimum_hardest_aredl_id: value }))} t={t}/>
            <label className="level-field">{t.youtubeShowcase}<input type="url" name="showcase_url" value={form.showcase_url} onChange={updateField} placeholder="https://youtu.be/..." maxLength={2048} required/></label>
            <label className="level-open-verification"><input type="checkbox" name="open_verification" checked={form.open_verification} onChange={(event) => setForm((current) => ({ ...current, open_verification: event.target.checked }))}/><span><strong>{t.openVerification}</strong><small>{t.openVerificationHelp}</small></span></label>
            <label className="level-field">{t.levelImage}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={async (event) => {
              const file = event.target.files?.[0]; if (!file) return;
              if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setFormError(t.levelImageType); event.target.value = ''; return; }
              if (file.size > 8 * 1024 * 1024) { setFormError(t.levelImageOriginalTooLarge); event.target.value = ''; return; }
              try { const image = await createImageBitmap(file); const targetRatio = 16 / 9; const cropWidth = Math.min(image.width, image.height * targetRatio); const cropHeight = cropWidth / targetRatio; const canvas = document.createElement('canvas'); canvas.width = 1920; canvas.height = 1080; const context = canvas.getContext('2d'); if (!context) throw new Error(t.levelImageError); context.imageSmoothingQuality = 'high'; context.drawImage(image, (image.width - cropWidth) / 2, (image.height - cropHeight) / 2, cropWidth, cropHeight, 0, 0, 1920, 1080); image.close();
                const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error(t.levelImageError)), 'image/jpeg', 0.94));
                if (blob.size > 4 * 1024 * 1024) throw new Error(t.levelImageTooLarge);
                const reader = new FileReader(); reader.onload = () => setForm((current) => ({ ...current, image_data: reader.result })); reader.readAsDataURL(blob);
              } catch (imageError) { setFormError(imageError.message || t.levelImageError); } finally { event.target.value = ''; }
            }}/><small>{t.levelImageHelp}</small>
              {form.image_data && <div className="level-image-preview"><img src={form.image_data} alt={t.levelImagePreview}/><button type="button" className="button button-outline" onClick={() => setForm((current) => ({ ...current, image_data: '' }))}>{t.levelImageRemove}</button></div>}
            </label>
            <label className="level-field">{t.levelDescription}<textarea name="description" value={form.description} onChange={updateField} rows={4} maxLength={2000}/></label>
            {formError && <p className="level-error" role="alert">{formError}</p>}
            <div className="level-form-actions"><button className="button button-primary" type="submit" disabled={saving}>{saving ? t.publishing : t.publishLevel}</button></div>
          </form>}
      </> : <>
        <header className="levels-heading"><p className="profile-eyebrow">GD VERIFICATIONS</p><h1>{t.levelsTitle}</h1><p>{t.levelsIntro}</p>
          <Link className="button button-primary" to="/levels/new">{t.newLevel}</Link>
          <Link className="button button-outline levels-all-link" to="/levels/all">{t.allLevels}</Link>
        </header>
        {notice && <p className="level-success" role="status">{notice}</p>}
        {loading ? <p className="levels-message">{t.loadingLevels}</p> : error ? <p className="levels-message level-error">{error}</p> : <>
          <div className="catalog-category-list">{catalogSections.map((section) => <section className="catalog-category" key={section.key}>
            <header className="catalog-section-heading"><h2>{section.title}</h2><span>{section.items.length}</span></header>
            {section.items.length ? <section className="levels-grid catalog-levels-grid">{section.items.map((level) => <LevelCard key={level.id} level={level} language={language} onOpen={() => setOpenLevelId(level.id)}/>)}</section> : <p className="catalog-empty">{t.emptyCategory}</p>}
          </section>)}</div>
          <section className="catalog-category catalog-being-verified">
            <header className="catalog-section-heading"><h2>{t.beingVerified}</h2><span>{beingVerified.length}</span></header>
            {beingVerified.length ? <section className="levels-grid catalog-levels-grid">{beingVerified.map((level) => <LevelCard key={level.id} level={level} language={language} onOpen={() => setOpenLevelId(level.id)}/>)}</section> : <p className="catalog-empty">{t.emptyCategory}</p>}
          </section>
          <section className="catalog-category catalog-recently-verified">
            <header className="catalog-section-heading"><h2>{t.recentlyVerified}</h2><span>{recentlyVerified.length}</span></header>
            {recentlyVerified.length ? <section className="levels-grid catalog-levels-grid">{recentlyVerified.map((level) => <LevelCard key={level.id} level={level} language={language} onOpen={() => setOpenLevelId(level.id)}/>)}</section> : <p className="catalog-empty">{t.emptyVerifiedLevels}</p>}
          </section>
        </>}
      </>}
    </div>
    {openLevelId && <LevelDetailsModal levelId={openLevelId} language={language} user={user} onRequireLogin={onRequireLogin} onClose={() => setOpenLevelId(null)}/>}
  </main>;
}

function AllLevelsFilters({ levels, language, onOpen }) {
  const t = copy[language];
  const [mode, setMode] = useState('ALL');
  const [minimumTop, setMinimumTop] = useState('');
  const [maximumTop, setMaximumTop] = useState('');
  const [ageOrder, setAgeOrder] = useState('NEWEST');
  const [verificationStatus, setVerificationStatus] = useState('UNVERIFIED');
  const filteredLevels = levels.filter((level) => {
    if (mode !== 'ALL' && level.game_mode !== mode) return false;
    if (minimumTop && Number(level.difficulty_estimate) < Number(minimumTop)) return false;
    if (maximumTop && Number(level.difficulty_estimate) > Number(maximumTop)) return false;
    if (verificationStatus === 'UNVERIFIED' && ['IN_PROGRESS', 'VERIFIED'].includes(level.status)) return false;
    if (verificationStatus === 'IN_PROGRESS' && level.status !== 'IN_PROGRESS') return false;
    if (verificationStatus === 'VERIFIED' && level.status !== 'VERIFIED') return false;
    return true;
  }).sort((a, b) => ageOrder === 'NEWEST'
    ? new Date(b.created_at) - new Date(a.created_at)
    : new Date(a.created_at) - new Date(b.created_at));

  return <>
    <div className="catalog-filter-panel">
      <label>{t.modeFilter}<select value={mode} onChange={(event) => setMode(event.target.value)}><option value="ALL">{t.bothModes}</option><option value="CLASSIC">{t.classicMode}</option><option value="PLATFORMER">{t.platformerMode}</option></select></label>
      <fieldset className="catalog-difficulty-filter"><legend>{t.difficultyFilter}</legend><label>{t.topFrom}<input type="number" min="1" max="10000" value={minimumTop} onChange={(event) => setMinimumTop(event.target.value)}/></label><label>{t.topTo}<input type="number" min="1" max="10000" value={maximumTop} onChange={(event) => setMaximumTop(event.target.value)}/></label></fieldset>
      <label>{t.ageFilter}<select value={ageOrder} onChange={(event) => setAgeOrder(event.target.value)}><option value="NEWEST">{t.newestFirst}</option><option value="OLDEST">{t.oldestFirst}</option></select></label>
      <label>{t.verificationFilter}<select value={verificationStatus} onChange={(event) => setVerificationStatus(event.target.value)}><option value="UNVERIFIED">{t.unverifiedOnly}</option><option value="IN_PROGRESS">{t.beingVerified}</option><option value="VERIFIED">{t.verifiedOnly}</option><option value="ALL">{t.allStatuses}</option></select></label>
    </div>
    {filteredLevels.length ? <section className="levels-grid catalog-levels-grid">{filteredLevels.map((level) => <LevelCard key={level.id} level={level} language={language} onOpen={() => onOpen(level.id)}/>)}</section> : <p className="catalog-empty">{t.noFilterMatches}</p>}
  </>;
}

export function AllLevelsPage({ language, user, onRequireLogin }) {
  const t = copy[language];
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openLevelId, setOpenLevelId] = useState(null);
  useEffect(() => {
    let active = true;
    apiRequest('/levels').then((data) => { if (active) setLevels(data.levels); })
      .catch((loadError) => { if (active) setError(translateError(loadError.message, language)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [language]);
  return <main className="levels-page"><div className="levels-content">
    <header className="levels-heading"><p className="profile-eyebrow">GD VERIFICATIONS</p><h1>{t.allLevels}</h1><p>{t.allLevelsIntro}</p><Link className="button button-outline" to="/levels">{t.levelCategories}</Link></header>
    {loading ? <p className="levels-message">{t.loadingLevels}</p> : error ? <p className="levels-message level-error">{error}</p> : <AllLevelsFilters levels={levels} language={language} onOpen={setOpenLevelId}/>}
    {openLevelId && <LevelDetailsModal levelId={openLevelId} language={language} user={user} onRequireLogin={onRequireLogin} onClose={() => setOpenLevelId(null)}/>}
  </div></main>;
}

function ApplicantManagement({ level, language, onLevelUpdate }) {
  const t = copy[language];
  const [applications, setApplications] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [removingId, setRemovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

  useEffect(() => {
    let active = true;
    apiRequest(`/levels/${encodeURIComponent(level.id)}/applications`)
      .then((data) => { if (active) setApplications(data.applications); })
      .catch((loadError) => { if (active) setError(translateError(loadError.message, language)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [level.id, language]);

  const pendingIds = applications.filter((application) => application.status === 'PENDING').map((application) => String(application.id));
  const canAccept = ['AVAILABLE', 'IN_PROGRESS'].includes(level.status);
  function toggleApplication(id) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }
  async function acceptSelected() {
    setSaving(true); setError(''); setNotice('');
    try {
      await apiRequest(`/levels/${encodeURIComponent(level.id)}/applications`, {
        method: 'PATCH', body: JSON.stringify({ application_ids: selected })
      });
      setApplications((current) => current.map((application) => selected.includes(String(application.id)) ? { ...application, status: 'ACCEPTED' } : application));
      onLevelUpdate({ status: 'IN_PROGRESS', accepted_verifier_count: Number(level.accepted_verifier_count || 0) + selected.length });
      setNotice(t.applicantsAccepted.replace('{count}', String(selected.length)));
      setSelected([]);
    } catch (acceptError) { setError(translateError(acceptError.message, language)); }
    finally { setSaving(false); }
  }
  async function rejectApplication(application) {
    if (!window.confirm(t.rejectApplicationConfirm)) return;
    setRejectingId(String(application.id)); setError(''); setNotice('');
    try {
      await apiRequest(`/levels/${encodeURIComponent(level.id)}/applications/${encodeURIComponent(application.id)}/reject`, { method: 'PATCH' });
      setApplications((current) => current.map((item) => String(item.id) === String(application.id) ? { ...item, status: 'REJECTED' } : item));
      setSelected((current) => current.filter((id) => id !== String(application.id)));
      setNotice(t.applicationRejected);
    } catch (rejectError) { setError(translateError(rejectError.message, language)); }
    finally { setRejectingId(null); }
  }
  async function removeVerifier(application) {
    if (!window.confirm(t.removeVerifierConfirm)) return;
    setRemovingId(String(application.id)); setError(''); setNotice('');
    try {
      const result = await apiRequest(`/levels/${encodeURIComponent(level.id)}/verifiers/${encodeURIComponent(application.id)}`, { method: 'DELETE' });
      setApplications((current) => current.map((item) => String(item.id) === String(application.id) ? { ...item, status: 'REJECTED' } : item));
      onLevelUpdate({ status: result.status, accepted_verifier_count: result.acceptedVerifierCount });
    } catch (removeError) { setError(translateError(removeError.message, language)); }
    finally { setRemovingId(null); }
  }

  return <section className="applicant-management">
    <div className="applicant-heading"><div><h2>{t.levelApplicants}</h2><p>{t.levelApplicantsIntro}</p></div>
      {!loading && canAccept && pendingIds.length > 0 && <button type="button" className="button button-outline" onClick={() => setSelected(selected.length === pendingIds.length ? [] : pendingIds)}>{selected.length === pendingIds.length ? t.clearSelection : t.selectAllPending}</button>}
    </div>
    {loading ? <p className="levels-message">{t.loadingApplicants}</p> : error ? <p className="level-error" role="alert">{error}</p>
      : applications.length === 0 ? <p className="levels-message">{t.noApplicants}</p>
        : <div className="applicant-list">{applications.map((application) => {
          const username = application.username;
          const displayName = application.display_name || username;
          const statusText = application.status === 'ACCEPTED' ? t.activityAccepted : application.status === 'REJECTED' ? t.activityRejected : application.status === 'WITHDRAWN' ? t.activityWithdrawn : t.activityPending;
          return <article className="applicant-card" key={application.id}>
            {canAccept && application.status === 'PENDING' && <input aria-label={`${t.selectApplicant} ${displayName}`} type="checkbox" checked={selected.includes(String(application.id))} onChange={() => toggleApplication(String(application.id))}/>}
            {application.avatar_url ? <img className="applicant-avatar" src={application.avatar_url} alt=""/> : <span className="applicant-avatar applicant-avatar-fallback">{displayName.slice(0, 1).toUpperCase()}</span>}
            <div className="applicant-info"><Link to={`/user/${encodeURIComponent(username)}`}>{displayName} <span>@{username}</span></Link>
              <p>{application.matching_hardest_name ? `${t.applicantHardest}: ${application.matching_hardest_name}` : t.noHardestYet}</p>
            </div>
            <span className={`applicant-status applicant-status-${application.status.toLowerCase()}`}>{statusText}</span>
            {canAccept && application.status === 'PENDING' && <button className="button button-outline applicant-reject" type="button" onClick={() => rejectApplication(application)} disabled={Boolean(rejectingId) || saving}>{rejectingId === String(application.id) ? t.rejectingApplication : t.rejectApplication}</button>}
            {level.status === 'IN_PROGRESS' && application.status === 'ACCEPTED' && <button className="button button-outline applicant-remove" type="button" onClick={() => removeVerifier(application)} disabled={Boolean(removingId)}>{removingId === String(application.id) ? t.savingLevelAction : t.removeVerifier}</button>}
          </article>;
        })}</div>}
    {selected.length > 0 && canAccept && <div className="applicant-actions"><span>{t.selectedApplicants.replace('{count}', String(selected.length))}</span><button className="button button-primary" type="button" onClick={acceptSelected} disabled={saving}>{saving ? t.acceptingApplicants : t.acceptSelected}</button></div>}
    {notice && <p className="level-success" role="status">{notice}</p>}
  </section>;
}

function LevelChat({ levelId, language, user }) {
  const t = copy[language];
  const [authorized, setAuthorized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [canSend, setCanSend] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportedUserId, setReportedUserId] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reportNotice, setReportNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!user) { setLoading(false); return undefined; }
    let active = true;
    async function refresh() {
      try {
        const data = await apiRequest(`/levels/${encodeURIComponent(levelId)}/chat`);
        if (!active) return;
        setAuthorized(data.authorized);
        setCanSend(data.can_send === true);
        setParticipants(data.participants || []);
        setMessages((current) => current.length === data.messages.length && String(current.at(-1)?.id || '') === String(data.messages.at(-1)?.id || '') ? current : data.messages);
        if (!data.authorized && pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
        setError('');
      } catch (loadError) {
        if (active) setError(translateError(loadError.message, language));
      } finally { if (active) setLoading(false); }
    }
    refresh();
    pollRef.current = window.setInterval(refresh, 5000);
    return () => { active = false; window.clearInterval(pollRef.current); pollRef.current = null; };
  }, [levelId, language, user]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }); }, [messages]);

  async function sendMessage(event) {
    event.preventDefault();
    if (!message.trim() && !attachment) return;
    setSending(true); setError('');
    try {
      const body = new FormData();
      if (message.trim()) body.append('message', message.trim());
      if (attachment) body.append('attachment', attachment);
      const data = await apiRequest(`/levels/${encodeURIComponent(levelId)}/messages`, {
        method: 'POST', body
      });
      setMessages((current) => [...current, data.message].slice(-100));
      setMessage('');
      setAttachment(null);
    } catch (sendError) { setError(translateError(sendError.message, language)); }
    finally { setSending(false); }
  }

  async function submitReport(event) {
    event.preventDefault(); setReporting(true); setError(''); setReportNotice('');
    try {
      await apiRequest(`/levels/${encodeURIComponent(levelId)}/chat-reports`, {
        method: 'POST', body: JSON.stringify({ reported_user_id: reportedUserId, reason: reportReason })
      });
      setReportNotice(t.reportSent); setReportReason(''); setReportOpen(false);
    } catch (reportError) { setError(translateError(reportError.message, language)); }
    finally { setReporting(false); }
  }

  if (!user) return <p className="levels-message">{t.signInToUseChat}</p>;
  if (loading) return <p className="levels-message">{t.loadingChat}</p>;
  if (!authorized) return <p className="levels-message level-error">{t.chatNotParticipant}</p>;
  return <section className="level-chat" aria-label={t.levelChat}>
    <header className="level-chat-heading"><div><h2>{t.levelChat}</h2><p>{t.levelChatAudience}</p><div className="chat-participants" aria-label={t.chatParticipants}>{participants.map((participant) => <Link className="chat-participant" key={participant.id} to={`/user/${encodeURIComponent(participant.username)}`}>
      {participant.avatar_url ? <img src={participant.avatar_url} alt=""/> : <span>{(participant.display_name || participant.username).slice(0, 1).toUpperCase()}</span>}
      <span>{participant.display_name || participant.username}<small>{participant.participant_role === 'CREATOR' ? t.levelCreator : t.verifierRole}</small></span>
    </Link>)}</div></div>{canSend && <button className="button button-outline chat-report-button" type="button" onClick={() => setReportOpen((current) => !current)}>{reportOpen ? t.cancel : t.reportChat}</button>}</header>
    {reportOpen && canSend && <form className="chat-report-form" onSubmit={submitReport}>
      <label>{t.reportParticipant}<select value={reportedUserId} onChange={(event) => setReportedUserId(event.target.value)} required>
        <option value="">—</option>{participants.filter((participant) => String(participant.id) !== String(user.id)).map((participant) => <option key={participant.id} value={participant.id}>{participant.display_name || participant.username}</option>)}
      </select></label>
      <label>{t.reportReason}<textarea value={reportReason} onChange={(event) => setReportReason(event.target.value)} minLength={5} maxLength={1000} required placeholder={t.reportReasonPlaceholder}/></label>
      <button className="button button-primary" type="submit" disabled={reporting}>{reporting ? t.processing : t.sendReport}</button>
    </form>}
    {reportNotice && <p className="level-success" role="status">{reportNotice}</p>}
    <div className="level-chat-messages" aria-live="polite">
      {messages.length === 0 ? <p className="level-chat-empty">{t.chatEmpty}</p> : messages.map((item) => {
        const ownMessage = String(item.sender_id) === String(user.id);
        return <article className={`chat-message${ownMessage ? ' own-message' : ''}`} key={item.id}>
          {item.sender_avatar_url ? <img className="chat-avatar" src={item.sender_avatar_url} alt=""/> : <span className="chat-avatar chat-avatar-fallback">{(item.sender_display_name || item.sender_username).slice(0, 1).toUpperCase()}</span>}
          <div className="chat-message-body"><div className="chat-message-meta"><strong>{item.sender_display_name || item.sender_username}</strong><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString(language === 'es' ? 'es-AR' : 'en-US')}</time></div>
            {item.message && <p>{item.message}</p>}{item.attachment_mime_type && <ChatAttachment levelId={levelId} item={item}/>}
          </div>
        </article>;
      })}<div ref={endRef}/>
    </div>
    {error && <p className="level-error" role="alert">{error}</p>}
    {canSend && <form className="level-chat-form" onSubmit={sendMessage}>
      <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} rows={2} placeholder={t.chatPlaceholder} aria-label={t.chatPlaceholder}/>
      <label className="button button-outline chat-attachment-button">{t.chatAttach}<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={(event) => setAttachment(event.target.files?.[0] || null)} hidden/></label>
      {attachment && <span className="chat-attachment-name">{attachment.name}<button type="button" onClick={() => setAttachment(null)} aria-label={t.removeAttachment}>×</button></span>}
      <button className="button button-primary" type="submit" disabled={sending || (!message.trim() && !attachment)}>{sending ? t.chatSending : t.chatSend}</button>
    </form>}
    {canSend ? <p className="chat-upload-help">{t.chatAttachmentHelp}</p> : <p className="chat-upload-help">{t.adminReviewChatReadOnly}</p>}
  </section>;
}

function ChatAttachment({ levelId, item }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let active = true;
    let objectUrl;
    apiBlob(`/levels/${encodeURIComponent(levelId)}/messages/${encodeURIComponent(item.id)}/attachment`).then((blob) => {
      objectUrl = URL.createObjectURL(blob);
      if (active) setUrl(objectUrl);
    }).catch(() => {});
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [levelId, item.id]);
  if (!url) return null;
  return item.attachment_mime_type.startsWith('image/')
    ? <img className="chat-attachment-media" src={url} alt={item.attachment_name || ''}/>
    : <video className="chat-attachment-media" src={url} controls preload="metadata"/>;
}

export function LevelChatPage({ language, user }) {
  const { id } = useParams();
  const t = copy[language];
  return <main className="levels-page"><div className="levels-content">
    <LevelChat levelId={id} language={language} user={user}/>
  </div></main>;
}

function LevelDetailsView({ id, language, user, onRequireLogin, onClose }) {
  const location = useLocation();
  const t = copy[language];
  const [level, setLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applicationError, setApplicationError] = useState('');
  const [applicationNotice, setApplicationNotice] = useState(location.state?.notice || '');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest(`/levels/${encodeURIComponent(id)}`).then((data) => { if (active) setLevel(data.level); })
      .catch((loadError) => { if (active) setError(translateError(loadError.message, language)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, language]);

  async function apply() {
    if (!user) { onRequireLogin(); return; }
    setApplying(true); setApplicationError(''); setApplicationNotice('');
    try {
      const data = await apiRequest(`/levels/${encodeURIComponent(id)}/applications`, { method: 'POST', body: JSON.stringify({}) });
      if (data.application?.status === 'ACCEPTED') {
        setLevel((current) => ({ ...current, status: 'IN_PROGRESS', is_chat_participant: true, accepted_verifier_count: Number(current.accepted_verifier_count || 0) + 1 }));
        setApplicationNotice(t.openApplicationAccepted);
      } else setApplicationNotice(t.applySuccess);
    } catch (applyError) { setApplicationError(translateError(applyError.message, language)); }
    finally { setApplying(false); }
  }

  return <div className="levels-content level-details-content">
    {onClose && <button className="level-details-close" type="button" onClick={onClose} aria-label={t.closeLevelDetails}>×</button>}
    {loading ? <p className="levels-message">{t.loadingLevels}</p> : error ? <p className="levels-message level-error">{error}</p> : level && <article className="level-detail-card">
      <iframe className="level-detail-video" src={youtubeEmbed(level.showcase_url)} title={`${level.name} YouTube`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>
      <div className="level-card-top"><span className="level-mode">{level.game_mode === 'PLATFORMER' ? t.platformerMode : t.classicMode}</span><span className={`level-status status-${level.status.toLowerCase()}`}>{({ VERIFIED: t.statusVerified, IN_PROGRESS: t.statusInProgress, AVAILABLE: t.statusAvailable, REJECTED: t.activityRejected, CANCELLED: t.activityCancelled, PENDING_REVIEW: t.activityReview }[level.status] || level.status)}</span></div>
      <h1><LevelTitle level={level} className="level-detail-title"/></h1><p className="level-detail-difficulty">{t.difficultyTop}{level.difficulty_estimate}</p>
      {level.gd_level_id && <p>{t.gdLevelId}: {level.gd_level_id}</p>}
      {level.open_verification && <p className="open-verification-badge">{t.openVerificationStatus}</p>}
      <p>{t.createdBy} {level.creator_display_name || level.creator_username}{level.status === 'VERIFIED' && level.verified_by?.length > 0 && <span className="verified-by"> · {t.verifiedBy} {level.verified_by.map((verifier) => verifier.display_name || verifier.username).join(', ')}</span>}</p>
      {level.description && <p className="level-detail-description">{level.description}</p>}
      {String(level.creator_id) === String(user?.id) ? <ApplicantManagement level={level} language={language} onLevelUpdate={(changes) => setLevel((current) => ({ ...current, ...changes }))}/> : level.status !== 'VERIFIED' && <div className="level-apply-section"><p className="level-card-requirement"><strong>{t.requiredHardest}:</strong> {level.minimum_hardest_aredl_name || t.noRequirement}</p><button className="button button-primary" type="button" onClick={apply} disabled={applying || level.status !== 'AVAILABLE' || level.applications_open === false}>{applying ? t.savingApplication : level.applications_open === false ? t.applicationsClosed : t.apply}</button>
        {applicationNotice && <p className="level-success" role="status">{applicationNotice}</p>}{applicationError && <p className="level-error" role="alert">{applicationError}</p>}
      </div>}
      {user && level.is_chat_participant && Number(level.accepted_verifier_count) > 0 && <div className="level-chat-action"><Link className="button button-outline level-chat-open-button" to={`/levels/${encodeURIComponent(id)}/chat`}>{t.openLevelChat}</Link></div>}
    </article>}
  </div>;
}

export function LevelDetailsPage({ language, user, onRequireLogin }) {
  const { id } = useParams();
  const navigate = useNavigate();
  return <main className="levels-page"><LevelDetailsView id={id} language={language} user={user} onRequireLogin={onRequireLogin} onClose={() => navigate('/levels')}/></main>;
}

function LevelDetailsModal({ levelId, language, user, onRequireLogin, onClose }) {
  useEffect(() => {
    function closeOnEscape(event) { if (event.key === 'Escape') onClose(); }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);
  return <div className="level-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="level-modal" role="dialog" aria-modal="true" aria-label={copy[language].levelDetails}>
      <LevelDetailsView id={levelId} language={language} user={user} onRequireLogin={onRequireLogin} onClose={onClose}/>
    </section>
  </div>;
}

function ActivityLevelImage({ item, image }) {
  const [privateImage, setPrivateImage] = useState('');
  useEffect(() => {
    if (item.status !== 'CANCELLED' || !item.has_image) { setPrivateImage(''); return undefined; }
    let active = true;
    let objectUrl = '';
    apiBlob(`/levels/${encodeURIComponent(item.id)}/image`).then((blob) => {
      objectUrl = URL.createObjectURL(blob);
      if (active) setPrivateImage(objectUrl);
      else URL.revokeObjectURL(objectUrl);
    }).catch(() => {});
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [item.id, item.status, item.has_image]);
  const src = item.status === 'CANCELLED' && item.has_image ? privateImage : image;
  return src ? <img className="created-level-image" src={src} alt={item.name} loading="lazy"/> : <span className="created-level-image-placeholder" aria-hidden="true"/>;
}

function VerificationSubmissionForm({ item, language, onSubmit, submitting }) {
  const t = copy[language];
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState([]);
  const [verifierId, setVerifierId] = useState('');
  const [publicLevelId, setPublicLevelId] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  async function openForm() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (accepted.length) return;
    setLoading(true); setLoadError('');
    try {
      const data = await apiRequest(`/levels/${encodeURIComponent(item.id)}/applications`);
      const list = (data.applications || []).filter((application) => application.status === 'ACCEPTED');
      setAccepted(list);
      setVerifierId(String(list[0]?.verifier_id || list[0]?.id || ''));
    } catch (error) { setLoadError(translateError(error.message, language)); }
    finally { setLoading(false); }
  }
  async function submit(event) {
    event.preventDefault();
    const success = await onSubmit(item.id, { verifier_id: verifierId, public_level_id: publicLevelId.trim(), video_url: videoUrl.trim() });
    if (success) setOpen(false);
  }
  if (item.verification_pending) return <p className="level-success" role="status">{t.verificationPending}</p>;
  return <div className="verification-submission-control">
    <button className="button button-outline" type="button" onClick={openForm} disabled={submitting}>{open ? t.cancel : t.markVerified}</button>
    {open && <form className="verification-submission-form" onSubmit={submit}>
      {loading ? <p>{t.loading}</p> : <>
        {accepted.length === 0 ? <p className="level-error">{t.noApplicants}</p> : <>
          <label>{t.chooseVerifier}<select value={verifierId} onChange={(event) => setVerifierId(event.target.value)} required>
            {accepted.map((application) => <option key={application.id} value={application.verifier_id}>{application.display_name || application.username}</option>)}
          </select></label>
          <label>{t.publicLevelId}<input value={publicLevelId} onChange={(event) => setPublicLevelId(event.target.value)} inputMode="numeric" pattern="[0-9]{1,30}" maxLength={30} required/></label>
          <label>{t.verificationVideo}<input type="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://youtu.be/..." maxLength={2048} required/></label>
          <button className="button button-primary" type="submit" disabled={submitting}>{submitting ? t.markingVerified : t.submitForReview}</button>
        </>}
      </>}
      {loadError && <p className="level-error" role="alert">{loadError}</p>}
    </form>}
  </div>;
}

function ActivityCard({ item, kind, language, onOpen, onMarkVerified, verifying, verificationError, onCloseApplications, onWithdraw, onRestore, onDelete, actionBusy, actionError }) {
  const t = copy[language];
  const verifiedStatus = kind === 'levels' ? item.status : item.level_status;
  const verifiedBy = verifiedStatus === 'VERIFIED' && Array.isArray(item.verified_by)
    ? item.verified_by.map((verifier) => verifier.display_name || verifier.username).join(', ')
    : '';
  const status = kind === 'levels' ? item.status : item.level_status === 'VERIFIED' ? 'VERIFIED' : item.application_status;
  const statusText = kind === 'levels'
    ? status === 'AVAILABLE' && item.applications_open === false ? t.applicationsClosed : ({ AVAILABLE: t.statusAvailable, IN_PROGRESS: t.statusInProgress, VERIFIED: t.statusVerified, PENDING_REVIEW: t.activityReview, REJECTED: t.activityRejected, CANCELLED: t.activityCancelled }[status] || status)
    : ({ PENDING: t.activityPending, ACCEPTED: t.activityAccepted, REJECTED: t.activityRejected, WITHDRAWN: t.activityWithdrawn, VERIFIED: t.statusVerified }[status] || status);
  const image = item.has_image ? apiUrl(`/levels/${item.id}/image`) : youtubeThumbnail(item.showcase_url);
  if (kind === 'levels') return <article className="created-level-card">
    <a className="created-level-image-link" href={item.showcase_url} aria-label={`${t.openVideo}: ${item.name}`}><ActivityLevelImage item={item} image={image}/></a>
    <div className="created-level-content"><div className="level-card-top"><span className="level-mode">{item.game_mode === 'PLATFORMER' ? t.platformerMode : t.classicMode}</span><span className={`level-status${status === 'CANCELLED' ? ' status-cancelled' : ''}`}>{statusText}</span></div>
      <LevelTitle level={item} language={language} className="level-card-title level-card-open-title" onOpen={onOpen}/>
      <p className="level-card-difficulty">{t.difficultyTop}{item.difficulty_estimate}</p>
      <p>{t.applicationCount}: <strong>{item.application_count}</strong></p>
      <p className="activity-attribution">{t.createdBy} {item.creator_display_name || item.creator_username}{verifiedBy && <span className="verified-by"> · {t.verifiedBy} {verifiedBy}</span>}</p>
      <div className="level-card-actions"><button className="button button-primary" type="button" onClick={onOpen}>{t.levelDetails}</button>
        {item.status === 'IN_PROGRESS' && Number(item.accepted_verifier_count) > 0 && <VerificationSubmissionForm item={item} language={language} onSubmit={onMarkVerified} submitting={verifying}/>}
        {['AVAILABLE', 'IN_PROGRESS'].includes(item.status) && item.applications_open !== false && <button className="button button-outline" type="button" onClick={() => onCloseApplications(item.id)} disabled={actionBusy}>{actionBusy ? t.savingLevelAction : t.closeApplications}</button>}
        {item.status === 'AVAILABLE' && Number(item.accepted_verifier_count) === 0 && <button className="button button-outline level-withdraw-button" type="button" onClick={() => onWithdraw(item.id)} disabled={actionBusy}>{actionBusy ? t.savingLevelAction : t.withdrawLevel}</button>}
        {item.status === 'CANCELLED' && <button className="button button-primary" type="button" onClick={() => onRestore(item.id)} disabled={actionBusy}>{actionBusy ? t.restoringLevel : t.restoreLevel}</button>}
        {item.status === 'CANCELLED' && <button className="button button-outline level-delete-button" type="button" onClick={() => onDelete(item.id)} disabled={actionBusy}>{t.deleteCancelledLevel}</button>}
      </div>
      {verificationError && <p className="level-error" role="alert">{verificationError}</p>}
      {actionError && <p className="level-error" role="alert">{actionError}</p>}
    </div>
  </article>;

  return <article className="verification-entry">
    <a href={item.showcase_url} aria-label={`${t.openVideo}: ${item.name}`}><img className="verification-entry-image" src={image} alt={item.name} loading="lazy"/></a>
    <div className="verification-entry-main"><div className="verification-entry-meta"><span className="level-mode">{item.game_mode === 'PLATFORMER' ? t.platformerMode : t.classicMode}</span><span className="level-status">{statusText}</span></div>
      <LevelTitle level={{ ...item, status: item.level_status }} language={language} className="verification-entry-title" onOpen={onOpen}/>
      <p>{t.createdBy} {item.creator_display_name || item.creator_username}{verifiedBy && <span className="verified-by"> · {t.verifiedBy} {verifiedBy}</span>} · {t.difficultyTop}{item.difficulty_estimate}</p>
      <p>{t.appliedAt}: {new Date(item.applied_at).toLocaleDateString(language === 'es' ? 'es-AR' : 'en-US')}</p>
      <div className="level-card-actions"><button className="button button-primary" type="button" onClick={onOpen}>{t.levelDetails}</button></div>
    </div>
  </article>;
}

export function MyActivityPage({ kind, language, user, onRequireLogin }) {
  const t = copy[language];
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState('');
  const [openLevelId, setOpenLevelId] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);
  const [verificationError, setVerificationError] = useState('');
  const [verificationErrorId, setVerificationErrorId] = useState(null);
  const [activityActionId, setActivityActionId] = useState(null);
  const [activityActionError, setActivityActionError] = useState('');
  const [activityActionErrorId, setActivityActionErrorId] = useState(null);
  const endpoint = kind === 'levels' ? '/levels/mine' : '/levels/applications/mine';
  useEffect(() => {
    let active = true;
    if (user) apiRequest(endpoint).then((data) => { if (active) setItems(kind === 'levels' ? data.levels : data.applications); })
      .catch((loadError) => { if (active) setError(translateError(loadError.message, language)); })
      .finally(() => { if (active) setLoading(false); });
    else setLoading(false);
    return () => { active = false; };
  }, [user, endpoint, kind, language]);
  async function markLevelVerified(levelId, submission) {
    setVerifyingId(String(levelId)); setVerificationError(''); setVerificationErrorId(null);
    try {
      await apiRequest(`/levels/${encodeURIComponent(levelId)}/verification-submissions`, { method: 'POST', body: JSON.stringify(submission) });
      setItems((current) => current.map((item) => String(item.id) === String(levelId) ? { ...item, verification_pending: true } : item));
      return true;
    } catch (verifyError) { setVerificationError(translateError(verifyError.message, language)); setVerificationErrorId(String(levelId)); return false; }
    finally { setVerifyingId(null); }
  }
  async function closeApplications(levelId) {
    if (!window.confirm(t.closeApplicationsConfirm)) return;
    setActivityActionId(String(levelId)); setActivityActionError(''); setActivityActionErrorId(null);
    try {
      await apiRequest(`/levels/${encodeURIComponent(levelId)}/close-applications`, { method: 'PATCH' });
      setItems((current) => current.map((item) => String(item.id) === String(levelId) ? { ...item, applications_open: false } : item));
    } catch (actionError) { setActivityActionError(translateError(actionError.message, language)); setActivityActionErrorId(String(levelId)); }
    finally { setActivityActionId(null); }
  }
  async function withdrawLevel(levelId) {
    if (!window.confirm(t.withdrawConfirm)) return;
    setActivityActionId(String(levelId)); setActivityActionError(''); setActivityActionErrorId(null);
    try {
      await apiRequest(`/levels/${encodeURIComponent(levelId)}/withdraw`, { method: 'PATCH' });
      setItems((current) => current.map((item) => String(item.id) === String(levelId) ? { ...item, status: 'CANCELLED', applications_open: false } : item));
    } catch (actionError) { setActivityActionError(translateError(actionError.message, language)); setActivityActionErrorId(String(levelId)); }
    finally { setActivityActionId(null); }
  }
  async function restoreLevel(levelId) {
    setActivityActionId(String(levelId)); setActivityActionError(''); setActivityActionErrorId(null);
    try {
      await apiRequest(`/levels/${encodeURIComponent(levelId)}/restore`, { method: 'PATCH' });
      setItems((current) => current.map((item) => String(item.id) === String(levelId) ? { ...item, status: 'AVAILABLE', applications_open: true } : item));
    } catch (actionError) { setActivityActionError(translateError(actionError.message, language)); setActivityActionErrorId(String(levelId)); }
    finally { setActivityActionId(null); }
  }
  async function deleteCancelledLevel(levelId) {
    if (!window.confirm(t.deleteCancelledLevelConfirm)) return;
    setActivityActionId(String(levelId)); setActivityActionError(''); setActivityActionErrorId(null);
    try {
      await apiRequest(`/levels/${encodeURIComponent(levelId)}`, { method: 'DELETE' });
      setItems((current) => current.filter((item) => String(item.id) !== String(levelId)));
    } catch (actionError) { setActivityActionError(translateError(actionError.message, language)); setActivityActionErrorId(String(levelId)); }
    finally { setActivityActionId(null); }
  }
  const title = kind === 'levels' ? t.createdLevels : t.accountVerifications;
  return <main className="levels-page"><div className="levels-content">
    <header className="levels-heading"><p className="profile-eyebrow">GD VERIFICATIONS</p><h1>{title}</h1><p>{kind === 'levels' ? t.myLevelsIntro : t.myVerificationsIntro}</p></header>
    {!user ? <section className="levels-login-card"><p>{t.signInToViewActivity}</p><button className="button button-primary" type="button" onClick={onRequireLogin}>{t.login}</button></section>
      : loading ? <p className="levels-message">{t.loadingLevels}</p>
        : error ? <p className="levels-message level-error">{error}</p>
          : items.length === 0 ? <p className="levels-message">{kind === 'levels' ? t.emptyMyLevels : t.emptyMyVerifications}</p>
            : <section className={kind === 'levels' ? 'created-levels-list' : 'verification-entries'}>{items.map((item) => <ActivityCard key={kind === 'levels' ? item.id : item.application_id} item={item} kind={kind} language={language} onOpen={() => setOpenLevelId(item.id)} onMarkVerified={markLevelVerified} verifying={verifyingId === String(item.id)} verificationError={verificationErrorId === String(item.id) ? verificationError : ''} onCloseApplications={closeApplications} onWithdraw={withdrawLevel} onRestore={restoreLevel} onDelete={deleteCancelledLevel} actionBusy={activityActionId === String(item.id)} actionError={activityActionErrorId === String(item.id) ? activityActionError : ''}/>)}</section>}
    {openLevelId && <LevelDetailsModal levelId={openLevelId} language={language} user={user} onRequireLogin={onRequireLogin} onClose={() => setOpenLevelId(null)}/>}
  </div></main>;
}
