import { uid, lastDay, iso, today, ym, monthLabel, fmtDate } from './data/util.js';
export const TASK_STATUS = ['Pending', 'In Progress', 'Completed', 'Blocked'];
export const PRIORITY = ['Low', 'Medium', 'High'];
export const CLIENT_STATUS = ['Active', 'On Hold', 'Completed'];
export const ISSUE_STATUS = ['Open', 'In Progress', 'Waiting for Client', 'Resolved'];
export const COMM_TYPES = ['Onboarding', 'Information Request', 'Task Update', 'Progress Update', 'Missing Information', 'Issue Notification', 'Follow-up', 'Monthly Report', 'Recommendation', 'General'];
export const by = (arr, id) => arr.find(x => x.id === id);

export function stats(tasks) {
  const total = tasks.length, c = k => tasks.filter(t => t.status === k).length, done = c('Completed');
  return { total, done, pending: c('Pending'), prog: c('In Progress'), blocked: c('Blocked'), pct: total ? Math.round(done / total * 100) : 0 };
}
export function cycleStatus(st) {
  if (!st.total) return 'Not Started';
  if (st.blocked) return 'Blocked';
  if (st.done === st.total) return 'Completed';
  if (st.pct >= 80) return 'Nearly Complete';
  return st.done || st.prog ? 'In Progress' : 'Not Started';
}
export const isOverdue = (t, td = today()) => t.status !== 'Completed' && !!t.dueDate && t.dueDate < td;
export function cycleInfo(s, cy) {
  const cs = by(s.clientServices, cy.clientServiceId), tasks = s.tasks.filter(t => t.cycleId === cy.id), st = stats(tasks);
  return { cy, cs, client: by(s.clients, cy.clientId), mp: by(s.marketplaces, cs?.marketplaceId), sv: by(s.services, cs?.serviceId), tasks, st, status: cycleStatus(st) };
}
export const cycleLabel = (s, cy) => { const i = cycleInfo(s, cy); return `${i.client?.company} · ${i.sv?.name} · ${monthLabel(cy.month)}`; };

// Creates a monthly cycle + tasks from the template matching the client service (pure; caller commits).
export function planCycle(s, csId, month, startDay) {
  const cs = by(s.clientServices, csId);
  const tpl = s.serviceTemplates.find(t => t.marketplaceId === cs.marketplaceId && t.serviceId === cs.serviceId);
  const items = tpl ? s.templateTasks.filter(t => t.templateId === tpl.id).sort((a, b) => a.order - b.order) : [];
  const n = items.length, ld = lastDay(month); let seq = s.meta.taskSeq;
  const from = startDay ? Math.min(Math.max(1, startDay), ld) : 0, span = ld - from; // first cycle of a new service: spread due dates from the start day, not from day 1
  const cycle = { id: uid('cyc'), clientServiceId: csId, clientId: cs.clientId, month, createdAt: today() };
  const tasks = items.map((it, i) => ({
    id: uid('tsk'), code: 'T-' + String(++seq).padStart(4, '0'), cycleId: cycle.id, clientId: cs.clientId,
    marketplaceId: cs.marketplaceId, serviceId: cs.serviceId, name: it.name, description: it.description || '', month,
    dueDate: iso(month, Math.max(1, from + Math.round((i + 1) / n * span))), priority: it.priority || 'Medium', status: 'Pending',
    assignee: '', notes: '', result: '', issue: '', followUp: '', evidence: '', completedAt: '', order: i }));
  return { cycle, tasks, seq, hasTemplate: !!tpl };
}

export function alerts(s, td = today()) {
  const out = [], cm = ym(new Date()), day = new Date().getDate();
  s.cycles.forEach(cy => {
    const i = cycleInfo(s, cy); if (i.client?.status !== 'Active') return;
    const lab = cycleLabel(s, cy), clientId = i.client.id;
    const od = i.tasks.filter(t => isOverdue(t, td)).length;
    if (od) out.push({ kind: 'Overdue', text: `${od} overdue task${od > 1 ? 's' : ''} — ${lab}`, clientId });
    if (i.st.blocked) out.push({ kind: 'Blocked', text: `${i.st.blocked} blocked task${i.st.blocked > 1 ? 's' : ''} — ${lab}`, clientId });
    const past = cy.month < cm, late = cy.month === cm && day >= 22;
    if ((past || late) && i.status !== 'Completed') {
      const imp = i.tasks.filter(t => t.status !== 'Completed' && t.priority === 'High').length;
      if (past || imp) out.push({ kind: 'Missing Work', text: `${past ? 'Month ended' : 'Month-end approaching'} with ${i.st.total - i.st.done} incomplete task(s)${imp ? ` (${imp} high priority)` : ''} — ${lab}`, clientId });
    }
    if (i.st.pct >= 80 && !s.reports.some(r => r.cycleId === cy.id && r.status === 'Final'))
      out.push({ kind: 'Report Pending', text: `${i.st.pct}% complete, report not finalized — ${lab}`, clientId, cycleId: cy.id });
  });
  s.issues.filter(x => x.status === 'Waiting for Client').forEach(x => out.push({ kind: 'Waiting for Client', text: `Issue waiting for client: ${x.title}`, clientId: x.clientId }));
  return out;
}

/* ---------- Client messages ---------- */
const SIGN = '\n\nRegards,\nDesireTech';
export const TEMPLATES = {
  'Onboarding': 'Hi [Client Name],\n\nWelcome to DesireTech! We are excited to start managing your [Marketplace] activities ([Service]).\n\nTo get started, please share:\n\n[Required Information]\n\nOnce received, we will set up your [Month] service plan.' + SIGN,
  'Information Request': 'Hi [Client Name],\n\nTo proceed with the current marketplace activities, we require the following information:\n\n[Required Information]\n\nOnce received, we will proceed with the pending activities.' + SIGN,
  'Task Update': 'Hi [Client Name],\n\nHere is an update on your [Marketplace] [Service] activity "[Task]":\n\nStatus: [Task Status]\n[Result Line]\n\nWe will keep you posted on further progress.' + SIGN,
  'Progress Update': 'Hi [Client Name],\n\nHere is your [Month] progress update for [Service] on [Marketplace]:\n\n• Completed: [Completed Count] of [Total] activities ([Progress]%)\n• Pending: [Pending Items]\n\nWe will continue with the remaining activities as planned.' + SIGN,
  'Missing Information': 'Hi [Client Name],\n\nWe are currently working on your [Marketplace] [Service] activities. The following activity is pending because we require [Required Information]:\n\n• [Task]\n\nOnce we receive this information, we will proceed with the activity.' + SIGN,
  'Issue Notification': 'Hi [Client Name],\n\nDuring our review of your [Marketplace] account we identified the following issue:\n\n[Issue]\n[Issue Description]\n\nWe are working on resolving it and will keep you updated.' + SIGN,
  'Follow-up': 'Hi [Client Name],\n\nThis is a follow-up regarding "[Task]". We are still awaiting: [Required Information]\n\nKindly share it at the earliest so we can proceed.' + SIGN,
  'Monthly Report': 'Hi [Client Name],\n\nYour [Month] service report for [Service] on [Marketplace] is ready. [Completed Count] of [Total] planned activities were completed this month.\n\nPlease let us know if you would like to discuss the report or the plan for next month.' + SIGN,
  'Recommendation': 'Hi [Client Name],\n\nBased on our review of your [Marketplace] account, we recommend:\n\n[Recommendation]\n\nPlease let us know if you would like us to go ahead.' + SIGN,
  'General': 'Hi [Client Name],\n\n[Message]' + SIGN,
};
export function generateMessage(s, { clientId, type, taskId, issueId, details }) {
  const client = by(s.clients, clientId), task = by(s.tasks, taskId), issue = by(s.issues, issueId);
  const cy = (task && by(s.cycles, task.cycleId)) || s.cycles.find(c => c.clientId === clientId && c.month === ym(new Date())) || s.cycles.filter(c => c.clientId === clientId).sort((a, b) => b.month.localeCompare(a.month))[0];
  const i = cy ? cycleInfo(s, cy) : null;
  const mp = by(s.marketplaces, task?.marketplaceId || issue?.marketplaceId)?.name || i?.mp?.name;
  const sv = by(s.services, task?.serviceId || issue?.serviceId)?.name || i?.sv?.name;
  const pend = i ? i.tasks.filter(t => t.status !== 'Completed').slice(0, 5).map(t => t.name).join(', ') || 'None' : '';
  const v = {
    'Client Name': (client?.contact || client?.name || '').split(' ')[0], Company: client?.company, Marketplace: mp, Service: sv,
    Month: cy ? monthLabel(cy.month) : monthLabel(ym(new Date())), Task: task?.name, 'Task Status': task?.status,
    'Result Line': task?.result ? 'Result: ' + task.result : '', Issue: issue?.title, 'Issue Description': issue?.description,
    'Completed Count': i?.st.done, Total: i?.st.total, Progress: i?.st.pct, 'Pending Items': pend,
    'Required Information': details || task?.issue || undefined, Recommendation: details || undefined, Message: details || undefined };
  return (TEMPLATES[type] || TEMPLATES.General).replace(/\[([^\]]+)\]/g, (m, k) => (v[k] === undefined || v[k] === null || v[k] === '' ) && k !== 'Result Line' ? m : (v[k] ?? ''));
}

/* ---------- Monthly report ---------- */
const list = (arr, f) => arr.length ? arr.map(f).join('\n') : 'None.';
export function reportSections(s, cy, keep = {}) {
  const i = cycleInfo(s, cy), m = cy.month;
  const issues = s.issues.filter(x => x.clientId === cy.clientId && x.serviceId === i.cs?.serviceId && x.marketplaceId === i.cs?.marketplaceId);
  const found = issues.filter(x => (x.createdAt || '').startsWith(m)), solved = issues.filter(x => x.status === 'Resolved' && (x.resolvedAt || x.createdAt || '').startsWith(m));
  const done = i.tasks.filter(t => t.status === 'Completed'), open = i.tasks.filter(t => t.status !== 'Completed');
  const comms = s.communications.filter(c => c.clientId === cy.clientId && (c.date || '').startsWith(m));
  return {
    summary: `During ${monthLabel(m)}, DesireTech completed ${i.st.done} of ${i.st.total} planned ${i.sv?.name} activities for ${i.client?.company} on ${i.mp?.name} (${i.st.pct}% complete).${i.st.blocked ? ` ${i.st.blocked} activity(ies) are blocked pending input.` : ''} ${found.length} issue(s) were identified and ${solved.length} resolved this month.`,
    completed: list(done, t => `✓ ${t.name}`),
    actions: list(done.filter(t => t.result || t.notes), t => `• ${t.name}${t.result ? ` — Result: ${t.result}` : ''}${t.notes ? ` Notes: ${t.notes}` : ''}`),
    issuesIdentified: list(found, x => `• ${x.title} [${x.priority}, ${x.status}]${x.description ? ` — ${x.description}` : ''}`),
    issuesResolved: list(solved, x => `• ${x.title}${x.resolution ? ` — ${x.resolution}` : ''}`),
    pending: list(open, t => `• ${t.name} (${t.status}, due ${fmtDate(t.dueDate)})`),
    recommendations: keep.recommendations ?? '', nextPlan: keep.nextPlan ?? '',
    comms: list(comms, c => `• ${fmtDate(c.date)} — ${c.type}: ${c.message.replace(/\s+/g, ' ').slice(0, 140)}${c.message.length > 140 ? '…' : ''}`) };
}
export const REPORT_SECTIONS = [['summary', '1. Service Summary'], ['completed', '2. Completed Activities'], ['actions', '3. Key Actions Taken'], ['issuesIdentified', '4. Issues Identified'], ['issuesResolved', '5. Issues Resolved'], ['pending', '6. Pending Activities'], ['recommendations', '7. Recommendations'], ['nextPlan', '8. Next Month Plan'], ['comms', '9. Client Communication']];
