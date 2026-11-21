import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { copy, translateError } from '../i18n';

function thumbnail(url) {
  const match = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : '';
}

export default function AdminPage({ language, user }) {
  const t = copy[language];
  const [users, setUsers] = useState([]);
  const [levels, setLevels] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [reports, setReports] = useState([]);
  const [banOptions, setBanOptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    if (!['ADMIN', 'OWNER'].includes(user?.role)) { setLoading(false); return undefined; }
    Promise.all([
      apiRequest('/admin/users'), apiRequest('/admin/levels/pending'),
      apiRequest('/admin/verification-submissions/pending'), apiRequest('/admin/chat-reports')
    ])
      .then(([userData, levelData, submissionData, reportData]) => {
        if (!active) return;
        setUsers(userData.users || []);
        setLevels(levelData.levels || []);
        setSubmissions(submissionData.submissions || []);
        setReports(reportData.reports || []);
      })
      .catch((loadError) => { if (active) setError(translateError(loadError.message, language)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, language]);

  async function reviewLevel(levelId, decision) {
    const key = `level-${levelId}`;
    setBusyKey(key); setError(''); setNotice('');
    try {
      await apiRequest(`/admin/levels/${encodeURIComponent(levelId)}/review`, {
        method: 'PATCH', body: JSON.stringify({ decision })
      });
      setLevels((current) => current.filter((level) => String(level.id) !== String(levelId)));
      setNotice(t.adminReviewComplete);
    } catch (actionError) { setError(translateError(actionError.message, language)); }
    finally { setBusyKey(''); }
  }

  async function reviewSubmission(submission, decision) {
    const key = `submission-${submission.id}`;
    setBusyKey(key); setError(''); setNotice('');
    try {
      await apiRequest(`/admin/verification-submissions/${encodeURIComponent(submission.id)}/review`, {
        method: 'PATCH', body: JSON.stringify({ decision })
      });
      setSubmissions((current) => current.filter((entry) => String(entry.id) !== String(submission.id)));
      setNotice(t.adminVerificationReviewed);
    } catch (actionError) { setError(translateError(actionError.message, language)); }
    finally { setBusyKey(''); }
  }

  async function resolveReport(report, decision) {
    const key = `report-${report.id}`;
    const options = banOptions[report.id] || { days: 7, permanent: false };
    setBusyKey(key); setError(''); setNotice('');
    try {
      await apiRequest(`/admin/chat-reports/${encodeURIComponent(report.id)}/resolve`, {
        method: 'PATCH', body: JSON.stringify({ decision, days: decision === 'BAN' ? (options.permanent ? null : Number(options.days)) : null })
      });
      setReports((current) => current.filter((entry) => String(entry.id) !== String(report.id)));
      setNotice(t.adminReportResolved);
    } catch (actionError) { setError(translateError(actionError.message, language)); }
    finally { setBusyKey(''); }
  }

  async function promoteUser(target) {
    if (!window.confirm(`${t.adminPromote}: ${target.display_name || target.username}?`)) return;
    const key = `user-${target.id}`;
    setBusyKey(key); setError(''); setNotice('');
    try {
      const data = await apiRequest(`/admin/users/${encodeURIComponent(target.id)}/promote`, { method: 'PATCH' });
      setUsers((current) => current.map((entry) => String(entry.id) === String(target.id) ? { ...entry, role: data.user.role } : entry));
      setNotice(t.adminPromoted);
    } catch (actionError) { setError(translateError(actionError.message, language)); }
    finally { setBusyKey(''); }
  }

  if (!['ADMIN', 'OWNER'].includes(user?.role)) {
    return <main className="admin-page"><p className="levels-message">{t.adminAccessDenied}</p></main>;
  }

  return <main className="admin-page">
    <header className="levels-heading"><p className="profile-eyebrow">GD VERIFICATIONS</p><h1>{t.adminPanel}</h1><p>{t.adminIntro}</p></header>
    {error && <p className="level-error" role="alert">{error}</p>}
    {notice && <p className="level-success" role="status">{notice}</p>}
    {loading ? <p className="levels-message">{t.loading}</p> : <>
      <section className="admin-section">
        <h2>{t.adminPendingLevels} <span className="admin-count">{levels.length}</span></h2>
        {levels.length === 0 ? <p className="levels-message">{t.adminNoPendingLevels}</p> : <div className="admin-level-list">
          {levels.map((level) => <article className="admin-level-card" key={level.id}>
            {thumbnail(level.showcase_url) && <img src={thumbnail(level.showcase_url)} alt=""/>}
            <div className="admin-level-info">
              <p className="admin-level-meta">{level.game_mode === 'PLATFORMER' ? t.platformerMode : t.classicMode} · {t.difficultyTop}{level.difficulty_estimate}</p>
              <h3><Link to={`/levels/${encodeURIComponent(level.id)}`}>{level.name}</Link></h3>
              <p>{t.adminSubmittedBy} {level.creator_display_name || level.creator_username} · {new Date(level.created_at).toLocaleDateString(language === 'es' ? 'es-AR' : 'en-US')}</p>
              {level.description && <p>{level.description}</p>}
              <div className="level-card-actions">
                <button className="button button-primary" type="button" onClick={() => reviewLevel(level.id, 'APPROVE')} disabled={Boolean(busyKey)}>{busyKey === `level-${level.id}` ? t.adminReviewing : t.adminApprove}</button>
                <button className="button button-outline level-delete-button" type="button" onClick={() => reviewLevel(level.id, 'REJECT')} disabled={Boolean(busyKey)}>{t.adminReject}</button>
              </div>
            </div>
          </article>)}
        </div>}
      </section>
      <section className="admin-section">
        <h2>{t.adminVerificationQueue} <span className="admin-count">{submissions.length}</span></h2>
        {submissions.length === 0 ? <p className="levels-message">{t.adminNoPendingVerifications}</p> : <div className="admin-level-list">
          {submissions.map((submission) => <article className="admin-level-card admin-review-card" key={submission.id}>
            <div className="admin-level-info"><p className="admin-level-meta">{t.adminVerificationFor} {submission.level_name}</p>
              <p>{t.adminSubmittedBy} {submission.verifier_display_name || submission.verifier_username} · {t.adminPublicLevelId}: {submission.public_level_id}</p>
              <p>{t.createdBy} {submission.creator_display_name || submission.creator_username}</p>
              <a href={submission.video_url} target="_blank" rel="noreferrer">{t.adminVerificationVideo}</a>
              <div className="level-card-actions">
                <button className="button button-primary" type="button" onClick={() => reviewSubmission(submission, 'APPROVE')} disabled={Boolean(busyKey)}>{busyKey === `submission-${submission.id}` ? t.adminReviewing : t.adminApprove}</button>
                <button className="button button-outline level-delete-button" type="button" onClick={() => reviewSubmission(submission, 'REJECT')} disabled={Boolean(busyKey)}>{t.adminReject}</button>
              </div>
            </div>
          </article>)}
        </div>}
      </section>
      <section className="admin-section">
        <h2>{t.adminReportQueue} <span className="admin-count">{reports.length}</span></h2>
        {reports.length === 0 ? <p className="levels-message">{t.adminNoReports}</p> : <div className="admin-report-list">
          {reports.map((report) => {
            const options = banOptions[report.id] || { days: 7, permanent: false };
            return <article className="admin-report-card" key={report.id}>
              <div><h3>{report.level_name}</h3><p>{t.reportParticipant}: <strong>{report.reported_display_name || report.reported_username}</strong> · {t.adminSubmittedBy} @{report.reporter_username}</p><p>{report.reason}</p>
                <Link className="button button-outline" to={`/levels/${encodeURIComponent(report.level_id)}/chat`}>{t.adminOpenReportChat}</Link>
              </div>
              <div className="admin-report-actions">
                <label>{t.adminBanDays}<input type="number" min="1" max="3650" value={options.days} disabled={options.permanent || Boolean(busyKey)} onChange={(event) => setBanOptions((current) => ({ ...current, [report.id]: { ...options, days: event.target.value }}))}/></label>
                <label className="admin-permanent-ban"><input type="checkbox" checked={options.permanent} disabled={Boolean(busyKey)} onChange={(event) => setBanOptions((current) => ({ ...current, [report.id]: { ...options, permanent: event.target.checked }}))}/>{t.adminPermanentBan}</label>
                <button className="button button-outline" type="button" onClick={() => resolveReport(report, 'DISMISS')} disabled={Boolean(busyKey)}>{t.adminDismissReport}</button>
                <button className="button button-outline level-delete-button" type="button" onClick={() => resolveReport(report, 'BAN')} disabled={Boolean(busyKey)}>{t.adminBanUser}</button>
              </div>
            </article>;
          })}
        </div>}
      </section>
      <section className="admin-section">
        <h2>{t.adminPlayers} <span className="admin-count">{users.length}</span></h2>
        {users.length === 0 ? <p className="levels-message">{t.adminNoPlayers}</p> : <div className="admin-user-list">
          {users.map((entry) => <article className="admin-user-row" key={entry.id}>
            {entry.avatar_url ? <img src={entry.avatar_url} alt=""/> : <span className="admin-user-avatar">{(entry.display_name || entry.username).slice(0, 1).toUpperCase()}</span>}
            <div className="admin-user-info"><strong>{entry.display_name || entry.username}</strong><span>@{entry.username} · {entry.email}</span></div>
            <span className={`admin-role admin-role-${entry.role.toLowerCase()}`}>{entry.role === 'OWNER' ? t.adminRoleOwner : entry.role === 'ADMIN' ? t.adminRoleAdmin : t.adminRoleUser}</span>
            {entry.banned_at && <span className="admin-ban-label">{t.adminBannedUser}{entry.ban_until ? ` · ${t.adminBanExpires} ${new Date(entry.ban_until).toLocaleDateString(language === 'es' ? 'es-AR' : 'en-US')}` : ` · ${t.adminPermanentBan}`}</span>}
            {user.role === 'OWNER' && entry.role === 'USER' && <button className="button button-outline" type="button" onClick={() => promoteUser(entry)} disabled={Boolean(busyKey)}>{busyKey === `user-${entry.id}` ? t.adminPromoting : t.adminPromote}</button>}
          </article>)}
        </div>}
      </section>
    </>}
  </main>;
}
