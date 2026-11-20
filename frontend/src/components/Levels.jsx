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
  const statusLabel = level.status === 'VERIFIED' ? t.statusVerified : level.status === 'IN_PROGRESS' ? t.statusInProgress : t.statusAvailable;
  return <article className="level-card">
    <a className="level-card-image-link" href={level.showcase_url} aria-label={`${t.openVideo}: ${level.name}`}>
      <img className="level-card-image" src={level.has_image ? apiUrl(`/levels/${level.id}/image`) : youtubeThumbnail(level.showcase_url)} alt={level.name} loading="lazy"/>
    </a>
    <div className="level-card-top"><span className="level-mode">{modeLabel}</span><span className={`level-status status-${level.status.toLowerCase()}`}>{statusLabel}</span></div>
    <button className="level-card-title level-card-open-title" type="button" onClick={onOpen}>{level.name}</button>
    <p className="level-card-difficulty">{t.difficultyTop}{level.difficulty_estimate}</p>
    <p className="level-card-creator">{t.createdBy} {level.creator_display_name || level.creator_username}</p>
    {level.minimum_hardest_aredl_name && <p className="level-card-requirement"><strong>{t.requiredHardest}:</strong> {level.minimum_hardest_aredl_name}</p>}
    <div className="level-card-actions"><button className="button button-primary" type="button" onClick={onOpen}>{t.levelDetails}</button></div>
  </article>;
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
  const [form, setForm] = useState({ name: '', game_mode: 'CLASSIC', difficulty_estimate: '', showcase_url: '', description: '', minimum_hardest_aredl_id: '' });

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
        </header>
        {notice && <p className="level-success" role="status">{notice}</p>}
        {loading ? <p className="levels-message">{t.loadingLevels}</p> : error ? <p className="levels-message level-error">{error}</p> : levels.length === 0 ? <p className="levels-message">{t.emptyLevels}</p> :
          <section className="levels-grid catalog-levels-grid">{levels.map((level) => <LevelCard key={level.id} level={level} language={language} onOpen={() => setOpenLevelId(level.id)}/>)}</section>}
      </>}
    </div>
    {openLevelId && <LevelDetailsModal levelId={openLevelId} language={language} user={user} onRequireLogin={onRequireLogin} onClose={() => setOpenLevelId(null)}/>}
  </main>;
}

function ApplicantManagement({ level, language }) {
  const t = copy[language];
  const [applications, setApplications] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

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
      setNotice(t.applicantsAccepted.replace('{count}', String(selected.length)));
      setSelected([]);
    } catch (acceptError) { setError(translateError(acceptError.message, language)); }
    finally { setSaving(false); }
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

  if (!user) return <p className="levels-message">{t.signInToUseChat}</p>;
  if (loading) return <p className="levels-message">{t.loadingChat}</p>;
  if (!authorized) return <p className="levels-message level-error">{t.chatNotParticipant}</p>;
  return <section className="level-chat" aria-label={t.levelChat}>
    <header className="level-chat-heading"><div><h2>{t.levelChat}</h2><p>{t.levelChatAudience}</p><div className="chat-participants" aria-label={t.chatParticipants}>{participants.map((participant) => <Link className="chat-participant" key={participant.id} to={`/user/${encodeURIComponent(participant.username)}`}>
      {participant.avatar_url ? <img src={participant.avatar_url} alt=""/> : <span>{(participant.display_name || participant.username).slice(0, 1).toUpperCase()}</span>}
      <span>{participant.display_name || participant.username}<small>{participant.participant_role === 'CREATOR' ? t.levelCreator : t.verifierRole}</small></span>
    </Link>)}</div></div></header>
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
    <form className="level-chat-form" onSubmit={sendMessage}>
      <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} rows={2} placeholder={t.chatPlaceholder} aria-label={t.chatPlaceholder}/>
      <label className="button button-outline chat-attachment-button">{t.chatAttach}<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={(event) => setAttachment(event.target.files?.[0] || null)} hidden/></label>
      {attachment && <span className="chat-attachment-name">{attachment.name}<button type="button" onClick={() => setAttachment(null)} aria-label={t.removeAttachment}>×</button></span>}
      <button className="button button-primary" type="submit" disabled={sending || (!message.trim() && !attachment)}>{sending ? t.chatSending : t.chatSend}</button>
    </form>
    <p className="chat-upload-help">{t.chatAttachmentHelp}</p>
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
      await apiRequest(`/levels/${encodeURIComponent(id)}/applications`, { method: 'POST', body: JSON.stringify({}) });
      setApplicationNotice(t.applySuccess);
    } catch (applyError) { setApplicationError(translateError(applyError.message, language)); }
    finally { setApplying(false); }
  }

  return <div className="levels-content level-details-content">
    {onClose && <button className="level-details-close" type="button" onClick={onClose} aria-label={t.closeLevelDetails}>×</button>}
    {loading ? <p className="levels-message">{t.loadingLevels}</p> : error ? <p className="levels-message level-error">{error}</p> : level && <article className="level-detail-card">
      <iframe className="level-detail-video" src={youtubeEmbed(level.showcase_url)} title={`${level.name} YouTube`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>
      <div className="level-card-top"><span className="level-mode">{level.game_mode === 'PLATFORMER' ? t.platformerMode : t.classicMode}</span></div>
      <h1>{level.name}</h1><p className="level-detail-difficulty">{t.difficultyTop}{level.difficulty_estimate}</p>
      <p>{t.createdBy} {level.creator_display_name || level.creator_username}</p>
      {level.description && <p className="level-detail-description">{level.description}</p>}
      <p><strong>{t.requiredHardest}:</strong> {level.minimum_hardest_aredl_name || t.noRequirement}</p>
      {String(level.creator_id) === String(user?.id) ? <ApplicantManagement level={level} language={language}/> : <div className="level-apply-section"><button className="button button-primary" type="button" onClick={apply} disabled={applying || level.status !== 'AVAILABLE'}>{applying ? t.savingApplication : t.apply}</button>
        {applicationNotice && <p className="level-success" role="status">{applicationNotice}</p>}{applicationError && <p className="level-error" role="alert">{applicationError}</p>}
      </div>}
      {user && Number(level.accepted_verifier_count) > 0 && <div className="level-chat-action"><Link className="button button-outline level-chat-open-button" to={`/levels/${encodeURIComponent(id)}/chat`}>{t.openLevelChat}</Link></div>}
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

function ActivityCard({ item, kind, language, onOpen }) {
  const t = copy[language];
  const status = kind === 'levels' ? item.status : item.application_status;
  const statusText = kind === 'levels'
    ? ({ AVAILABLE: t.statusAvailable, IN_PROGRESS: t.statusInProgress, VERIFIED: t.statusVerified, PENDING_REVIEW: t.activityReview, REJECTED: t.activityRejected, CANCELLED: t.activityCancelled }[status] || status)
    : ({ PENDING: t.activityPending, ACCEPTED: t.activityAccepted, REJECTED: t.activityRejected, WITHDRAWN: t.activityWithdrawn }[status] || status);
  const image = item.has_image ? apiUrl(`/levels/${item.id}/image`) : youtubeThumbnail(item.showcase_url);
  if (kind === 'levels') return <article className="created-level-card">
    <a className="created-level-image-link" href={item.showcase_url} aria-label={`${t.openVideo}: ${item.name}`}><img className="created-level-image" src={image} alt={item.name} loading="lazy"/></a>
    <div className="created-level-content"><div className="level-card-top"><span className="level-mode">{item.game_mode === 'PLATFORMER' ? t.platformerMode : t.classicMode}</span><span className="level-status">{statusText}</span></div>
      <button className="level-card-title level-card-open-title" type="button" onClick={onOpen}>{item.name}</button>
      <p className="level-card-difficulty">{t.difficultyTop}{item.difficulty_estimate}</p>
      <p>{t.applicationCount}: <strong>{item.application_count}</strong></p>
      {item.minimum_hardest_aredl_name && <p><strong>{t.requiredHardest}:</strong> {item.minimum_hardest_aredl_name}</p>}
      <div className="level-card-actions"><button className="button button-primary" type="button" onClick={onOpen}>{t.levelDetails}</button></div>
    </div>
  </article>;

  return <article className="verification-entry">
    <a href={item.showcase_url} aria-label={`${t.openVideo}: ${item.name}`}><img className="verification-entry-image" src={image} alt={item.name} loading="lazy"/></a>
    <div className="verification-entry-main"><div className="verification-entry-meta"><span className="level-mode">{item.game_mode === 'PLATFORMER' ? t.platformerMode : t.classicMode}</span><span className="level-status">{statusText}</span></div>
      <button className="verification-entry-title" type="button" onClick={onOpen}>{item.name}</button>
      <p>{t.createdBy} {item.creator_display_name || item.creator_username} · {t.difficultyTop}{item.difficulty_estimate}</p>
      <p>{t.appliedAt}: {new Date(item.applied_at).toLocaleDateString(language === 'es' ? 'es-AR' : 'en-US')}</p>
      {item.minimum_hardest_aredl_name && <p><strong>{t.requiredHardest}:</strong> {item.minimum_hardest_aredl_name}</p>}
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
  const endpoint = kind === 'levels' ? '/levels/mine' : '/levels/applications/mine';
  useEffect(() => {
    let active = true;
    if (user) apiRequest(endpoint).then((data) => { if (active) setItems(kind === 'levels' ? data.levels : data.applications); })
      .catch((loadError) => { if (active) setError(translateError(loadError.message, language)); })
      .finally(() => { if (active) setLoading(false); });
    else setLoading(false);
    return () => { active = false; };
  }, [user, endpoint, kind, language]);
  const title = kind === 'levels' ? t.createdLevels : t.accountVerifications;
  return <main className="levels-page"><div className="levels-content">
    <header className="levels-heading"><p className="profile-eyebrow">GD VERIFICATIONS</p><h1>{title}</h1><p>{kind === 'levels' ? t.myLevelsIntro : t.myVerificationsIntro}</p></header>
    {!user ? <section className="levels-login-card"><p>{t.signInToViewActivity}</p><button className="button button-primary" type="button" onClick={onRequireLogin}>{t.login}</button></section>
      : loading ? <p className="levels-message">{t.loadingLevels}</p>
        : error ? <p className="levels-message level-error">{error}</p>
          : items.length === 0 ? <p className="levels-message">{kind === 'levels' ? t.emptyMyLevels : t.emptyMyVerifications}</p>
            : <section className={kind === 'levels' ? 'created-levels-list' : 'verification-entries'}>{items.map((item) => <ActivityCard key={kind === 'levels' ? item.id : item.application_id} item={item} kind={kind} language={language} onOpen={() => setOpenLevelId(item.id)}/>)}</section>}
    {openLevelId && <LevelDetailsModal levelId={openLevelId} language={language} user={user} onRequireLogin={onRequireLogin} onClose={() => setOpenLevelId(null)}/>}
  </div></main>;
}
