import { useState, useEffect, createContext, useContext, useRef } from 'react'
import { translations } from './utils/translations'
import { API_BASE_URL, HEALTH_URL, USE_SIMULATION } from './utils/constants'

// ================== السياقات ==================
const LanguageContext = createContext();
const ThemeContext = createContext();
const AuthContext = createContext();

const useLanguage = () => useContext(LanguageContext);
const useTheme = () => useContext(ThemeContext);
const useAuth = () => useContext(AuthContext);

// ================== مؤشر الاتصال ==================
function useConnectivity(accessToken) {
  const { language } = useLanguage();
  const [status, setStatus] = useState('offline');
  const timerRef = useRef(null);

  const pingServer = async () => {
    if (!navigator.onLine) { setStatus('offline'); return; }
    try {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 4000);
      const res = await fetch(`${HEALTH_URL}`, { signal: ctl.signal });
      clearTimeout(to);
      setStatus(res.ok ? 'online' : 'net_only');
    } catch (e) {
      setStatus('net_only');
    }
  };

  useEffect(() => {
    pingServer();
    timerRef.current = setInterval(pingServer, 10000); // كل 10 ثوانٍ
    const onOn = () => pingServer();
    const onOff = () => setStatus('offline');
    window.addEventListener('online', onOn);
    window.addEventListener('offline', onOff);
    return () => { clearInterval(timerRef.current); window.removeEventListener('online', onOn); window.removeEventListener('offline', onOff); };
  }, [accessToken, language]);

  return status; // 'online' | 'net_only' | 'offline'
}

function ConnectionBadge() {
  const { t } = useLanguage();
  const { accessToken } = useAuth();
  const status = useConnectivity(accessToken);
  const map = {
    online: ['bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', 'bg-emerald-500', t.conn_online],
    net_only: ['bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300', 'bg-amber-500', t.conn_net_only],
    offline: ['bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300', 'bg-rose-500', t.conn_offline]
  };
  const [cls, dot, label] = map[status] || map.offline;
  return (
    <div className={`flex items-center px-3 py-1 rounded-xl text-sm font-medium ${cls}`}>
      <span className={`inline-block w-2.5 h-2.5 rounded-full ml-2 ${dot}`}></span>
      {label}
    </div>
  );
}

// ================== مزود المصادقة ==================
function AuthProvider({ children }) {
  const { language, t } = useLanguage();

  // ✅ تحسين: تخزين التوكن في sessionStorage مع تشفير بسيط
  const [accessToken, setAccessToken] = useState(() => {
    const stored = sessionStorage.getItem('crm_token');
    if (stored) {
      try {
        return atob(stored); // فك التشفير البسيط
      } catch (e) {
        sessionStorage.removeItem('crm_token');
        return null;
      }
    }
    return null;
  });

  const login = (tk) => {
    setAccessToken(tk);
    // ✅ تحسين: حفظ التوكن مشفراً
    sessionStorage.setItem('crm_token', btoa(tk));
  };

  const logout = () => {
    setAccessToken(null);
    sessionStorage.removeItem('crm_token');
  };

  const refreshToken = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/refresh-token`, { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      if (res.ok && data.success) {
        const newToken = data.data.access_token;
        setAccessToken(newToken);
        sessionStorage.setItem('crm_token', btoa(newToken));
        return newToken;
      }
      throw new Error(t.tokenRefreshError);
    } catch (e) {
      throw new Error(t.tokenRefreshError);
    }
  };

  const apiFetch = async (endpoint, options = {}, isRetry = false) => {
    if (USE_SIMULATION) { return { success: true, data: [] }; }
    const headers = { ...(options.headers || {}), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) };
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    if (res.status === 401 && !isRetry) {
      try {
        const newTk = await refreshToken();
        return apiFetch(endpoint, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${newTk}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}) } }, true);
      } catch (err) {
        logout();
        throw { [language]: t.sessionExpiredMessage, ar: t.sessionExpiredMessage, en: t.sessionExpiredMessage, ku: t.sessionExpiredMessage };
      }
    }
    if (!res.ok && res.status !== 204) {
      const ed = await res.json().catch(() => ({}));
      throw ed.message || { [language]: t.genericError };
    }
    if (res.status === 204) return { success: true, noContent: true, data: [] };
    return res.json();
  };

  return <AuthContext.Provider value={{ accessToken, login, logout, apiFetch }}>{children}</AuthContext.Provider>;
}

// ================== الواجهة: عناصر مشتركة ==================
function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const langs = [["ar", "العربية"], ["en", "English"], ["ku", "کوردی"]];
  return (
    <div className="flex items-center gap-2" dir="ltr">
      {langs.map(([code, name]) => (
        <button key={code} onClick={() => setLanguage(code)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${language === code ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>{name}</button>
      ))}
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200" dir="ltr">
      {theme === 'light' ? 'داكن' : 'فاتح'}
    </button>
  );
}

function Header() {
  const { t } = useLanguage();
  const { logout, accessToken } = useAuth();
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg md:text-xl font-bold text-blue-700 dark:text-blue-400">{t.appTitle}</h1>
          <ConnectionBadge />
        </div>
        <div className="flex items-center gap-2" dir="ltr">
          <LanguageSelector />
          <ThemeToggle />
          {accessToken && (
            <button onClick={logout} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300">{t.logout}</button>
          )}
        </div>
      </div>
    </header>
  );
}

// ================== شاشات الواجهة ==================
function LoginScreen() {
  const { t, language } = useLanguage();
  const { login } = useAuth();
  const [u, setU] = useState(''); const [p, setP] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(null);

  const doLogin = async (e) => {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      if (USE_SIMULATION) { login('fake-token'); setBusy(false); return; }
      const basic = btoa(`${u}:${p}`);
      const res = await fetch(`${API_BASE_URL}/crm-user-auth-v2`, { method: 'GET', headers: { Authorization: `Basic ${basic}` } });
      const data = await res.json();
      if (res.ok && data.success) { login(data.data.access_token); }
      else setError(data.message || { [language]: t.genericError });
    } catch (e) { setError({ [language]: t.networkError }); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <Header />
        {error && (<div className="mt-4 mb-3 text-sm rounded-lg p-3 bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"><b>{t.authError}:</b> {error[language] || t.genericError}</div>)}
        <form onSubmit={doLogin} className="space-y-3 mt-2">
          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">{t.username}</label>
            <input value={u} onChange={e => setU(e.target.value)} dir="ltr" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" required />
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">{t.password}</label>
            <input type="password" value={p} onChange={e => setP(e.target.value)} dir="ltr" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" required />
          </div>
          <button disabled={busy} className={`w-full rounded-lg px-4 py-2 font-bold text-white ${busy ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}>{busy ? t.loggingIn : t.login}</button>
        </form>
      </div>
    </div>
  );
}

function SearchScreen({ onNavigateToDetails }) {
  const { t } = useLanguage();
  const { apiFetch } = useAuth();
  const [form, setForm] = useState({ n1: '', n2: '', n3: '', n4: '', sn: '', mom: '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState(null);
  const [rows, setRows] = useState(null);

  const submit = async (e) => {
    e.preventDefault(); setError(null); setBusy(true); setRows(null);
    try {
      const payload = { '1_name': form.n1, '2_name': form.n2, '3_name': form.n3, '4_name': form.n4, 's_name': form.sn, 'mother': form.mom, reason: 'جنائي' };
      const data = await apiFetch('/wanted/search', { method: 'POST', body: JSON.stringify(payload) });
      if (data.noContent) { setRows([]); }
      else if (data.success) { setRows(data.data || []); }
    } catch (err) { setError(err); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto p-4 md:p-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">{t.searchTitle}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{t.searchHint}</p>
          {error && (<div className="mb-3 text-sm rounded-lg p-3 bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">{error.ar || error.en || error.ku || t.genericError}</div>)}
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {['n1', 'n2', 'n3', 'n4', 'sn', 'mom'].map((k, i) => (
              <div key={k} className="flex flex-col">
                <label className="text-sm mb-1 text-gray-700 dark:text-gray-300">{[t.n1, t.n2, t.n3, t.n4, t.sn, t.mom][i]}</label>
                <input value={form[k]} onChange={e => setForm(s => ({ ...s, [k]: e.target.value }))} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
              </div>
            ))}
            <div className="md:col-span-3 flex justify-end">
              <button disabled={busy} className={`min-w-[140px] rounded-lg px-4 py-2 font-bold text-white ${busy ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}>{busy ? t.searching : t.doSearch}</button>
            </div>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 mt-4 min-h-[160px] flex items-center justify-center">
          {busy && <div className="text-gray-600 dark:text-gray-300">{t.searching}</div>}
          {!busy && error && <div className="text-rose-600 dark:text-rose-400">{error.ar || error.en || error.ku || t.genericError}</div>}
          {!busy && !error && rows && rows.length === 0 && <div className="text-gray-600 dark:text-gray-300">{t.noResults}</div>}
          {!busy && !error && rows && rows.length > 0 && (
            <div className="w-full overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {[t.fullName, t.motherName, t.birthYear, t.nationality].map(h => (
                      <th key={h} className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                  {rows.map(row => (
                    <tr key={row.SOURCE_ID} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => onNavigateToDetails(row.SOURCE_ID)}>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{row.REAL_FULLNAME}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.REAL_MOTHER_NAME}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.BIRTH_YEAR}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{row.NATIONALTY}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function DetailsCard({ icon, title, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 mb-6">
      <div className="flex items-center mb-4 gap-2">
        {icon}
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
      </div>
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-2">
      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="col-span-2 text-sm text-gray-900 dark:text-gray-100">{value || 'N/A'}</dd>
    </div>
  );
}

function DetailsTable({ headers, rows }) {
  const { t } = useLanguage();
  if (!rows || rows.length === 0) return <p className="text-sm text-gray-500 dark:text-gray-400">{t.noResults}</p>;
  return (
    <div className="w-full overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>{headers.map(h => (<th key={h} className="px-4 py-3 text-center text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">{h}</th>))}</tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              {row.map((cell, j) => (<td key={j} className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{cell || 'N/A'}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AttachmentList({ files, attachmentsData, onFetch }) {
  const { t } = useLanguage();
  if (!files || files.length === 0) return <p className="text-sm text-gray-500 dark:text-gray-400">{t.noResults}</p>;
  return (
    <ul className="space-y-3">
      {files.map(filename => {
        const attachment = attachmentsData[filename];
        return (
          <li key={filename} className="flex flex-col md:flex-row items-start md:items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="font-mono text-sm text-gray-700 dark:text-gray-300 mb-2 md:mb-0 break-all">{filename}</span>
            <div className="flex-shrink-0">
              {!attachment && (<button onClick={() => onFetch(filename)} className="flex items-center text-sm bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded-lg">{t.fetchImage}</button>)}
              {attachment && attachment.loading && (<span className="text-sm text-gray-500 dark:text-gray-400">{t.imageLoading}</span>)}
              {attachment && !attachment.loading && attachment.data && (<img src={`data:${attachment.mimeType};base64,${attachment.data}`} alt={filename} className="max-w-xs md:max-w-[200px] h-auto rounded-lg shadow-md" />)}
              {attachment && !attachment.loading && attachment.error && (<span className="text-sm text-rose-500">{attachment.error}</span>)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function FeedbackModal({ sourceId, onClose }) {
  const { language, t } = useLanguage();
  const { apiFetch } = useAuth();
  const [priority, setPriority] = useState(1);
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault(); setBusy(true); setError(null); setSuccess(null);
    try {
      const data = await apiFetch('/wanted/details/feedback', { method: 'POST', body: JSON.stringify({ source_id: sourceId, priority: Number(priority), feedback }) });
      const responseData = Array.isArray(data) ? data[0] : data;
      if (responseData && responseData.success) { setSuccess(responseData.data.Ref_No); }
      else { setError({ [language]: (responseData && responseData.message) ? responseData.message[language] : t.genericError }); }
    } catch (err) { setError(err); }
    finally { setBusy(false); }
  };

  const direction = (language === 'ar' || language === 'ku') ? 'rtl' : 'ltr';
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" dir={direction}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-lg overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t.feedbackModalTitle}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {success && (<div className="bg-green-100 border-r-4 border-green-500 text-green-700 p-4 rounded-lg dark:bg-green-900 dark:border-green-700 dark:text-green-200"><p className="font-bold">{t.feedbackSuccessTitle}</p><p>{t.feedbackSuccessMessage} {success}</p></div>)}
            {error && (<div className="bg-rose-100 border-r-4 border-rose-500 text-rose-700 p-4 rounded-lg dark:bg-rose-900 dark:border-rose-700 dark:text-rose-200"><p className="font-bold">{t.feedbackErrorTitle}</p><p>{error[language] || t.genericError}</p></div>)}
            {!success && (<>
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">{t.feedbackPriority}</label>
                <input type="number" min="1" max="5" value={priority} onChange={e => setPriority(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" required />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">{t.feedbackComment}</label>
                <textarea rows="4" value={feedback} onChange={e => setFeedback(e.target.value)} maxLength="500" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder={t.feedbackCommentPlaceholder} required />
              </div>
            </>)}
          </div>
          <div className="flex justify-end items-center p-4 bg-gray-50 dark:bg-gray-700 border-t dark:border-gray-600 gap-2" dir="ltr">
            <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200">{t.closeButton}</button>
            {!success && (<button type="submit" disabled={busy} className={`min-w-[100px] bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg ${busy ? 'opacity-75 cursor-not-allowed' : ''}`}>{busy ? t.sendingButton : t.sendButton}</button>)}
          </div>
        </form>
      </div>
    </div>
  );
}

function DetailsScreen({ sourceId, onBackToSearch }) {
  const { language, t } = useLanguage();
  const { apiFetch } = useAuth();
  const [details, setDetails] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [attachmentsData, setAttachmentsData] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/wanted/details/', { method: 'POST', body: JSON.stringify({ source_id: sourceId }) });
        if (data.success) setDetails(data.data); else setError({ [language]: t.genericError });
      } catch (err) { setError(err); }
      finally { setBusy(false); }
    })();
  }, [sourceId]);

  const fetchAttachment = async (filename) => {
    setAttachmentsData(prev => ({ ...prev, [filename]: { loading: true, data: null } }));
    try {
      const data = await apiFetch('/wanted/attachments', { method: 'POST', body: JSON.stringify({ attachments: [filename] }) });
      if (data.success && data.data.attachments_base64.length > 0) {
        const fileData = data.data.attachments_base64[0];
        if (fileData.success) { setAttachmentsData(prev => ({ ...prev, [filename]: { loading: false, data: fileData.base64, mimeType: fileData.mimeType } })); }
        else { setAttachmentsData(prev => ({ ...prev, [filename]: { loading: false, data: null, error: 'Failed to fetch' } })); }
      } else {
        setAttachmentsData(prev => ({ ...prev, [filename]: { loading: false, data: null, error: data.message ? data.message[language] : t.genericError } }));
      }
    } catch (err) { setAttachmentsData(prev => ({ ...prev, [filename]: { loading: false, data: null, error: err[language] || t.genericError } })); }
  };

  const direction = (language === 'ar' || language === 'ku') ? 'rtl' : 'ltr';
  if (busy) {
    return (
      <div className="min-h-screen" dir={direction}>
        <Header />
        <div className="flex flex-col items-center justify-center p-10 text-gray-700 dark:text-gray-300">{t.details}...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen" dir={direction}>
        <Header />
        <main className="container mx-auto p-4 md:p-6">
          <button onClick={onBackToSearch} className="flex items-center mb-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">{t.back}</button>
          <div className="text-center p-10 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
            <h3 className="text-xl font-bold text-rose-600 dark:text-rose-400 mb-2">{t.details}</h3>
            <p className="text-gray-600 dark:text-gray-400">{error[language] || t.genericError}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" dir={direction}>
      <Header />
      <main className="container mx-auto p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <button onClick={onBackToSearch} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">{t.back}</button>
          <button onClick={() => setIsFeedbackModalOpen(true)} className="flex items-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">{t.feedbackButton}</button>
        </div>
        {details && (
          <>
            <DetailsCard icon={<span className="text-blue-500">ℹ️</span>} title={t.personalInfo}>
              <InfoRow label={t.fullName} value={details.full_name} />
              <InfoRow label={t.motherName} value={details.mother_name} />
              <InfoRow label={t.nationality} value={details.nationality} />
              <InfoRow label={t.createdDate} value={new Date(details.timestamps.created).toLocaleDateString(language)} />
              <InfoRow label={t.updatedDate} value={new Date(details.timestamps.updated).toLocaleDateString(language)} />
            </DetailsCard>

            {details.arrest_orders && details.arrest_orders.total > 0 && (
              <DetailsCard icon={<span className="text-red-500">📄</span>} title={`${t.arrestOrders} (${t.arrestOrdersCount} ${details.arrest_orders.total})`}>
                <DetailsTable headers={[t.crimeType, t.lawArticle, t.court, t.executionResult, t.transitionIssued]}
                  rows={details.arrest_orders.details.map(o => [o.crime_type, o.law_article_number, o.investigation_court, o.execution_result, o.transition_issued_name])} />
              </DetailsCard>
            )}

            {details.absent_sentences && details.absent_sentences.total > 0 && (
              <DetailsCard icon={<span className="text-yellow-600">⚖️</span>} title={`${t.sentenceInfo} (${t.arrestOrdersCount} ${details.absent_sentences.total})`}>
                <DetailsTable headers={[t.court, t.caseNumber, t.crimeType, t.lawArticle, t.sentencePeriod, t.sentenceDate, t.executionResult]}
                  rows={details.absent_sentences.details.map(s => [s.court_name, s.court_case_number, s.crime_type, s.law_article_number, s.sentence_period_years, s.sentence_date ? new Date(s.sentence_date).toLocaleDateString(language) : 'N/A', s.execution_result])} />
              </DetailsCard>
            )}

            <DetailsCard icon={<span className="text-gray-500">📎</span>} title={t.attachments}>
              {details.person_attachments && details.person_attachments.count > 0 && (
                <>
                  <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2">{t.personAttachments}</h4>
                  <AttachmentList files={details.person_attachments.images} attachmentsData={attachmentsData} onFetch={fetchAttachment} />
                </>
              )}
              {details.arrest_orders && details.arrest_orders.total > 0 && details.arrest_orders.details.some(o => o.attachments && o.attachments.count > 0) && (
                <>
                  <h4 className="font-bold text-gray-700 dark:text-gray-300 mt-4 mb-2">{t.orderAttachments} ({t.arrestOrders})</h4>
                  {details.arrest_orders.details.map(o => (o.attachments && o.attachments.count > 0 && <AttachmentList key={`ar-${o.id}`} files={o.attachments.images} attachmentsData={attachmentsData} onFetch={fetchAttachment} />))}
                </>
              )}
              {details.absent_sentences && details.absent_sentences.total > 0 && details.absent_sentences.details.some(s => s.attachments && s.attachments.count > 0) && (
                <>
                  <h4 className="font-bold text-gray-700 dark:text-gray-300 mt-4 mb-2">{t.orderAttachments} ({t.sentenceInfo})</h4>
                  {details.absent_sentences.details.map(s => (s.attachments && s.attachments.count > 0 && <AttachmentList key={`se-${s.id}`} files={s.attachments.images} attachmentsData={attachmentsData} onFetch={fetchAttachment} />))}
                </>
              )}
            </DetailsCard>
          </>
        )}
      </main>
      {isFeedbackModalOpen && (<FeedbackModal sourceId={sourceId} onClose={() => setIsFeedbackModalOpen(false)} />)}
    </div>
  );
}

// ================== التطبيق الأساسي ==================
function AppCore() {
  const [page, setPage] = useState('login');
  const [selectedSourceId, setSelectedSourceId] = useState(null);
  const { accessToken } = useAuth();

  useEffect(() => { if (!accessToken) { setPage('login'); setSelectedSourceId(null); } else if (page === 'login') { setPage('search'); } }, [accessToken, page]);
  const handleNavigateToDetails = (sourceId) => { setSelectedSourceId(sourceId); setPage('details'); };
  const handleBackToSearch = () => { setSelectedSourceId(null); setPage('search'); };

  if (!accessToken) return <LoginScreen />;
  if (page === 'search') return <SearchScreen onNavigateToDetails={handleNavigateToDetails} />;
  if (page === 'details') return <DetailsScreen sourceId={selectedSourceId} onBackToSearch={handleBackToSearch} />;
  return <LoginScreen />;
}

function App() {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('app_language') || 'ar';
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app_theme') || 'dark';
  });

  const t = translations[language];

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = (language === 'ar' || language === 'ku') ? 'rtl' : 'ltr';
    theme === 'dark' ? root.classList.add('dark') : root.classList.remove('dark');

    // ✅ تحسين: حفظ التفضيلات
    localStorage.setItem('app_language', language);
    localStorage.setItem('app_theme', theme);
  }, [language, theme]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <ThemeContext.Provider value={{ theme, setTheme }}>
        <AuthProvider>
          <div className="font-inter">
            <AppCore />
            <footer className="text-center text-xs text-gray-500 dark:text-gray-400 py-6">
              AI964 • CRM Unified Portal • v2.0.0 • Powered by Vite
            </footer>
          </div>
        </AuthProvider>
      </ThemeContext.Provider>
    </LanguageContext.Provider>
  );
}

export default App
