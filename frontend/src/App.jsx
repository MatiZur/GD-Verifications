import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { apiRequest, getAuthToken, saveAuthToken, clearAuthToken } from './services/api';
import UserProfile from './components/UserProfile';
import LanguageSelector from './components/LanguageSelector';
import { LevelsPage, LevelDetailsPage, MyActivityPage } from './components/Levels';
import { copy, translateError } from './i18n';

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
        <label>{t.email}<input type="email" name="email" placeholder="you@email.com" value={form.email} onChange={onChange} autoComplete="email" required/></label>
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

export default function App() {
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
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!getAuthToken()) { setSessionLoading(false); return; }
    apiRequest('/auth/me').then((data) => setUser(data.user)).catch(() => {
      clearAuthToken(); setUser(null);
    }).finally(() => setSessionLoading(false));
  }, []);

  function openAuth(mode) {
    setAuthMode(mode); setForm({ username: '', email: '', password: '' });
    setFormError(''); setAuthOpen(true);
  }
  function closeAuth() { if (!submitting) { setAuthOpen(false); setFormError(''); } }
  function updateField(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); }

  async function handleAuthSubmit(event) {
    event.preventDefault(); setFormError(''); setSubmitting(true);
    try {
      const isRegister = authMode === 'register';
      const data = await apiRequest(isRegister ? '/auth/register' : '/auth/login', {
        method: 'POST', body: JSON.stringify(isRegister ? form : { email: form.email, password: form.password })
      });
      saveAuthToken(data.token); setUser(data.user); setAuthOpen(false);
      setForm({ username: '', email: '', password: '' });
      setNotice(isRegister ? t.accountCreated : t.loginSuccess);
    } catch (error) { setFormError(translateError(error.message, language)); }
    finally { setSubmitting(false); }
  }
  function logout() { clearAuthToken(); setUser(null); setNotice(t.logoutSuccess); }

  return <Router><div className="app-frame">
    <header className="site-header">
      <Link className="brand" to="/">GD<span>Verifications</span></Link>
      <nav className="site-nav" aria-label={language === 'es' ? 'Navegación principal' : 'Main navigation'}>
        <Link to="/levels">{t.levels}</Link>
        <Link to="/#about">{t.about}</Link>
        {!user && !sessionLoading && <button className="button button-outline" type="button" onClick={() => openAuth('login')}>{t.login}</button>}
        {sessionLoading && <span className="nav-loading">{t.loading}</span>}
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
          {notice && <div className="notice"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label={t.closeNotice}>×</button></div>}
        </section>
        <section className="features" id="about">
          <article className="feature-card"><div className="feature-icon">◇</div><h2>{t.publishLevels}</h2><p>{t.publishText}</p></article>
          <article className="feature-card"><div className="feature-icon">◎</div><h2>{t.findVerifiers}</h2><p>{t.findText}</p></article>
          <article className="feature-card"><div className="feature-icon">✓</div><h2>{t.tracking}</h2><p>{t.trackingText}</p></article>
        </section>
      </main>
    } />
    <Route path="/user/:username" element={<UserProfile language={language} onChangeLanguage={changeLanguage}/>}/>
    <Route path="/levels" element={<LevelsPage language={language} user={user} sessionLoading={sessionLoading} onRequireLogin={() => openAuth('login')} onChangeLanguage={changeLanguage}/>}/>
    <Route path="/levels/new" element={<LevelsPage create language={language} user={user} sessionLoading={sessionLoading} onRequireLogin={() => openAuth('login')} onChangeLanguage={changeLanguage}/>}/>
    <Route path="/levels/:id" element={<LevelDetailsPage language={language} user={user} onRequireLogin={() => openAuth('login')} onChangeLanguage={changeLanguage}/>}/>
    <Route path="/my-levels" element={<MyActivityPage kind="levels" language={language} user={user} onRequireLogin={() => openAuth('login')}/>}/>
    <Route path="/my-verifications" element={<MyActivityPage kind="applications" language={language} user={user} onRequireLogin={() => openAuth('login')}/>}/>
  </Routes>
  <footer className="site-footer"><span>GD Verifications</span><span>{t.footer}</span></footer>
  {authOpen && <AuthModal language={language} authMode={authMode} form={form} formError={formError} submitting={submitting} onClose={closeAuth} onSubmit={handleAuthSubmit} onChange={updateField} onSwitch={() => openAuth(authMode === 'login' ? 'register' : 'login')}/>}
  </div></Router>;
}
