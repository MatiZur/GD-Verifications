import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { apiRequest, getAuthToken, saveAuthToken, clearAuthToken } from './services/api';
import UserProfile from './components/UserProfile';
import LanguageSelector from './components/LanguageSelector';
import { AllLevelsPage, LevelsPage, LevelChatPage, LevelDetailsPage, MyActivityPage, RecentVerifications } from './components/Levels';
import { copy, translateError } from './i18n';

function notificationText(notification, t) {
  const templates = {
    APPLICATION_RECEIVED: t.notificationApplicationReceived,
    APPLICATION_ACCEPTED: t.notificationApplicationAccepted,
    VERIFICATION_ACCEPTED: t.notificationVerificationAccepted,
    CHAT_MESSAGE: t.notificationChatMessage
  };
  return (templates[notification.type] || t.notificationUnknown).replace('{level}', notification.level_name || '');
}

function NotificationBell({ user, language }) {
  const t = copy[language];
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!user) { setNotifications([]); return undefined; }
    let active = true;
    const refresh = () => apiRequest('/notifications').then((data) => { if (active) setNotifications(data.notifications || []); }).catch(() => {});
    refresh();
    const interval = window.setInterval(refresh, 30000);
    return () => { active = false; window.clearInterval(interval); };
  }, [user]);
  async function openNotification(notification) {
    if (!notification.is_read) {
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, is_read: true } : item));
      apiRequest(`/notifications/${encodeURIComponent(notification.id)}/read`, { method: 'PATCH' }).catch(() => {});
    }
    setOpen(false);
    if (notification.related_level_id) {
      const path = notification.type === 'CHAT_MESSAGE'
        ? `/levels/${encodeURIComponent(notification.related_level_id)}/chat`
        : `/levels/${encodeURIComponent(notification.related_level_id)}`;
      navigate(path);
    }
  }
  const unread = notifications.filter((notification) => !notification.is_read).length;
  return <div className="notification-menu">
    <button className="notification-trigger" type="button" aria-label={`${t.notificationsTitle}${unread ? `, ${unread} ${t.notificationUnread}` : ''}`} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>
      {unread > 0 && <span className="notification-count">{unread > 99 ? '99+' : unread}</span>}
    </button>
    {open && <section className="notification-panel" aria-label={t.notificationsTitle}>
      <h2>{t.notificationsTitle}</h2>
      {notifications.length === 0 ? <p className="notification-empty">{t.notificationsEmpty}</p> : <div className="notification-list">{notifications.map((notification) =>
        <button className={`notification-item${notification.is_read ? '' : ' notification-unread'}`} type="button" key={notification.id} onClick={() => openNotification(notification)}>
          <span className="notification-item-message">{notificationText(notification, t)}</span>
          <time dateTime={notification.created_at}>{new Date(notification.created_at).toLocaleString(language === 'es' ? 'es-AR' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}</time>
        </button>
      )}</div>}
    </section>}
  </div>;
}

function AboutPage({ language }) {
  const t = copy[language];
  return <main className="about-page">
    <header className="about-heading"><p className="profile-eyebrow">GD VERIFICATIONS</p><h1>{t.aboutTitle}</h1><p>{t.aboutIntro}</p></header>
    <div className="about-sections">
      <section><span className="about-icon">◇</span><h2>{t.aboutPurposeTitle}</h2><p>{t.aboutPurposeText}</p></section>
      <section><span className="about-icon">◎</span><h2>{t.aboutHowTitle}</h2><p>{t.aboutHowText}</p></section>
      <section><span className="about-icon">✓</span><h2>{t.aboutCommunityTitle}</h2><p>{t.aboutCommunityText}</p></section>
    </div>
    <Link className="button button-primary" to="/levels">{t.aboutBrowse}</Link>
  </main>;
}

function AuthModal({ language, authMode, form, formError, submitting, onClose, onSubmit, onChange, onSwitch }) {
  const t = copy[language];
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button className="modal-close" type="button" onClick={onClose} aria-label={t.closeNotice}>×</button>
      <div className="auth-heading"><div className="auth-logo">GD</div>
        <h2 id="auth-title">{authMode === 'login' ? t.welcome : t.createAccount}</h2>
        <p>{authMode === 'login' ? t.loginCopy : t.registerCopy}</p>
      </div>
      <form className="auth-form" onSubmit={onSubmit}>
        {authMode === 'register' && <label>{t.username}<input type="text" name="username" placeholder={t.usernamePlaceholder} value={form.username} onChange={onChange} minLength={3} maxLength={30} pattern="[a-zA-Z0-9_]+" title={t.usernameTitle} autoComplete="username" required/></label>}
        <label>{authMode === 'login' ? t.username : t.email}<input type={authMode === 'login' ? 'text' : 'email'} name={authMode === 'login' ? 'username' : 'email'} placeholder={authMode === 'login' ? t.usernamePlaceholder : 'you@email.com'} value={authMode === 'login' ? form.username : form.email} onChange={onChange} autoComplete={authMode === 'login' ? 'username' : 'email'} required/></label>
        <label>{t.password}<input type="password" name="password" placeholder={t.passwordPlaceholder} value={form.password} onChange={onChange} minLength={8} maxLength={72} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} required/></label>
        {formError && <div className="form-error" role="alert">{formError}</div>}
        <button className="button button-primary auth-submit" type="submit" disabled={submitting}>{submitting ? t.processing : authMode === 'login' ? t.login : t.createAccount}</button>
      </form>
      <div className="auth-switch">{authMode === 'login' ? t.accountPrompt : t.alreadyAccount}
        <button type="button" onClick={onSwitch}>{authMode === 'login' ? t.register : t.loginAction}</button>
      </div>
    </section>
  </div>;
}

function AppContent() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [language, setLanguage] = useState(() => localStorage.getItem('gd_verifications_language') === 'en' ? 'en' : 'es');
  const t = copy[language];
  useEffect(() => {
    document.documentElement.lang = language;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = language === 'es'
      ? 'GD Verifications - Plataforma comunitaria de verificaciones de Geometry Dash.'
      : 'GD Verifications - A community platform for Geometry Dash verifications.';
  }, [language]);
  const changeLanguage = (next) => {
    localStorage.setItem('gd_verifications_language', next);
    setLanguage(next);
  };
  const [authMode, setAuthMode] = useState('login');
  const [authOpen, setAuthOpen] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice?.id]);

  useEffect(() => {
    if (!getAuthToken()) { setSessionLoading(false); return; }
    apiRequest('/auth/me').then((data) => setUser(data.user)).catch(() => {
      clearAuthToken(); setUser(null);
    }).finally(() => setSessionLoading(false));
  }, []);

  useEffect(() => {
    const closeMenusOutside = (event) => {
      document.querySelectorAll('.account-menu[open], .language-menu[open]').forEach((menu) => {
        if (!menu.contains(event.target)) menu.removeAttribute('open');
      });
    };
    document.addEventListener('pointerdown', closeMenusOutside);
    return () => document.removeEventListener('pointerdown', closeMenusOutside);
  }, []);

  function openAuth(mode) {
    setAuthMode(mode); setForm({ username: '', email: '', password: '' });
    setFormError(''); setAuthOpen(true);
  }
  function closeAuth() { if (!submitting) { setAuthOpen(false); setFormError(''); } }
  function showNotice(message) { setNotice({ id: Date.now(), message }); }
  function updateField(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); }

  async function handleAuthSubmit(event) {
    event.preventDefault(); setFormError(''); setSubmitting(true);
    try {
      const isRegister = authMode === 'register';
      const data = await apiRequest(isRegister ? '/auth/register' : '/auth/login', {
        method: 'POST', body: JSON.stringify(isRegister ? form : { username: form.username, password: form.password })
      });
      saveAuthToken(data.token); setUser(data.user); setAuthOpen(false);
      setForm({ username: '', email: '', password: '' });
      showNotice(isRegister ? t.accountCreated : t.loginSuccess);
    } catch (error) { setFormError(translateError(error.message, language)); }
    finally { setSubmitting(false); }
  }
  function logout() { clearAuthToken(); setUser(null); navigate('/'); showNotice(t.logoutSuccess); }

  return <div className="app-frame">
    <header className="site-header">
      <Link className="brand" to="/">GD<span>Verifications</span></Link>
      <nav className="site-nav" aria-label={language === 'es' ? 'Navegación principal' : 'Main navigation'}>
        <Link to="/levels">{t.levels}</Link>
        <Link to="/about">{t.about}</Link>
        {!user && !sessionLoading && <button className="button button-outline" type="button" onClick={() => openAuth('login')}>{t.login}</button>}
        {sessionLoading && <span className="nav-loading">{t.loading}</span>}
        {user && <NotificationBell user={user} language={language}/>}
        {user && <details className="account-menu">
          <summary className="account-menu-trigger">
            {user.avatar_url ? <img className="account-avatar" src={user.avatar_url} alt=""/> : <span className="account-avatar account-avatar-fallback">{(user.display_name || user.username).slice(0, 1).toUpperCase()}</span>}
            <span className="account-name">{user.display_name || user.username}</span><span className="account-menu-chevron">⌄</span>
          </summary>
          <div className="account-menu-panel">
            <Link to={`/user/${encodeURIComponent(user.username)}`} onClick={(event) => { event.currentTarget.closest('details').open = false; }}>{t.accountProfile}</Link>
            <Link to="/my-verifications" onClick={(event) => { event.currentTarget.closest('details').open = false; }}>{t.accountVerifications}</Link>
            <Link to="/my-levels" onClick={(event) => { event.currentTarget.closest('details').open = false; }}>{t.createdLevels}</Link>
            <button className="account-logout" type="button" onClick={(event) => { event.currentTarget.closest('details').open = false; logout(); }}>{t.logout}</button>
          </div>
        </details>}
        <LanguageSelector language={language} onChange={changeLanguage}/>
      </nav>
    </header>
    <Routes>
    <Route path="/" element={
      <main className="page-shell">
        <section className="hero" id="levels">
          <h1>{t.hero1}<br/><span>{t.hero2}</span></h1>
          <p className="hero-copy">{t.homeCopy}</p>
          <div className="hero-actions">
            <Link className="button button-primary button-large" to="/levels">{t.browse}</Link>
            <Link className="button button-outline button-large" to="/levels/new">{t.publish}</Link>
          </div>
        </section>
        <RecentVerifications language={language} user={user} onRequireLogin={() => openAuth('login')}/>
        <section className="features" id="about">
          <article className="feature-card"><div className="feature-icon">◇</div><h2>{t.publishLevels}</h2><p>{t.publishText}</p></article>
          <article className="feature-card"><div className="feature-icon">◎</div><h2>{t.findVerifiers}</h2><p>{t.findText}</p></article>
          <article className="feature-card"><div className="feature-icon">✓</div><h2>{t.tracking}</h2><p>{t.trackingText}</p></article>
        </section>
      </main>
    } />
    <Route path="/about" element={<AboutPage language={language}/>}/>
    <Route path="/user/:username" element={<UserProfile language={language} onChangeLanguage={changeLanguage}/>}/>
    <Route path="/levels" element={<LevelsPage language={language} user={user} sessionLoading={sessionLoading} onRequireLogin={() => openAuth('login')} onChangeLanguage={changeLanguage}/>}/>
    <Route path="/levels/new" element={<LevelsPage create language={language} user={user} sessionLoading={sessionLoading} onRequireLogin={() => openAuth('login')} onChangeLanguage={changeLanguage}/>}/>
    <Route path="/levels/all" element={<AllLevelsPage language={language} user={user} onRequireLogin={() => openAuth('login')}/>}/>
    <Route path="/levels/:id" element={<LevelDetailsPage language={language} user={user} onRequireLogin={() => openAuth('login')} onChangeLanguage={changeLanguage}/>}/>
    <Route path="/levels/:id/chat" element={<LevelChatPage language={language} user={user}/>}/>
    <Route path="/my-levels" element={<MyActivityPage kind="levels" language={language} user={user} onRequireLogin={() => openAuth('login')}/>}/>
    <Route path="/my-verifications" element={<MyActivityPage kind="applications" language={language} user={user} onRequireLogin={() => openAuth('login')}/>}/>
  </Routes>
  <footer className="site-footer"><span>GD Verifications</span><span>{t.footer}</span></footer>
  {notice && <div className="toast-notice" role="status" key={notice.id}><span>{notice.message}</span><button type="button" onClick={() => setNotice(null)} aria-label={t.closeNotice}>×</button></div>}
  {authOpen && <AuthModal language={language} authMode={authMode} form={form} formError={formError} submitting={submitting} onClose={closeAuth} onSubmit={handleAuthSubmit} onChange={updateField} onSwitch={() => openAuth(authMode === 'login' ? 'register' : 'login')}/>}
  </div>;
}

export default function App() { return <Router><AppContent/></Router>; }
