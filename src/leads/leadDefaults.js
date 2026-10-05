// MVP 3D: Leads - constants, small pure helpers and demo leads.
// Leads live in state.leads (same localStorage state as everything else, so Export/Import backup includes them).
// Marketplaces and services are stored by NAME and always chosen from the existing Settings / Service Templates lists.
import { uid, fmtDate, fmtISO } from '../data/util.js';

export const STATUSES = ['New', 'Contacted', 'Interested', 'Proposal Sent', 'Discussion', 'Won', 'Lost'];
export const SOURCES = ['LinkedIn', 'Website', 'Referral', 'Cold Outreach', 'Facebook', 'Instagram', 'WhatsApp', 'Email', 'Marketplace', 'Other'];
// Special filter values (not real statuses).
export const PENDING = '__pending', CLIENT = '__client';

export const mpList = l => Array.isArray(l.marketplace) ? l.marketplace : l.marketplace ? [l.marketplace] : [];
export const leadTitle = l => l.companyName || l.leadName || 'Unnamed lead';
// A lead counts as converted only while its client still exists (a deleted client frees the lead to be converted again).
export const convertedClient = (s, l) => l.convertedClientId ? s.clients.find(c => c.id === l.convertedClientId) : undefined;
export const isConverted = (s, l) => !!convertedClient(s, l);
export const conversionPending = (s, l) => l.status === 'Won' && !isConverted(s, l);
export const shortDate = iso => iso ? fmtDate(fmtISO(new Date(iso))) : '—';
export const stamp = iso => new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export const marketplaceOptions = s => [...new Set([...s.marketplaces.map(m => m.name), 'Other'])];
export const serviceOptions = s => [...new Set([...s.services.map(x => x.name), 'Other'])];

export const blankLead = () => ({ leadName: '', companyName: '', contactName: '', email: '', phone: '', website: '', businessType: '', source: '', marketplace: [], service: '', status: 'New', notes: '', proposalId: '', proposalName: '', proposalSentAt: '', convertedClientId: '' });

// Demo leads (only seeded together with the demo clients, flagged demo:true so Settings -> Clear demo data removes them).
export function demoLeads(s) {
  const day = n => new Date(Date.now() - n * 864e5).toISOString();
  const prop = re => (s.proposals || []).find(p => re.test(p.name));
  const mk = (o, age, acts) => ({
    ...blankLead(), id: uid('led'), leadName: o.name, companyName: o.name, contactName: o.contact, email: o.email, phone: o.phone, website: o.website || '', businessType: o.type,
    source: o.source, marketplace: o.mp, service: o.service, status: o.status, notes: o.notes, proposalId: o.proposal?.id || '', proposalName: o.proposal?.name || '', proposalSentAt: o.sent ? day(o.sent) : '',
    createdAt: day(age), updatedAt: day(o.upd ?? age), demo: true, activity: [{ id: uid('lev'), at: day(age), text: 'Lead created' }, ...(acts || []).map(([n, text]) => ({ id: uid('lev'), at: day(n), text }))],
  });
  const myn = prop(/myntra/i), amz = prop(/amazon/i);
  return [
    mk({ name: 'ABC Traders (Demo)', contact: 'Rakesh Agarwal', email: 'rakesh@example.com', phone: '+91 90000 10001', type: 'Wholesale trader', source: 'LinkedIn', mp: ['Amazon'], service: 'Amazon Account Management', status: 'Interested', upd: 2,
      notes: 'Seller interested in Amazon account management.\nCurrently managing approximately 50 SKUs.\nRequested proposal before discussion.' }, 6, [[2, 'Status changed: New → Interested']]),
    mk({ name: 'XYZ Fashion (Demo)', contact: 'Priya Nair', email: 'priya@example.com', phone: '+91 90000 10002', type: 'Apparel brand', source: 'Referral', mp: ['Myntra'], service: 'Myntra Account Management', status: 'Proposal Sent', proposal: myn, sent: 1, upd: 1,
      notes: 'Referred by an existing client. Waiting for feedback on the proposal.' }, 9, [...(myn ? [[4, `Proposal assigned: ${myn.name}`]] : []), [1, 'Proposal marked sent — status changed Interested → Proposal Sent']]),
    mk({ name: 'Demo Brand (Demo)', contact: 'Karan Shah', email: 'karan@example.com', phone: '+91 90000 10003', type: 'D2C brand', source: 'Website', mp: ['Amazon'], service: 'Marketplace Listing & Cataloguing', status: 'New', upd: 0,
      notes: 'Enquiry from the website form.' }, 0),
    mk({ name: 'Sunrise Naturals (Demo)', contact: 'Meera Joshi', email: 'meera@example.com', phone: '+91 90000 10004', type: 'Wellness brand', source: 'WhatsApp', mp: ['Amazon'], service: 'Amazon Account Management', status: 'Won', proposal: amz, sent: 5, upd: 1,
      notes: 'Agreed to start. Client conversion is still pending.' }, 14, [...(amz ? [[7, `Proposal assigned: ${amz.name}`]] : []), [5, 'Proposal marked sent — status changed Interested → Proposal Sent'], [1, 'Status changed: Proposal Sent → Won']]),
  ];
}
