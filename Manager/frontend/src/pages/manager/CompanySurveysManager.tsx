import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../modules/auth/supabaseClient';

const SCHEMA = (import.meta as any).env?.VITE_SUPABASE_SCHEMA || 'feedbackApp';

type Employee = { user_id: string; first_name?: string | null; last_name?: string | null; email?: string | null; CompanyID?: number | null };

type Question = { id: string; text: string };

type AssignmentRow = {
  survey_id: string;
  company_id: number;
  employee_id: string;
  status: string | null;
  created_at?: string | null;
};

type SurveyRow = { id: string; title: string | null };

export default function CompanySurveysManager({ view }: { view: 'create' | 'results' }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('Client Performance Review');
  const [description, setDescription] = useState('Review to request feedback from the client for a specific employee.');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([
    { id: crypto.randomUUID(), text: 'How is this employee performing overall?' },
    { id: crypto.randomUUID(), text: 'What are this employee’s strengths?' },
    { id: crypto.randomUUID(), text: 'What areas should this employee improve?' },
  ]);
  const [newQuestion, setNewQuestion] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [mySurveys, setMySurveys] = useState<Array<{ id: string; title: string | null }>>([]);
  const [selectedSurveyForResults, setSelectedSurveyForResults] = useState<string>('');
  const [assignments, setAssignments] = useState<
    Array<{
      survey_id: string;
      survey_title: string;
      company_id: number;
      employee_id: string;
      status: string | null;
      employee_name: string;
      sent_at: string | null;
      replied_at: string | null;
    }>
  >([]);
  const [answersByKey, setAnswersByKey] = useState<Record<string, Array<{ question: string; answer: string | null }>>>({});
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('');
  const [filterDateField, setFilterDateField] = useState<'sent' | 'replied'>('sent');
  const [filterFromDate, setFilterFromDate] = useState<string>('');
  const [filterToDate, setFilterToDate] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data: auth } = await supabase.auth.getUser();
        const managerId = auth.user?.id;
        if (!managerId) return;

        const managerProfile = await supabase
          .schema(SCHEMA)
          .from('profiles')
          .select('CompanyID')
          .eq('user_id', managerId)
          .maybeSingle();
        if (managerProfile.error) throw managerProfile.error;

        const rawCompanyId = (managerProfile.data as any)?.CompanyID;
        const companyId = rawCompanyId == null ? null : Number(rawCompanyId);
        if (!Number.isFinite(companyId as any)) {
          setEmployees([]);
        } else {
          const prof = await supabase
            .schema(SCHEMA)
            .from('profiles')
            .select('user_id, first_name, last_name, email, CompanyID')
            .eq('CompanyID', companyId)
            .order('first_name', { ascending: true })
            .order('last_name', { ascending: true });
          if (prof.error) throw prof.error;

          const people = (prof.data || []) as any[];
          const profileIds = people.map((p) => p.user_id).filter(Boolean);
          if (profileIds.length === 0) {
            setEmployees([]);
          } else {
            const prRes = await supabase
              .schema(SCHEMA)
              .from('ProfileRoles')
              .select('idProfile, idRol')
              .in('idProfile', profileIds);

            if (prRes.error) {
              setEmployees(people as any);
            } else {
              const profileRoles = (prRes.data || []) as Array<{ idProfile: string; idRol: any }>;
              const roleIds = Array.from(new Set(profileRoles.map((r) => r.idRol).filter((v) => v !== null && v !== undefined)));
              const rolesRes = roleIds.length
                ? await supabase
                    .schema(SCHEMA)
                    .from('Roles')
                    .select('id, Role')
                    .in('id', roleIds as any)
                : { data: [], error: null };

              if ((rolesRes as any).error) {
                setEmployees(people as any);
              } else {
                const roleNameById = new Map<string, string>();
                ((rolesRes as any).data || []).forEach((r: any) => {
                  const id = r?.id;
                  const name = (r?.Role || '').toString().trim();
                  if (id === null || id === undefined) return;
                  roleNameById.set(String(id), name);
                });

                const rolesByUser: Record<string, string[]> = {};
                profileRoles.forEach((pr) => {
                  const uid = pr.idProfile;
                  const roleName = roleNameById.get(String(pr.idRol));
                  if (!uid || !roleName) return;
                  rolesByUser[uid] = rolesByUser[uid] || [];
                  if (!rolesByUser[uid].includes(roleName)) rolesByUser[uid].push(roleName);
                });

                const filtered = people.filter((p) => {
                  const roles = rolesByUser[p.user_id] || [];
                  return !roles.some((r) => r.trim().toLowerCase() === 'company');
                });
                setEmployees(filtered as any);
              }
            }
          }
        }

        const sres = await supabase
          .schema(SCHEMA)
          .from('ClientSurveys')
          .select('id, title')
          .eq('created_by', managerId)
          .order('created_at', { ascending: false })
          .limit(10);
        if (sres.error) throw sres.error;
        setMySurveys((sres.data || []) as any);
      } catch (e: any) {
        setError(e?.message || 'Failed to load team');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const employeeOptions = useMemo(() => {
    return employees.map((e) => ({
      value: e.user_id,
      label: `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.email || e.user_id,
    }));
  }, [employees]);

  const teamEmployeeIds = useMemo(() => employees.map((e) => e.user_id).filter(Boolean), [employees]);

  const filteredAssignments = useMemo(() => {
    const from = filterFromDate ? new Date(`${filterFromDate}T00:00:00`).getTime() : null;
    const to = filterToDate ? new Date(`${filterToDate}T23:59:59`).getTime() : null;
    return assignments.filter((a) => {
      if (selectedSurveyForResults && a.survey_id !== selectedSurveyForResults) return false;
      if (filterEmployeeId && a.employee_id !== filterEmployeeId) return false;
      const raw = filterDateField === 'sent' ? a.sent_at : a.replied_at;
      if (!raw) {
        if (from !== null || to !== null) return false;
        return true;
      }
      const t = new Date(raw).getTime();
      if (from !== null && t < from) return false;
      if (to !== null && t > to) return false;
      return true;
    });
  }, [assignments, selectedSurveyForResults, filterEmployeeId, filterDateField, filterFromDate, filterToDate]);

  const fmtDateTime = (iso: string | null | undefined) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
  };

  const answersKey = (surveyId: string, companyId: number, employeeId: string) => `${surveyId}:${companyId}:${employeeId}`;

  async function loadResultsAssignments() {
    setError(null);
    setAssignments([]);
    setAnswersByKey({});

    const surveyIds = mySurveys.map((s) => s.id).filter(Boolean);
    if (surveyIds.length === 0) return;
    if (teamEmployeeIds.length === 0) return;

    const aresWithDates = await supabase
      .schema(SCHEMA)
      .from('ClientSurveysAssignments')
      .select('survey_id, company_id, employee_id, status, created_at')
      .in('survey_id', surveyIds)
      .in('employee_id', teamEmployeeIds);

    let rows: AssignmentRow[] = [];
    if (aresWithDates.error) {
      const msg = String((aresWithDates.error as any)?.message || '');
      if (msg.toLowerCase().includes('created_at')) {
        const ares = await supabase
          .schema(SCHEMA)
          .from('ClientSurveysAssignments')
          .select('survey_id, company_id, employee_id, status')
          .in('survey_id', surveyIds)
          .in('employee_id', teamEmployeeIds);
        if (ares.error) {
          setError(ares.error.message);
          return;
        }
        rows = (ares.data || []) as any;
      } else {
        setError(aresWithDates.error.message);
        return;
      }
    } else {
      rows = (aresWithDates.data || []) as any;
    }

    const names: Record<string, string> = {};
    if (rows.length > 0) {
      const ids = Array.from(new Set(rows.map((r) => r.employee_id).filter(Boolean)));
      const pres = await supabase
        .schema(SCHEMA)
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', ids);
      if (!pres.error && pres.data) {
        pres.data.forEach((p: any) => {
          const nm = `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email || p.user_id;
          names[p.user_id] = nm;
        });
      }
    }

    const rres = await supabase
      .schema(SCHEMA)
      .from('ClientSurveyResponses')
      .select('survey_id, company_id, employee_id, created_at')
      .in('survey_id', surveyIds)
      .in('employee_id', teamEmployeeIds)
      .order('created_at', { ascending: false });

    const latestReply: Record<string, string> = {};
    if (!rres.error && rres.data) {
      for (const r of rres.data as any[]) {
        const sid = r.survey_id;
        const cid = r.company_id;
        const eid = r.employee_id;
        const key = sid && cid != null && eid ? answersKey(sid, Number(cid), eid) : '';
        if (key && !latestReply[key] && r.created_at) {
          latestReply[key] = r.created_at;
        }
      }
    }

    const titleMap = new Map(mySurveys.map((s: SurveyRow) => [s.id, (s.title || 'Untitled')] as const));

    setAssignments(
      rows.map((r: any) => {
        const sid = r.survey_id as string;
        const cid = Number(r.company_id);
        const eid = r.employee_id as string;
        const key = answersKey(sid, cid, eid);
        return {
          survey_id: sid,
          survey_title: titleMap.get(sid) || 'Untitled',
          company_id: cid,
          employee_id: eid,
          status: r.status ?? null,
          employee_name: names[eid] || eid,
          sent_at: r.created_at ?? null,
          replied_at: latestReply[key] ?? null,
        };
      })
    );
  }

  useEffect(() => {
    if (view !== 'results') return;
    if (mySurveys.length === 0) return;
    loadResultsAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, mySurveys.length, teamEmployeeIds.length]);

  function addQuestion() {
    const text = newQuestion.trim();
    if (!text) return;
    setQuestions((prev) => [...prev, { id: crypto.randomUUID(), text }]);
    setNewQuestion('');
  }

  async function handleCreateSurvey() {
    setMessage(null);
    setError(null);
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const managerId = auth.user?.id;
      if (!managerId) throw new Error('Not authenticated');
      if (!selectedEmployeeId) throw new Error('Please select an employee');

      const emp = employees.find((e) => e.user_id === selectedEmployeeId);
      const rawCompanyId = (emp as any)?.CompanyID;
      const companyId = rawCompanyId == null ? null : Number(rawCompanyId);
      if (!Number.isFinite(companyId as any)) throw new Error('Selected employee has no company id');

      const insSurvey = await supabase
        .schema(SCHEMA)
        .from('ClientSurveys')
        .insert({
          title,
          description,
          created_by: managerId,
          employee_id: selectedEmployeeId,
          company_id: companyId,
        })
        .select('id')
        .single();
      if (insSurvey.error) throw insSurvey.error;
      const surveyId = insSurvey.data.id as string;

      if (questions.length > 0) {
        const rows = questions.map((q, idx) => ({ survey_id: surveyId, order_index: idx, question_text: q.text }));
        const insQ = await supabase.schema(SCHEMA).from('ClientSurveysQuestions').insert(rows);
        if (insQ.error) throw insQ.error;
      }

      const insA = await supabase
        .schema(SCHEMA)
        .from('ClientSurveysAssignments')
        .insert({ survey_id: surveyId, company_id: companyId, employee_id: selectedEmployeeId, status: 'pending' });
      if (insA.error) throw insA.error;

      setMessage('Survey created successfully');
      setSelectedEmployeeId('');
    } catch (e: any) {
      setError(e?.message || 'Failed to create survey');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {view === 'create' && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Create Client Review</h2>
            <p className="text-sm text-muted-foreground">Create a performance review for a specific employee that will be answered by client users.</p>
          </div>
          <button
            className="emp-btn-inline disabled:opacity-50"
            onClick={handleCreateSurvey}
            disabled={saving}
            title="Create survey with current configuration"
          >
            {saving ? 'Creating…' : 'Create Survey'}
          </button>
        </div>
      )}

      {view === 'results' && (
        <div>
          <h2 className="text-xl font-semibold">Client Review Results</h2>
          <p className="text-sm text-muted-foreground">Review responses from client users for reviews you created.</p>
        </div>
      )}

      {message && <div className="text-sm text-green-600">{message}</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {view === 'create' && (
        <div className="grid gap-6 md:grid-cols-2">
          <section className="emp-card space-y-3 p-4">
            <h3 className="font-medium">Details</h3>
            <label className="text-sm block">Title
              <input className="mt-1 w-full border rounded-md px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="text-sm block">Description
              <textarea className="mt-1 w-full border rounded-md px-3 py-2" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <div>
              <label className="text-sm block">Select Employee</label>
              <select className="mt-1 w-full border rounded-md px-3 py-2" value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)}>
                <option value="">-- Choose --</option>
                {employeeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {loading && <div className="text-xs text-muted-foreground mt-1">Loading team…</div>}
              {!loading && employeeOptions.length === 0 && (
                <div className="text-xs text-muted-foreground mt-1">No employees found under your management.</div>
              )}
            </div>
          </section>

          <section className="emp-card space-y-3 p-4">
            <h3 className="font-medium">Questions</h3>
            <ul className="space-y-2">
              {questions.map((q, idx) => (
                <li key={q.id} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-6">{idx + 1}.</span>
                  <input
                    className="flex-1 border rounded-md px-2 py-1"
                    value={q.text}
                    onChange={(e) => setQuestions((prev) => prev.map((x) => x.id === q.id ? { ...x, text: e.target.value } : x))}
                  />
                  <button className="text-xs text-red-600 hover:underline" onClick={() => setQuestions((prev) => prev.filter((x) => x.id !== q.id))}>Remove</button>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2">
              <input className="flex-1 h-9 border rounded-md px-2 py-1" placeholder="Add a custom question" value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} />
              <button className="emp-btn-inline h-9 !px-3 !py-0 text-sm flex items-center justify-center" onClick={addQuestion}>Add</button>
            </div>
          </section>
        </div>
      )}

      {view === 'results' && (
        <section className="emp-card space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm">Employee</label>
              <select
                className="mt-1 w-full border rounded-md px-3 py-2"
                value={filterEmployeeId}
                onChange={(e) => setFilterEmployeeId(e.target.value)}
              >
                <option value="">All</option>
                {employeeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm">Survey</label>
              <select
                className="mt-1 w-full border rounded-md px-3 py-2"
                value={selectedSurveyForResults}
                onChange={(e) => {
                  setSelectedSurveyForResults(e.target.value);
                  setAnswersByKey({});
                }}
              >
                <option value="">All surveys</option>
                {mySurveys.map((s) => (
                  <option key={s.id} value={s.id}>{s.title || 'Untitled'}</option>
                ))}
              </select>
            </div>
          </div>

          {assignments.length > 0 && (
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="text-sm">Date Type</label>
                <select
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  value={filterDateField}
                  onChange={(e) => setFilterDateField(e.target.value as any)}
                >
                  <option value="sent">Sent date</option>
                  <option value="replied">Replied date</option>
                </select>
              </div>
              <div>
                <label className="text-sm">From</label>
                <input
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  type="date"
                  value={filterFromDate}
                  onChange={(e) => setFilterFromDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm">To</label>
                <input
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  type="date"
                  value={filterToDate}
                  onChange={(e) => setFilterToDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {(assignments.length > 0 || selectedSurveyForResults || filterEmployeeId || filterFromDate || filterToDate) && (
            <div className="space-y-3">
              {filteredAssignments.map((a) => (
                <div key={`${a.survey_id}:${a.company_id}:${a.employee_id}`} className="emp-card p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{a.employee_name}</div>
                      <div className="text-xs text-muted-foreground">Survey: {a.survey_title}</div>
                      <div className="text-xs text-muted-foreground">Status: {a.status || 'pending'}</div>
                      <div className="text-xs text-muted-foreground">Sent: {fmtDateTime(a.sent_at)}</div>
                      <div className="text-xs text-muted-foreground">Replied: {fmtDateTime(a.replied_at)}</div>
                    </div>
                    <button
                      className="text-sm underline"
                      onClick={async () => {
                        const key = answersKey(a.survey_id, a.company_id, a.employee_id);
                        if (answersByKey[key]) {
                          setAnswersByKey((prev) => {
                            const copy = { ...prev };
                            delete copy[key];
                            return copy;
                          });
                          return;
                        }

                        const qRes = await supabase
                          .schema(SCHEMA)
                          .from('ClientSurveysQuestions')
                          .select('id, question_text')
                          .eq('survey_id', a.survey_id)
                          .order('order_index', { ascending: true });
                        if (qRes.error) {
                          setError(qRes.error.message);
                          return;
                        }

                        const questions = (qRes.data || []) as Array<{ id: string; question_text: string }>;

                        const resp = await supabase
                          .schema(SCHEMA)
                          .from('ClientSurveyResponses')
                          .select('id')
                          .eq('survey_id', a.survey_id)
                          .eq('company_id', a.company_id)
                          .eq('employee_id', a.employee_id)
                          .maybeSingle();

                        let answers: Array<{ question_id: string; answer_text: string | null }> = [];
                        if (!resp.error && resp.data?.id) {
                          const ans = await supabase
                            .schema(SCHEMA)
                            .from('ClientSurveyAnswers')
                            .select('question_id, answer_text')
                            .eq('response_id', resp.data.id);
                          if (!ans.error && ans.data) answers = ans.data as any;
                        }

                        const amap = new Map(answers.map((x) => [x.question_id, x.answer_text] as const));
                        setAnswersByKey((prev) => ({
                          ...prev,
                          [key]: questions.map((q) => ({ question: q.question_text, answer: (amap.get(q.id) as any) ?? null })),
                        }));
                      }}
                    >
                      {answersByKey[answersKey(a.survey_id, a.company_id, a.employee_id)] ? 'Hide Answers' : 'View Answers'}
                    </button>
                  </div>

                  {answersByKey[answersKey(a.survey_id, a.company_id, a.employee_id)] && (
                    <ul className="mt-3 space-y-2 text-sm">
                      {answersByKey[answersKey(a.survey_id, a.company_id, a.employee_id)].map((qa, idx) => (
                        <li key={idx} className="emp-card p-2">
                          <div className="font-medium">{idx + 1}. {qa.question}</div>
                          <div className="text-muted-foreground whitespace-pre-wrap">{qa.answer ?? '—'}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              {filteredAssignments.length === 0 && <div className="text-sm text-muted-foreground">No results match your filters.</div>}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
