import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { copy, translateError } from '../i18n';
import LanguageSelector from './LanguageSelector';

function LevelsHeader({ language, user, onChangeLanguage }) {
  const t = copy[language];
  return <nav className="levels-navbar">
    <Link className="brand" to="/">GD<span>Verifications</span></Link>
    <div className="levels-nav-actions">
      {user && <Link className="nav-user" to={`/user/${encodeURIComponent(user.username)}`}>{t.profile}</Link>}
      <LanguageSelector language={language} onChange={onChangeLanguage}/>
    </div>
  </nav>;
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

function LevelCard({ level, language }) {
  const t = copy[language];
  const modeLabel = level.game_mode === 'PLATFORMER' ? t.platformerMode : t.classicMode;
  const statusLabel = level.status === 'VERIFIED' ? t.statusVerified : level.status === 'IN_PROGRESS' ? t.statusInProgress : t.statusAvailable;
  return <article className="level-card">
    <div className="level-card-top"><span className="level-mode">{modeLabel}</span><span className={`level-status status-${level.status.toLowerCase()}`}>{statusLabel}</span></div>
    <Link className="level-card-title" to={`/levels/${level.id}`}>{level.name}</Link>
    <p className="level-card-difficulty">{t.difficultyTop} {level.difficulty_estimate}</p>
    <p className="level-card-creator">{t.createdBy} {level.creator_display_name || level.creator_username}</p>
    {level.minimum_hardest_aredl_name && <p className="level-card-requirement"><strong>{t.requiredHardest}:</strong> {level.minimum_hardest_aredl_name}</p>}
    <div className="level-card-actions"><a className="button button-outline" href={level.showcase_url} target="_blank" rel="noreferrer">{t.showVideo}</a>
      <Link className="button button-primary" to={`/levels/${level.id}`}>{t.levelDetails}</Link></div>
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
    <LevelsHeader language={language} user={user} onChangeLanguage={onChangeLanguage}/>
    <div className="levels-content">
      <Link className="levels-back" to="/">{t.backHome}</Link>
      {create ? <>
        <header className="levels-heading"><p className="profile-eyebrow">GD VERIFICATIONS</p><h1>{t.createLevelTitle}</h1><p>{t.createLevelIntro}</p></header>
        {sessionLoading ? <p className="levels-message">{t.loading}</p> : !user ? <section className="levels-login-card"><p>{t.signInToApply}</p><button className="button button-primary" type="button" onClick={onRequireLogin}>{t.login}</button></section> :
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
          <section className="levels-grid">{levels.map((level) => <LevelCard key={level.id} level={level} language={language}/>)}</section>}
      </>}
    </div>
  </main>;
}

export function LevelDetailsPage({ language, user, onRequireLogin, onChangeLanguage }) {
  const { id } = useParams();
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

  return <main className="levels-page"><LevelsHeader language={language} user={user} onChangeLanguage={onChangeLanguage}/><div className="levels-content">
    <Link className="levels-back" to="/levels">← {t.levelsTitle}</Link>
    {loading ? <p className="levels-message">{t.loadingLevels}</p> : error ? <p className="levels-message level-error">{error}</p> : level && <article className="level-detail-card">
      <div className="level-card-top"><span className="level-mode">{level.game_mode === 'PLATFORMER' ? t.platformerMode : t.classicMode}</span></div>
      <h1>{level.name}</h1><p className="level-detail-difficulty">{t.difficultyTop} {level.difficulty_estimate}</p>
      <p>{t.createdBy} {level.creator_display_name || level.creator_username}</p>
      {level.description && <p className="level-detail-description">{level.description}</p>}
      <p><strong>{t.requiredHardest}:</strong> {level.minimum_hardest_aredl_name || t.noRequirement}</p>
      <a className="button button-outline" href={level.showcase_url} target="_blank" rel="noreferrer">{t.showVideo}</a>
      <div className="level-apply-section"><button className="button button-primary" type="button" onClick={apply} disabled={applying || level.status !== 'AVAILABLE'}>{applying ? t.savingApplication : t.apply}</button>
        {applicationNotice && <p className="level-success" role="status">{applicationNotice}</p>}{applicationError && <p className="level-error" role="alert">{applicationError}</p>}
      </div>
    </article>}
  </div></main>;
}
