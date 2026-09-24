import { FormEvent, useEffect, useState } from 'react';
import { ApiError, api, Department, LoginResponse, ServiceRequest } from './api';

function messageFrom(error: unknown): string {
  if (
    error instanceof ApiError
    && error.status === 409
    && (error.message.includes('Request state changed')
      || error.message.includes('updated by someone else'))
  ) {
    return 'This request was already updated. Refresh the list and try again.';
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function formatConstant(value: string): string {
  return value
    .split('_')
    .map((word, index) => {
      const normalized = word.toLowerCase();
      if (normalized === 'it') return 'IT';
      return index === 0
        ? normalized.charAt(0).toUpperCase() + normalized.slice(1)
        : normalized;
    })
    .join(' ');
}

function formatLegacyNextSteps(steps: string[]): string[] {
  return steps.reduce<string[]>((formatted, rawStep) => {
    const step = rawStep.trim();
    if (step.split(/\s+/).length < 4 && formatted.length > 0) {
      const previous = formatted[formatted.length - 1].replace(/,\s*$/, '');
      formatted[formatted.length - 1] = `${previous} ${step}`;
      return formatted;
    }
    formatted.push(step);
    return formatted;
  }, []);
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
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [resolutionDrafts, setResolutionDrafts] = useState<Record<string, string>>({});

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
      const created = await api.createRequest(session.accessToken, { title, description, departmentId });
      await loadData(session);
      setNotice(
        created.aiAssistance?.status === 'FAILED'
          ? 'Request submitted successfully. AI assistance is temporarily unavailable.'
          : 'Request submitted successfully.',
      );
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
    const nextStatus = request.allowedNextStatuses[0];
    const resolutionNote = nextStatus === 'RESOLVED'
      ? resolutionDrafts[request.id]?.trim()
      : undefined;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.updateStatus(
        session.accessToken,
        request.id,
        nextStatus,
        request.currentStatus,
        resolutionNote,
      );
      await loadData(session);
      if (nextStatus === 'RESOLVED') {
        setResolutionDrafts((current) => ({ ...current, [request.id]: '' }));
      }
      setNotice('Request status updated.');
    } catch (reason) {
      setError(messageFrom(reason));
    } finally {
      setBusy(false);
    }
  }

  async function addComment(
    event: FormEvent,
    request: ServiceRequest,
    draftKey: string,
    replyToCommentId?: string,
  ) {
    event.preventDefault();
    if (!session) return;
    const body = commentDrafts[draftKey]?.trim();
    if (!body) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.addComment(session.accessToken, request.id, body, replyToCommentId);
      await loadData(session);
      setCommentDrafts((current) => ({ ...current, [draftKey]: '' }));
      setNotice(replyToCommentId ? 'Reply sent.' : 'Update posted.');
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
    setCommentDrafts({});
    setResolutionDrafts({});
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
                  const isRequester = session.user.id === request.requesterId;
                  const conversationOpen = request.currentStatus !== 'RESOLVED';
                  const threadStarts = request.comments.filter(
                    (comment) => comment.replyToCommentId === null,
                  );
                  const latestStaffMessage = [...threadStarts]
                    .reverse()
                    .find((comment) => comment.authorRole === 'STAFF');
                  const latestStaffReply = latestStaffMessage
                    ? request.comments.find(
                      (comment) => comment.replyToCommentId === latestStaffMessage.id,
                    )
                    : undefined;
                  const suggestedDepartment = departments.find(
                    (department) => department.id === request.aiAssistance?.suggestedDepartmentId,
                  );
                  const hasDepartmentMismatch = suggestedDepartment
                    && suggestedDepartment.id !== request.departmentId;
                  const analysisNeedsMoreInformation = request.aiAssistance?.status === 'COMPLETED'
                    && request.aiAssistance.needsClarification === true;
                  const requestTypeLabel = analysisNeedsMoreInformation
                    && request.aiAssistance?.requestType === 'OTHER'
                    ? 'Needs more information'
                    : request.aiAssistance?.requestType
                      ? formatConstant(request.aiAssistance.requestType)
                      : 'Unclassified';
                  const suggestedNextSteps = request.aiAssistance?.status === 'COMPLETED'
                    ? formatLegacyNextSteps(request.aiAssistance.suggestedNextSteps)
                    : [];
                  return (
                    <article className="request-card" key={request.id} data-request-id={request.id}>
                      <div className="request-topline"><span className={`status ${request.currentStatus.toLowerCase()}`}>{request.currentStatus.replace('_', ' ')}</span><time>{new Date(request.createdAt).toLocaleDateString()}</time></div>
                      <h3>{request.title}</h3>
                      <p>{request.description}</p>
                      <dl><div><dt>Department</dt><dd>{request.departmentName}</dd></div><div><dt>Requester</dt><dd>{request.requesterName}</dd></div></dl>
                      {request.aiAssistance && (
                        <section className={`ai-assistance ${request.aiAssistance.status.toLowerCase()}`} aria-label="AI assistance">
                          <div className="ai-heading">
                            <div>
                              <strong>AI-assisted request analysis</strong>
                              <p>Generated from this request with safety guardrails.</p>
                            </div>
                            <span>{formatConstant(request.aiAssistance.status)}</span>
                          </div>
                          {request.aiAssistance.status === 'PENDING' && (
                            <p>AI assistance is being prepared.</p>
                          )}
                          {request.aiAssistance.status === 'FAILED' && (
                            <p>AI assistance is temporarily unavailable. Your request was still submitted.</p>
                          )}
                          {request.aiAssistance.status === 'COMPLETED' && (
                            <>
                              <div className="ai-meta">
                                <span>{requestTypeLabel}</span>
                                {request.aiAssistance.urgency && <span>{formatConstant(request.aiAssistance.urgency)} urgency</span>}
                                {analysisNeedsMoreInformation && request.aiAssistance.requestType !== 'OTHER' && (
                                  <span>Needs more information</span>
                                )}
                              </div>
                              {analysisNeedsMoreInformation && request.aiAssistance.clarificationQuestion && (
                                (!canUpdate || isRequester) && (
                                  <p className="ai-note">More information may be needed before a safe next step can be suggested. Staff will ask through the conversation if necessary.</p>
                                )
                              )}
                              {hasDepartmentMismatch && (
                                <p className="ai-routing">
                                  <strong>Recommended department:</strong> {suggestedDepartment.name}. The request is currently assigned to {request.departmentName}.
                                </p>
                              )}
                              {suggestedNextSteps.length > 0 && (
                                <div className="ai-section ai-waiting">
                                  <h4>What you can do now</h4>
                                  <ul>
                                    {suggestedNextSteps.map((step) => <li key={step}>{step}</li>)}
                                  </ul>
                                </div>
                              )}
                              <small>AI provides guidance only. {request.departmentName} staff review the request and make the final decision.</small>
                            </>
                          )}
                        </section>
                      )}
                      {request.resolutionNote && (
                        <section className="resolution-note" aria-label="Resolution note">
                          <strong>Resolution</strong>
                          <p>{request.resolutionNote}</p>
                        </section>
                      )}
                      {canUpdate && request.allowedNextStatuses.length > 0 && (
                        request.allowedNextStatuses[0] === 'RESOLVED' ? (
                          <form
                            className="resolution-controls"
                            onSubmit={(event) => {
                              event.preventDefault();
                              void advance(request);
                            }}
                          >
                            <div className="workflow-heading">
                              <strong>Resolve request</strong>
                              <span>Add a short final outcome for the employee. This is not a conversation message.</span>
                            </div>
                            <label>
                              <span>Resolution summary <span className="required-label">Required</span></span>
                              <textarea
                                aria-label={`Resolution note for ${request.title}`}
                                value={resolutionDrafts[request.id] ?? ''}
                                maxLength={1000}
                                onChange={(event) => setResolutionDrafts((current) => ({
                                  ...current,
                                  [request.id]: event.target.value,
                                }))}
                                placeholder="Explain what was done and what the employee should know"
                                required
                              />
                            </label>
                            <button
                              type="submit"
                              className="primary update-status"
                              disabled={busy}
                            >
                              Mark as resolved
                            </button>
                          </form>
                        ) : (
                          <div className="workflow-controls">
                            <div className="workflow-heading">
                              <strong>Request status</strong>
                              <span>Mark this request as in progress when the department begins handling it. No message is required.</span>
                            </div>
                            <button className="primary update-status" disabled={busy} onClick={() => void advance(request)}>
                              Mark as in progress
                            </button>
                          </div>
                        )
                      )}
                      <section className="conversation" aria-label={`Conversation for ${request.title}`}>
                        <div className="conversation-heading">
                          <h4>Conversation</h4>
                          <span>{request.comments.length} {request.comments.length === 1 ? 'message' : 'messages'}</span>
                        </div>
                        {request.comments.length === 0 ? (
                          <p className="conversation-empty">
                            {isRequester
                              ? 'No staff messages yet. You can reply after the department posts an update or question.'
                              : request.currentStatus === 'SUBMITTED'
                                ? 'Mark the request as in progress before posting an update or question.'
                                : 'No messages yet. Post an update only when the employee needs information.'}
                          </p>
                        ) : (
                          <div className="comment-list">
                            {threadStarts.map((comment) => {
                              const employeeReply = request.comments.find(
                                (candidate) => candidate.replyToCommentId === comment.id,
                              );
                              const canReplyToMessage = conversationOpen
                                && isRequester
                                && comment.authorRole === 'STAFF'
                                && comment.id === latestStaffMessage?.id
                                && !employeeReply;
                              return (
                                <div className="comment-thread" key={comment.id}>
                                  <article className={`comment ${comment.authorRole.toLowerCase()}`}>
                                    <div>
                                      <strong>{comment.authorName}</strong>
                                      <span className="comment-role">{comment.authorRole === 'STAFF' ? 'Staff' : 'Employee'}</span>
                                      <time>{new Date(comment.createdAt).toLocaleString()}</time>
                                    </div>
                                    <p>{comment.body}</p>
                                  </article>
                                  {employeeReply && (
                                    <article className="comment employee-reply">
                                      <div>
                                        <strong>{employeeReply.authorName}</strong>
                                        <span className="comment-role">Employee reply</span>
                                        <time>{new Date(employeeReply.createdAt).toLocaleString()}</time>
                                      </div>
                                      <p>{employeeReply.body}</p>
                                    </article>
                                  )}
                                  {canReplyToMessage && (
                                    <form
                                      className="reply-form targeted-reply"
                                      onSubmit={(event) => void addComment(
                                        event,
                                        request,
                                        comment.id,
                                        comment.id,
                                      )}
                                    >
                                      <label>
                                        Reply to {comment.authorName}
                                        <textarea
                                          aria-label={`Reply to ${comment.authorName} on ${request.title}`}
                                          value={commentDrafts[comment.id] ?? ''}
                                          maxLength={2000}
                                          onChange={(event) => setCommentDrafts((current) => ({
                                            ...current,
                                            [comment.id]: event.target.value,
                                          }))}
                                          placeholder="Answer this staff message"
                                          required
                                        />
                                      </label>
                                      <button className="secondary" disabled={busy || !(commentDrafts[comment.id]?.trim())}>
                                        Reply to message
                                      </button>
                                    </form>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {request.currentStatus === 'IN_PROGRESS' && canUpdate && !isRequester && (
                          <form
                            className="reply-form staff-update-form"
                            onSubmit={(event) => void addComment(event, request, request.id)}
                          >
                            <label>
                              Post an update <span className="optional-label">Optional</span>
                              <textarea
                                aria-label={`Update for ${request.title}`}
                                value={commentDrafts[request.id] ?? ''}
                                maxLength={2000}
                                onChange={(event) => setCommentDrafts((current) => ({
                                  ...current,
                                  [request.id]: event.target.value,
                                }))}
                                placeholder="Share progress or ask the employee for information"
                                required
                              />
                            </label>
                            <button className="secondary" disabled={busy || !(commentDrafts[request.id]?.trim())}>
                              Post an update
                            </button>
                          </form>
                        )}
                        {conversationOpen && isRequester && request.comments.length > 0 && (
                          <p className="reply-guidance">
                            {latestStaffReply
                              ? 'Your reply was sent. Wait for the next staff update if more information is needed.'
                              : 'Reply only to the latest staff message above.'}
                          </p>
                        )}
                        {!conversationOpen && (
                          <p className="conversation-closed">This request is closed. The conversation is read-only.</p>
                        )}
                      </section>
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
