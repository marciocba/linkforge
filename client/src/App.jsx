import { useCallback, useEffect, useState } from 'react';

function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const paths = {
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.07 0l3-3A5 5 0 0 0 13 2.93l-1.72 1.72" /><path d="M14 11a5 5 0 0 0-7.07 0l-3 3A5 5 0 0 0 11 21.07l1.72-1.72" /></>,
    copy: <><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-5 5" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18m0-18a15 15 0 0 0 0 18" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z" /><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function timeAgo(value) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function App() {
  const [url, setUrl] = useState('');
  const [links, setLinks] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [apiReady, setApiReady] = useState(false);

  const refreshLinks = useCallback(async () => {
    try {
      const response = await fetch('/api/links');
      if (!response.ok) throw new Error('Could not load links');
      const data = await response.json();
      setLinks(Array.isArray(data.links) ? data.links : []);
      setApiReady(true);
    } catch {
      setApiReady(false);
    }
  }, []);

  useEffect(() => { refreshLinks(); }, [refreshLinks]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.message || 'We couldn’t shorten that link. Check the URL and try again.');
      setResult(data.link);
      setUrl('');
      await refreshLinks();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function copyLink(link) {
    try {
      await navigator.clipboard.writeText(link.shortUrl);
      setCopied(link.code);
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      setError('Clipboard access is unavailable. Select and copy the link instead.');
    }
  }

  const totalClicks = links.reduce((sum, link) => sum + (Number(link.clicks) || 0), 0);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="LinkForge home">
          <span className="brand-mark"><Icon name="link" size={18} /></span>
          <span>linkforge<span className="brand-period">.</span></span>
        </a>
        <div className="topbar-right">
          <span className={`service-status ${apiReady ? 'online' : ''}`}><i />{apiReady ? 'All systems up' : 'Connecting'}</span>
          <a className="github-link" href="https://github.com/marciocba/linkforge" target="_blank" rel="noreferrer">GitHub <Icon name="arrow" size={14} /></a>
        </div>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="eyebrow"><span className="eyebrow-line" /> YOUR LINKS, REIMAGINED</div>
          <h1 id="hero-title">Make every link<br /><span>count.</span></h1>
          <p className="hero-copy">Shorten, share, and keep track of the links<br className="desktop-break" /> that take you places.</p>

          <div className="shortener-card">
            <form onSubmit={handleSubmit}>
              <label className="input-label" htmlFor="long-url">PASTE YOUR LONG URL</label>
              <div className="input-row">
                <Icon name="link" size={20} />
                <input id="long-url" type="url" inputMode="url" placeholder="https://your-very-long-link.com/..." value={url} onChange={(event) => setUrl(event.target.value)} required aria-describedby={error ? 'form-error' : undefined} />
                <button className="shorten-button" type="submit" disabled={loading || !url.trim()}>{loading ? <><span className="spinner" /> Shortening</> : <>Shorten link <Icon name="arrow" size={16} /></>}</button>
              </div>
              {error && <p className="form-error" id="form-error" role="alert">{error}</p>}
            </form>
            {result && <div className="result-panel" aria-live="polite">
              <div className="result-icon"><Icon name="check" size={19} /></div>
              <div className="result-content"><span className="result-label">YOUR SHORT LINK IS READY</span><a href={result.shortUrl} target="_blank" rel="noreferrer">{result.shortUrl}</a></div>
              <button className="copy-button" onClick={() => copyLink(result)}><Icon name={copied === result.code ? 'check' : 'copy'} size={16} />{copied === result.code ? 'Copied' : 'Copy'}</button>
            </div>}
            <div className="card-foot"><span><Icon name="spark" size={14} /> Free forever. No sign-up needed.</span><span>Fast, simple, yours.</span></div>
          </div>
          <div className="trust-row"><span className="trust-dot" /> Clean links. Clear insights. Zero fuss.</div>
        </section>

        <section className="recent-section" aria-labelledby="recent-title">
          <div className="section-heading">
            <div><div className="eyebrow small-eyebrow">YOUR LINK LIBRARY</div><h2 id="recent-title">Recent links <span className="count-pill">{links.length}</span></h2></div>
            <button className="refresh-button" onClick={refreshLinks} aria-label="Refresh recent links"><span>↻</span> Refresh</button>
          </div>
          {links.length > 0 ? <div className="links-table">
            <div className="table-head"><span>SHORT LINK</span><span>DESTINATION</span><span>CREATED</span><span>CLICKS</span><span /></div>
            {links.map((link) => <article className="link-row" key={link.code}>
              <div className="short-cell"><span className="link-favicon"><Icon name="link" size={14} /></span><a href={link.shortUrl} target="_blank" rel="noreferrer">{link.shortUrl}</a></div>
              <a className="destination-cell" href={link.originalUrl} target="_blank" rel="noreferrer" title={link.originalUrl}>{link.originalUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}<Icon name="arrow" size={12} /></a>
              <span className="created-cell"><Icon name="clock" size={14} />{timeAgo(link.createdAt)}</span>
              <span className="click-cell"><Icon name="chart" size={14} />{link.clicks}</span>
              <button className="row-copy" onClick={() => copyLink(link)} aria-label={`Copy ${link.shortUrl}`} title={copied === link.code ? 'Copied!' : 'Copy link'}><Icon name={copied === link.code ? 'check' : 'copy'} size={16} /></button>
            </article>)}
            <div className="table-foot"><span>Showing {links.length} {links.length === 1 ? 'link' : 'links'}</span><span>{totalClicks} total clicks <Icon name="chart" size={13} /></span></div>
          </div> : <div className="empty-state"><div className="empty-icon"><Icon name="globe" size={22} /></div><h3>{apiReady ? 'Your next great link starts here' : 'Waiting for your link library'}</h3><p>{apiReady ? 'Shorten a URL above and it’ll show up here.' : 'Start the Express API to see your recent links.'}</p></div>}
        </section>
      </main>
      <footer className="footer"><a className="brand footer-brand" href="#top"><span className="brand-mark"><Icon name="link" size={15} /></span><span>linkforge<span className="brand-period">.</span></span></a><span>Made for the links worth sharing.</span><span>© 2026 LinkForge</span></footer>
    </div>
  );
}

export default App;
