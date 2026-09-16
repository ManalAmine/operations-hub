import { FormEvent, useEffect, useState } from 'react';
import { ApiError, api, Department, LoginResponse, ServiceRequest } from './api';

function messageFrom(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return 'This request was already updated. Refresh the list and try again.';
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function App() {
  const [session, setSession] = useState<LoginResponse | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadData(activeSession: LoginResponse) {
    const [availableDepartments, visibleRequests] = await Promise.all([
      api.departments(activeSession.accessToken),
      api.requests(activeSession.accessToken),
    ]);
    setDepartments(availableDepartments);
    setRequests(visibleRequests);
    if (!availableDepartments.some((item) => item.id === departmentId)) {
      setDepartmentId(availableDepartments[0]?.id ?? '');
    }
  }

  useEffect(() => {
    if (session) void loadData(session).catch((reason) => setError(messageFrom(reason)));
  }, [session]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      setSession(await api.login(email, password));
    } catch (reason) {
      setError(messageFrom(reason));
    } finally {
      setBusy(false);
    }
  }

  async function submitRequest(event: FormEvent) {
    event.preventDefault();
    if (!session) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.createRequest(session.accessToken, { title, description, departmentId });
      await loadData(session);
      setNotice('Request submitted successfully.');
      setTitle('');
      setDescription('');
    } catch (reason) {
      setError(messageFrom(reason));
    } finally {
      setBusy(false);
    }
  }

  async function advance(request: ServiceRequest) {
    if (!session || request.allowedNextStatuses.length === 0) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.updateStatus(
        session.accessToken,
        request.id,
        request.allowedNextStatuses[0],
        request.currentStatus,
      );
      await loadData(session);
      setNotice('Request status updated.');
    } catch (reason) {
      setError(messageFrom(reason));
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    setSession(null);
    setEmail('');
    setPassword('');
    setRequests([]);
    setDepartments([]);
    setDepartmentId('');
    setNotice('');
    setError('');
  }

  if (!session) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="brand-mark">OH</div>
          <p className="eyebrow">Internal operations</p>
          <h1>Sign in to Operations Hub</h1>
          <p className="muted">Submit and manage company service requests.</p>
          <form onSubmit={login} className="stack">
            <label>
              Work email
              <input aria-label="Work email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              Password
              <input aria-label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            {error && <div className="alert error" role="alert">{error}</div>}
            <button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>
          <aside className="demo-access" aria-label="Demo access">
            <div>
              <strong>Demo access</strong>
              <span>Local development only</span>
            </div>
            <dl>
              <div><dt>Employee</dt><dd>alice@example.com</dd></div>
              <div><dt>IT staff</dt><dd>ivan@example.com</dd></div>
              <div><dt>HR staff</dt><dd>hannah@example.com</dd></div>
              <div><dt>Finance staff</dt><dd>farah@example.com</dd></div>
              <div><dt>Password</dt><dd>Password123!</dd></div>
            </dl>
          </aside>
        </section>
      </main>
    );
  }

  const isDepartmentStaff = session.user.departmentIds.length > 0 || session.user.isAdmin;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark small">OH</span><strong>Operations Hub</strong></div>
        <div className="user-block">
          <span><strong>{session.user.name}</strong><small>{isDepartmentStaff ? 'Department staff' : 'Employee'}</small></span>
          <button className="text-button" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <main className="workspace">
        <section className="page-heading">
          <div><p className="eyebrow">Service requests</p><h1>{isDepartmentStaff ? 'Department queue' : 'My requests'}</h1></div>
          <button className="secondary" onClick={() => void loadData(session)}>Refresh</button>
        </section>

        {error && <div className="alert error" role="alert">{error}</div>}
        {notice && <div className="alert success" role="status">{notice}</div>}

        <div className="content-grid">
          {!isDepartmentStaff && (
            <section className="panel request-form-panel">
              <h2>New request</h2>
              <form onSubmit={submitRequest} className="stack">
                <label>Title<input aria-label="Title" placeholder="Brief summary" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} required /></label>
                <label>Description<textarea aria-label="Description" placeholder="Describe the help you need" value={description} minLength={10} maxLength={2000} onChange={(e) => setDescription(e.target.value)} required /></label>
                <label>Department<select aria-label="Department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required>
                  {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                </select></label>
                <button className="primary" disabled={busy}>Submit request</button>
              </form>
            </section>
          )}

          <section className={`panel requests-panel ${isDepartmentStaff ? 'wide' : ''}`}>
            <div className="panel-heading"><h2>{isDepartmentStaff ? 'Assigned requests' : 'Submitted requests'}</h2><span>{requests.length} total</span></div>
            {requests.length === 0 ? (
              <div className="empty-state"><strong>No requests yet</strong><p>New requests will appear here.</p></div>
            ) : (
              <div className="request-list">
                {requests.map((request) => {
                  const canUpdate = session.user.isAdmin || session.user.departmentIds.includes(request.departmentId);
                  return (
                    <article className="request-card" key={request.id} data-request-id={request.id}>
                      <div className="request-topline"><span className={`status ${request.currentStatus.toLowerCase()}`}>{request.currentStatus.replace('_', ' ')}</span><time>{new Date(request.createdAt).toLocaleDateString()}</time></div>
                      <h3>{request.title}</h3>
                      <p>{request.description}</p>
                      <dl><div><dt>Department</dt><dd>{request.departmentName}</dd></div><div><dt>Requester</dt><dd>{request.requesterName}</dd></div></dl>
                      {canUpdate && request.allowedNextStatuses.length > 0 && (
                        <button className="secondary update-status" disabled={busy} onClick={() => void advance(request)}>
                          Move to {request.allowedNextStatuses[0].replace('_', ' ')}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
