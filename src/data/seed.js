import { uid, ym, addMonth, today, addDays } from './util.js';
import { planCycle, reportSections } from '../logic.js';
import { seedOnboardingTemplates } from '../onboarding/defaults.js';
import { demoOnboarding } from '../onboarding/demo.js';
import { seedCommTemplates } from '../communication/templateDefaults.js';
import { seedProposals } from '../proposals/proposalDefaults.js';
import { demoLeads } from '../leads/leadDefaults.js';

const AMZ = ['Account Health Check', 'Listing Performance Check', 'Inventory Check', 'Pricing Check', 'Buy Box Check', 'Keyword/Ranking Check', 'Ads Performance Check', 'Campaign Optimization', 'Search Term Analysis', 'Competitor Check', 'Sales Analysis', 'Returns/Issues Check', 'Account Issues/Tickets Check', 'Listing Issues Check', 'Client Recommendations', 'Client Progress Update', 'Monthly Report Preparation', 'Monthly Report Delivery'];
const MYN = ['Sales Performance Check', 'Catalog Check', 'Listing Quality Check', 'Inventory Check', 'Pricing Check', 'Orders Check', 'Returns Check', 'Campaign/Promotion Check', 'Product Performance Check', 'Competitor Check', 'Account Issues Check', 'Seller Support Issues Check', 'Growth Recommendations', 'Client Update', 'Monthly Report', 'Report Delivery'];
const FK = ['Sales Performance Check', 'Listing Quality Check', 'Inventory Check', 'Pricing Check', 'Orders & Returns Check', 'Promotions Check', 'Competitor Check', 'Account Issues Check', 'Growth Recommendations', 'Client Update', 'Monthly Report', 'Report Delivery'];
const ADS = ['Campaign Performance Check', 'Budget & Spend Check', 'ACOS / ROAS Review', 'Search Term Analysis', 'Keyword Bid Optimization', 'Negative Keyword Update', 'New Campaign / Ad Group Review', 'Competitor Ad Check', 'Client Recommendations', 'Client Progress Update', 'Monthly Report Preparation', 'Monthly Report Delivery'];
const MEE = ['Sales Performance Check', 'Catalog Check', 'Listing Quality Check', 'Inventory Check', 'Pricing Check', 'Orders Check', 'Returns Check', 'Ads / Promotions Check', 'Competitor Check', 'Account Issues Check', 'Growth Recommendations', 'Client Update', 'Monthly Report', 'Report Delivery'];
const BLI = ['Sales Performance Check', 'Catalog Check', 'Inventory & Availability Check', 'Pricing Check', 'Orders & Fulfilment Check', 'Returns / Quality Check', 'Promotions Check', 'Competitor Check', 'Account Issues Check', 'Growth Recommendations', 'Client Update', 'Monthly Report', 'Report Delivery'];
const pr = n => /Report|Health|Inventory|Buy Box|Issues|Update/i.test(n) ? 'High' : 'Medium';

// Monthly task templates for services that MVP 1 did not ship with, so every onboarding service can start a cycle.
// Only adds a (marketplace, service) pair that has no template yet. Pure on the arrays passed in.
export function addExtraServiceTemplates(serviceTemplates, templateTasks) {
  [['mp_amazon', 'sv_ads', ADS], ['mp_flipkart', 'sv_ads', ADS], ['mp_meesho', 'sv_mee', MEE], ['mp_blinkit', 'sv_bli', BLI]].forEach(([m, sid, names]) => {
    if (serviceTemplates.some(t => t.marketplaceId === m && t.serviceId === sid)) return;
    const id = uid('tpl'); serviceTemplates.push({ id, marketplaceId: m, serviceId: sid });
    names.forEach((n, i) => templateTasks.push({ id: uid('tt'), templateId: id, name: n, description: '', priority: pr(n), order: i }));
  });
}
export function baseState() {
  const marketplaces = [['amazon', 'Amazon'], ['myntra', 'Myntra'], ['flipkart', 'Flipkart'], ['meesho', 'Meesho'], ['blinkit', 'Blinkit']].map(([id, name]) => ({ id: 'mp_' + id, name }));
  const services = [['amz', 'Amazon Account Management'], ['myn', 'Myntra Account Management'], ['fk', 'Flipkart Account Management'], ['mee', 'Meesho Account Management'], ['bli', 'Blinkit Services'], ['cat', 'Marketplace Listing & Cataloguing'], ['ads', 'Marketplace Advertising'], ['gro', 'Marketplace Growth']].map(([id, name]) => ({ id: 'sv_' + id, name }));
  const serviceTemplates = [], templateTasks = [];
  [['mp_amazon', 'sv_amz', AMZ], ['mp_myntra', 'sv_myn', MYN], ['mp_flipkart', 'sv_fk', FK]].forEach(([m, sid, names]) => {
    const id = uid('tpl'); serviceTemplates.push({ id, marketplaceId: m, serviceId: sid });
    names.forEach((n, i) => templateTasks.push({ id: uid('tt'), templateId: id, name: n, description: '', priority: pr(n), order: i }));
  });
  addExtraServiceTemplates(serviceTemplates, templateTasks);
  return { v: 1, meta: { taskSeq: 0, onbSeq: 0, mvp2: true, mvp3a: true, mvp3c: true, mvp3d: true }, marketplaces, services, serviceTemplates, templateTasks, clients: [], clientServices: [], cycles: [], tasks: [], issues: [], communications: [], reports: [],
    clientAccounts: [], onboardingRecords: [], onboardingTasks: [], onboardingRequirements: [], onboardingEvents: [], ...seedOnboardingTemplates(), communicationTemplates: seedCommTemplates({ services }), proposals: seedProposals(), leads: [] };
}

// DEMO DATA: all demo clients carry demo:true and "(Demo)" in the company name. Remove via Settings → Clear demo data.
export function demoState() {
  const s = baseState(), cm = ym(new Date()), pm = addMonth(cm, -1), td = today();
  const mkClient = (name, company, email, phone, notes, startMonths) => { const c = { id: uid('cli'), name, company, contact: name, email, phone, status: 'Active', startDate: addMonth(cm, -startMonths) + '-05', notes, demo: true }; s.clients.push(c); return c; };
  const addCS = (c, mp, sv) => { const cs = { id: uid('cs'), clientId: c.id, marketplaceId: mp, serviceId: sv }; s.clientServices.push(cs); return cs; };
  // plan chars: C done, I in progress, B blocked, O pending+overdue, P pending
  const run = (cs, month, plan, res = {}, rel = true) => {
    const p = planCycle(s, cs.id, month); s.meta.taskSeq = p.seq; s.cycles.push(p.cycle); const n = plan.length;
    p.tasks.forEach((t, i) => {
      const k = plan[i] || 'P', r = res[i];
      if (k === 'C') { t.status = 'Completed'; t.assignee = 'DesireTech Team'; if (rel) { t.dueDate = addDays(td, -(2 + (n - i) % 6)); t.completedAt = addDays(td, -(1 + i % 2)); } else t.completedAt = t.dueDate; }
      if (k === 'I') { t.status = 'In Progress'; t.assignee = 'DesireTech Team'; if (rel) t.dueDate = td; }
      if (k === 'B') { t.status = 'Blocked'; if (rel) t.dueDate = addDays(td, -1); }
      if (k === 'O' && rel) t.dueDate = addDays(td, -2);
      if (k === 'P' && rel) t.dueDate = addDays(td, 1 + i % 9);
      if (r) { t.result = r[0] || ''; t.notes = r[1] || ''; t.issue = r[2] || ''; }
    });
    s.tasks.push(...p.tasks); return p.cycle;
  };
  const issue = (c, cs, title, description, priority, status, extra = {}) => s.issues.push({ id: uid('iss'), title, clientId: c.id, marketplaceId: cs.marketplaceId, serviceId: cs.serviceId, taskId: '', description, priority, status, resolution: '', notes: '', createdAt: td, resolvedAt: '', ...extra });
  const comm = (c, daysAgo, type, message, status = 'Sent') => s.communications.push({ id: uid('com'), clientId: c.id, date: addDays(td, -daysAgo), type, message, status });

  // Client 1: Amazon seller
  const c1 = mkClient('Aarav Mehta', 'Mehta Home Essentials (Demo)', 'aarav@example.com', '+91 90000 00001', 'Demo client — home & kitchen brand on Amazon.', 4);
  const cs1 = addCS(c1, 'mp_amazon', 'sv_amz');
  const prev1 = run(cs1, pm, 'CCCCCCCCCCCCCCCCCC', { 6: ['ACOS reduced from 27% to 24%.', 'Trimmed wasteful search terms.'] }, false);
  const cur1 = run(cs1, cm, 'CCCCCCCCCCCIIBPPPP', {
    0: ['No policy warnings; order defect rate within target.', 'Reviewed Account Health dashboard.'],
    2: ['3 SKUs flagged low on stock; reorder list shared.', 'Checked FBA inventory and stranded units.'],
    6: ['ACOS improved from 24% to 19%.', 'Paused high-ACOS keywords and increased bids on converting keywords.'],
    13: ['', 'Listing content lock on 2 ASINs.', 'Waiting for client: Brand Registry authorization letter.'] });
  const blocked1 = s.tasks.find(t => t.cycleId === cur1.id && t.status === 'Blocked');
  issue(c1, cs1, 'Content change blocked on 2 ASINs', 'Brand Registry authorization is needed to edit locked listing content.', 'High', 'Waiting for Client', { taskId: blocked1.id, notes: 'Requested from client.' });
  issue(c1, cs1, 'Suppressed ASIN — missing image', 'One listing suppressed for main-image compliance.', 'Medium', 'Resolved', { resolution: 'Compliant image uploaded; listing reactivated.', resolvedAt: td });
  comm(c1, 3, 'Information Request', 'Hi Aarav,\n\nTo proceed with the current marketplace activities, we require the Brand Registry authorization letter.\n\nOnce received, we will proceed with the pending activities.\n\nRegards,\nDesireTech');
  comm(c1, 20, 'Monthly Report', 'Hi Aarav,\n\nYour last month service report for Amazon Account Management is ready.\n\nRegards,\nDesireTech');
  const r1 = { id: uid('rep'), cycleId: prev1.id, clientId: c1.id, status: 'Final', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  r1.sections = reportSections(s, prev1, { recommendations: 'Add 6 new long-tail keywords to top campaigns.', nextPlan: 'Focus on listing content upgrades and Buy Box monitoring.' }); s.reports.push(r1);

  // Client 2: Myntra seller
  const c2 = mkClient('Neha Kapoor', 'Kapoor Ethnic Wear (Demo)', 'neha@example.com', '+91 90000 00002', 'Demo client — ethnic wear brand on Myntra.', 2);
  const cs2 = addCS(c2, 'mp_myntra', 'sv_myn');
  run(cs2, cm, 'CCCCCIOPPPPPPPPP', {
    0: ['Sales up 8% vs last month; 2 styles drive ~40% of revenue.', 'Reviewed Myntra seller dashboard.'],
    1: ['12 styles flagged for image quality.', 'Resubmission list prepared.'] });
  issue(c2, cs2, 'Catalog rejection — 12 styles', 'Images rejected for quality; fresh photos needed.', 'High', 'Open');
  comm(c2, 1, 'Progress Update', 'Hi Neha,\n\nHere is your progress update for Myntra Account Management: 5 of 16 activities completed.\n\nRegards,\nDesireTech', 'Pending');

  // Client 3: Amazon + Flipkart seller
  const c3 = mkClient('Rohit Sinha', 'Sinha Gadgets (Demo)', 'rohit@example.com', '+91 90000 00003', 'Demo client — electronics accessories on Amazon and Flipkart.', 6);
  const cs3a = addCS(c3, 'mp_amazon', 'sv_amz'), cs3b = addCS(c3, 'mp_flipkart', 'sv_fk');
  run(cs3a, cm, 'CCCCCCCCCCCCCCCCCP', { 6: ['ACOS steady at 17%; ad spend within budget.', 'Moved budget to top-converting campaigns.'] });
  run(cs3b, cm, 'CCCIPPPPPPPP', { 0: ['Flipkart sales stable; 3 SKUs trending up.', ''] });
  issue(c3, cs3b, 'Price mismatch on 4 SKUs', 'Flipkart prices differ from agreed MRP list.', 'Medium', 'In Progress');
  comm(c3, 5, 'Recommendation', 'Hi Rohit,\n\nBased on our review, we recommend increasing stock on the top 3 SKUs before the festive season.\n\nRegards,\nDesireTech');
  const d = demoOnboarding(s); // MVP 2: three demo clients at different onboarding stages
  return { ...d, leads: [...(d.leads || []), ...demoLeads(d)] }; // MVP 3D: four demo leads
}
