export default function LanguageSelector({ language, onChange }) {
  return <details className="language-menu">
    <summary aria-label={language === 'es' ? 'Idioma actual: español' : 'Current language: English'}>
      <span aria-hidden="true">{language === 'es' ? '🇪🇸' : '🇬🇧'}</span>
      <span className="language-menu-chevron" aria-hidden="true">⌄</span>
    </summary>
    <div className="language-menu-options" role="group" aria-label={language === 'es' ? 'Seleccionar idioma' : 'Choose language'}>
      <button type="button" onClick={(event) => { onChange('es'); event.currentTarget.closest('details').open = false; }} aria-current={language === 'es' ? 'true' : undefined}>🇪🇸 Español</button>
      <button type="button" onClick={(event) => { onChange('en'); event.currentTarget.closest('details').open = false; }} aria-current={language === 'en' ? 'true' : undefined}>🇬🇧 English</button>
    </div>
  </details>;
}
