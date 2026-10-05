// MVP 3B: the ONE place where {{variables}} are replaced. Pure functions - no React, no storage.
// Rule: a variable with no value is LEFT UNCHANGED (never "undefined"/"null"), so it can be edited by hand.
import { by } from '../logic.js';
import { addMonth, monthLabel, ym } from '../data/util.js';
import { pendingReqs } from '../onboarding/logic.js';

const RE = /\{\{\s*([a-z_]+)\s*\}\}/gi;

export function replaceVariables(text, ctx = {}) {
  return String(text ?? '').replace(RE, (whole, key) => {
    const v = ctx[key.toLowerCase()];
    return v === undefined || v === null || String(v).trim() === '' ? whole : String(v);
  });
}
// Unique list of variables still present in the text, e.g. ['{{task_name}}'].
export function unresolvedVariables(...texts) {
  const out = [];
  texts.forEach(t => String(t ?? '').replace(RE, (_, k) => { const v = `{{${k.toLowerCase()}}}`; if (!out.includes(v)) out.push(v); return _; }));
  return out;
}

// Pending items: onboarding templates look at missing client information first, everything else at open tasks.
function pendingItems(s, { clientId, marketplaceId, serviceId, category }) {
  const csIds = s.clientServices.filter(c => c.clientId === clientId && (!marketplaceId || c.marketplaceId === marketplaceId) && (!serviceId || c.serviceId === serviceId)).map(c => c.id);
  const reqs = () => s.onboardingRecords.filter(r => csIds.includes(r.clientServiceId)).flatMap(r => pendingReqs(s, r.id)).map(r => r.name);
  const tasks = () => s.tasks.filter(t => t.clientId === clientId && t.status !== 'Completed' && (!marketplaceId || t.marketplaceId === marketplaceId) && (!serviceId || t.serviceId === serviceId)
    && t.month === ym(new Date())).map(t => t.name);
  const lists = category === 'Onboarding' ? [reqs, tasks] : [tasks, reqs];
  for (const f of lists) { const l = f(); if (l.length) return l.map(x => '• ' + x).join('\n'); }
  return '';
}

// sel: { clientId, marketplaceId, serviceId, taskId, issueId, reportId, employee, category }
export function buildContext(s, sel) {
  const client = by(s.clients, sel.clientId), task = by(s.tasks, sel.taskId), issue = by(s.issues, sel.issueId), report = by(s.reports, sel.reportId);
  const reportCycle = report && by(s.cycles, report.cycleId);
  const baseMonth = reportCycle?.month || task?.month || ym(new Date());
  return {
    client_name: client?.name || '',
    company_name: client?.company || '',
    contact_name: client?.contact || client?.name || '',
    marketplace: by(s.marketplaces, sel.marketplaceId)?.name || '',
    service_name: by(s.services, sel.serviceId)?.name || '',
    month: client ? monthLabel(task?.month || ym(new Date())) : '',
    next_month: client ? monthLabel(addMonth(baseMonth, 1)) : '',
    report_period: reportCycle ? monthLabel(reportCycle.month) : '',
    employee_name: (sel.employee || '').trim() || task?.assignee || '',
    task_name: task?.name || '',
    issue_name: issue?.title || '',
    pending_items: client ? pendingItems(s, { ...sel }) : '',
  };
}

// MVP 3D: context for a LEAD (no client exists yet). Same variable names, filled from the lead record.
export function buildLeadContext(lead, sel = {}) {
  const base = ym(new Date()), mp = Array.isArray(lead.marketplace) ? lead.marketplace : [lead.marketplace];
  return {
    client_name: lead.contactName || lead.leadName || '', company_name: lead.companyName || lead.leadName || '', contact_name: lead.contactName || lead.leadName || '',
    marketplace: mp.filter(Boolean).join(', '), service_name: lead.service || '', month: monthLabel(base), next_month: monthLabel(addMonth(base, 1)),
    report_period: '', employee_name: (sel.employee || '').trim(), task_name: '', issue_name: '', pending_items: '',
  };
}
