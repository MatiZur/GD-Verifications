import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest, getAuthToken } from '../services/api';
import { copy, translateError } from '../i18n';
import { countryCodeFromStored, countryLabel, getCountries } from '../utils/countries';
import LanguageSelector from './LanguageSelector';

const emptyPassword = { current_password: '', new_password: '' };

function profileForm(user) {
  return {
    display_name: user.display_name || '', pronouns: user.pronouns || '', country: countryCodeFromStored(user.country),
    gd_username: user.gd_username || '', hardest_classic_aredl_id: user.hardest_classic_aredl_id || '',
    hardest_platformer_aredl_id: user.hardest_platformer_aredl_id || '', avatar_url: user.avatar_url || '',
    bio: user.bio || '', youtube_url: user.youtube_url || '', discord_username: user.discord_username || '', ...emptyPassword
  };
}

function HardestPicker({ label, levels = [], value, selectedName, onChange, t }) {
  const [query, setQuery] = useState(selectedName || '');
  const [open, setOpen] = useState(false);
  const selected = levels.find((level) => level.id === value);
  const search = query.trim().toLowerCase();
  const matches = (search ? levels.filter((level) => level.name.toLowerCase().includes(search)) : levels).slice(0, 12);
  useEffect(() => { if (selected) setQuery(selected.name); }, [selected?.name]);
  return <div className="profile-form-field profile-hardest-picker" onBlur={() => setTimeout(() => setOpen(false), 120)}>
    <label>{label}</label>
    <input role="combobox" aria-autocomplete="list" aria-expanded={open} aria-label={label} value={query}
      onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); if (value) onChange(''); setOpen(true); }}
      placeholder={t.searchLevel} autoComplete="off"/>
    {open && <div className="profile-hardest-options" role="listbox" aria-label={label}>
      <button className="profile-hardest-option profile-hardest-clear" type="button" role="option" aria-selected={!value}
        onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(''); setQuery(''); setOpen(false); }}>{t.noHardest}</button>
      {matches.map((level) => <button className="profile-hardest-option" type="button" role="option" aria-selected={level.id === value} key={level.id}
        onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(level.id); setQuery(level.name); setOpen(false); }}>
        <span>{level.name}</span><small>{level.position ? `#${level.position}` : level.status}</small>
      </button>)}
      {matches.length === 0 && <p className="profile-hardest-empty">{t.noMatches}</p>}
    </div>}
  </div>;
}

async function prepareAvatar(file, t) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error(t.avatarType);
  if (file.size > 8 * 1024 * 1024) throw new Error(t.avatarOriginal);
  const image = await createImageBitmap(file);
  const scale = Math.min(1, 512 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height); image.close();
  const blob = await new Promise((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error(t.avatarProcess)), 'image/webp', 0.82));
  if (blob.size > 1024 * 1024) throw new Error(t.avatarOptimized);
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error(t.avatarRead)); reader.readAsDataURL(blob);
  });
}

function ProfileField({ label, value, href, emptyText }) {
  return <div className="profile-detail"><span className="profile-detail-label">{label}</span>
    {value ? (href ? <a href={href} target="_blank" rel="noreferrer">{value}</a> : <strong>{value}</strong>) : <span className="profile-empty">{emptyText}</span>}
  </div>;
}

export default function UserProfile({ language, onChangeLanguage }) {
  const { username } = useParams();
  const t = copy[language];
  const countries = useMemo(() => getCountries(language), [language]);
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [isOwner, setIsOwner] = useState(false); const [editing, setEditing] = useState(false); const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(''); const [formError, setFormError] = useState(''); const [form, setForm] = useState(null);
  const [classicLevels, setClassicLevels] = useState([]); const [platformerLevels, setPlatformerLevels] = useState([]);
  const [aredlError, setAredlError] = useState(''); const [avatarProcessing, setAvatarProcessing] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      setLoading(true); setError('');
      try {
        const data = await apiRequest(`/users/${encodeURIComponent(username)}`);
        if (!active) return; setUser(data.user);
        if (getAuthToken()) {
          try { const current = await apiRequest('/auth/me'); if (active) setIsOwner(current.user.username.toLowerCase() === username.toLowerCase()); }
          catch { if (active) setIsOwner(false); }
        } else if (active) setIsOwner(false);
      } catch (loadError) { if (active) setError(translateError(loadError.message, language)); }
      finally { if (active) setLoading(false); }
    }
    loadProfile(); return () => { active = false; };
  }, [username, language]);

  async function startEditing() {
    setForm(profileForm(user)); setFormError(''); setNotice(''); setEditing(true);
    if (classicLevels.length || platformerLevels.length) return;
    setAredlError('');
    try {
      const data = await apiRequest('/users/aredl/extremes');
      if (!Array.isArray(data.classic) || !Array.isArray(data.platformer)) throw new Error(t.noAredl);
      setClassicLevels(data.classic); setPlatformerLevels(data.platformer);
    } catch (loadError) { setAredlError(translateError(loadError.message, language)); }
  }
  function cancelEditing() { if (!saving) { setEditing(false); setFormError(''); setAredlError(''); } }
  function updateField(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); }
  async function handleAvatarChange(event) {
    const file = event.target.files?.[0]; if (!file) return;
    setAvatarProcessing(true); setFormError('');
    try { const avatarUrl = await prepareAvatar(file, t); setForm((current) => ({ ...current, avatar_url: avatarUrl })); }
    catch (uploadError) { setFormError(uploadError.message); }
    finally { setAvatarProcessing(false); event.target.value = ''; }
  }
  async function saveProfile(event) {
    event.preventDefault(); setSaving(true); setFormError(''); setNotice('');
    const updates = {
      display_name: form.display_name, pronouns: form.pronouns, country: form.country, gd_username: form.gd_username,
      hardest_classic_aredl_id: form.hardest_classic_aredl_id, hardest_platformer_aredl_id: form.hardest_platformer_aredl_id,
      avatar_url: form.avatar_url, bio: form.bio, youtube_url: form.youtube_url, discord_username: form.discord_username
    };
    if (form.new_password) { updates.current_password = form.current_password; updates.new_password = form.new_password; }
    try {
      const data = await apiRequest('/users/me/profile', { method: 'PATCH', body: JSON.stringify(updates) });
      setUser(data.user); setForm(profileForm(data.user)); setEditing(false);
      setNotice(form.new_password ? t.profilePasswordSaved : t.profileSaved);
    } catch (saveError) { setFormError(translateError(saveError.message, language)); }
    finally { setSaving(false); }
  }

  if (loading) return <main className="profile-page"><p className="profile-state">{t.loadingProfile}</p></main>;
  if (error) return <main className="profile-page"><p className="profile-state profile-state-error">{error}</p></main>;
  if (!user) return <main className="profile-page"><p className="profile-state">{t.notFound}</p></main>;
  const displayName = user.display_name || user.username;
  const date = new Intl.DateTimeFormat(language === 'es' ? 'es-AR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(user.created_at));
  const identity = [user.pronouns, countryLabel(user.country, language)].filter(Boolean).join(' · ');

  return <main className="profile-page">
    <div className="profile-topbar"><Link className="profile-back" to="/">← GD Verifications</Link>
      <div className="profile-topbar-actions"><LanguageSelector language={language} onChange={onChangeLanguage}/>
        {isOwner && !editing && <button className="button button-primary" type="button" onClick={startEditing}>{t.edit}</button>}
      </div>
    </div>
    {notice && <div className="profile-notice" role="status">{notice}</div>}
    <section className="profile-card"><header className="profile-header">
      {user.avatar_url ? <img className="profile-avatar" src={user.avatar_url} alt={language === 'es' ? `Foto de ${displayName}` : `${displayName}'s profile picture`}/> :
        <div className="profile-avatar profile-avatar-fallback" aria-label={language === 'es' ? 'Sin foto de perfil' : 'No profile picture'}>{displayName.slice(0, 1).toUpperCase()}</div>}
      <div className="profile-heading"><p className="profile-eyebrow">{t.playerProfile}</p><h1>{displayName}</h1>
        {identity && <p className="profile-identity">{identity}</p>}
        <p className="profile-account">@{user.username} · {t.memberSince} {date}</p>
      </div>
    </header>
    {editing ? <form className="profile-edit-form" onSubmit={saveProfile}><div className="profile-form-grid">
      <label className="profile-form-field">{t.name}<input name="display_name" value={form.display_name} onChange={updateField} maxLength={50} placeholder={t.name}/></label>
      <label className="profile-form-field">{t.pronouns}<input name="pronouns" value={form.pronouns} onChange={updateField} maxLength={40}/></label>
      <label className="profile-form-field">{t.country}<select name="country" value={form.country} onChange={updateField}>
        <option value="">{t.countryChoose}</option>
        {countries.map((country) => <option key={country.code} value={country.code}>{country.flag} {country.name}</option>)}
      </select></label>
      <label className="profile-form-field">{t.gdUsername}<input name="gd_username" value={form.gd_username} onChange={updateField} maxLength={50} placeholder={t.gdUsername}/></label>
      <div className="profile-form-field profile-form-wide"><span>{t.avatar}</span><div className="profile-avatar-upload">
        {form.avatar_url ? <img src={form.avatar_url} alt={language === 'es' ? 'Vista previa del avatar' : 'Avatar preview'}/> : <span className="profile-avatar-upload-empty">{t.noPhoto}</span>}
        <div><label className="button button-outline profile-file-button">{avatarProcessing ? t.processingImage : t.chooseImage}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} disabled={avatarProcessing}/></label>
          {form.avatar_url && <button className="profile-remove-avatar" type="button" onClick={() => setForm((current) => ({ ...current, avatar_url: '' }))}>{t.removePhoto}</button>}<span className="profile-help">{t.imageHelp}</span>
        </div></div></div>
      <HardestPicker label={t.classic} levels={classicLevels} value={form.hardest_classic_aredl_id} selectedName={user.hardest_classic_aredl_name} onChange={(value) => setForm((current) => ({ ...current, hardest_classic_aredl_id: value }))} t={t}/>
      <HardestPicker label={t.platformer} levels={platformerLevels} value={form.hardest_platformer_aredl_id} selectedName={user.hardest_platformer_aredl_name} onChange={(value) => setForm((current) => ({ ...current, hardest_platformer_aredl_id: value }))} t={t}/>
      {aredlError && <p className="profile-form-error profile-form-wide" role="alert">{aredlError}</p>}
      <label className="profile-form-field profile-form-wide">{t.bio}<textarea name="bio" value={form.bio} onChange={updateField} maxLength={500} rows={4} placeholder={t.bioPlaceholder}/><span className="profile-help">{form.bio.length}/500</span></label>
      <label className="profile-form-field">{t.youtube}<input type="url" name="youtube_url" value={form.youtube_url} onChange={updateField} maxLength={2048} placeholder="https://youtube.com/@..."/></label>
      <label className="profile-form-field">{t.discord}<input name="discord_username" value={form.discord_username} onChange={updateField} maxLength={32} placeholder="username"/></label>
    </div>
      <section className="profile-password-section"><h2>{t.changePassword}</h2><p>{t.passwordHelp}</p><div className="profile-form-grid">
        <label className="profile-form-field">{t.currentPassword}<input type="password" name="current_password" value={form.current_password} onChange={updateField} autoComplete="current-password"/></label>
        <label className="profile-form-field">{t.newPassword}<input type="password" name="new_password" value={form.new_password} onChange={updateField} minLength={8} maxLength={72} autoComplete="new-password" placeholder={t.minPassword}/></label>
      </div></section>
      {formError && <p className="profile-form-error" role="alert">{formError}</p>}
      <div className="profile-form-actions"><button className="button button-outline" type="button" onClick={cancelEditing} disabled={saving}>{t.cancel}</button><button className="button button-primary" type="submit" disabled={saving || avatarProcessing}>{saving ? t.saving : t.save}</button></div>
    </form> : <div className="profile-details">
      <ProfileField label={t.classic} value={user.hardest_classic_aredl_name} href={user.hardest_classic_aredl_id ? `https://aredl.net/list/${user.hardest_classic_aredl_id}` : undefined} emptyText={t.noHardestYet}/>
      <ProfileField label={t.platformer} value={user.hardest_platformer_aredl_name} href={user.hardest_platformer_aredl_id ? `https://aredl.net/list/${user.hardest_platformer_aredl_id}?list=platformer` : undefined} emptyText={t.noHardestYet}/>
      <ProfileField label={t.gdUsername} value={user.gd_username} href={user.gd_username ? `https://gdbrowser.com/u/${encodeURIComponent(user.gd_username)}` : undefined} emptyText={t.unspecified}/>
      <ProfileField label={t.youtube} value={user.youtube_url} href={user.youtube_url} emptyText={t.unspecified}/>
      <ProfileField label={t.discord} value={user.discord_username} emptyText={t.unspecified}/>
      <section className="profile-description"><h2>{t.bio}</h2><p>{user.bio || <span className="profile-empty">{t.noBio}</span>}</p></section>
    </div>}
    </section>
  </main>;
}
