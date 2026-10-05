// DEMO DATA for MVP 2. All demo clients carry demo:true and "(Demo)" in the company name (Settings → Clear demo data removes them).
import { uid, today, addDays } from '../data/util.js';
import { addOnboarding, recalc } from './logic.js';

export function demoOnboarding(s0) {
  if (s0.clients.some(c => c.company === 'ABC Fashion (Demo)')) return s0;
  let s = JSON.parse(JSON.stringify(s0)); const td = today(), ago = n => addDays(td, -n);
  const evt = (c, onboardingId, daysAgo, text) => s.onboardingEvents.push({ id: uid('evt'), onboardingId: onboardingId || '', clientId: c.id, date: ago(daysAgo), at: ago(daysAgo) + 'T10:00:00.000Z', text });
  const mkClient = (name, company, email, phone, businessType, website, notes, daysAgo) => {
    const c = { id: uid('cli'), name, company, contact: name, email, phone, businessType, website, status: 'New Lead', startDate: '', notes, demo: true };
    s.clients.push(c); evt(c, '', daysAgo, 'Client created (New Lead)'); return c;
  };
  const acct = (c, marketplaceId, storeName, sellerId, storeUrl) => s.clientAccounts.push({ id: uid('acc'), clientId: c.id, marketplaceId, storeName, sellerId, storeUrl, accountStatus: 'Active', notes: '' });
  const start = (c, picks, createdAgo, dueIn) => { const r = addOnboarding(s, { clientId: c.id, selections: picks.map(([marketplaceId, serviceId]) => ({ marketplaceId, serviceId })), createdDate: ago(createdAgo), dueDate: addDays(td, dueIn) }); s = r.state; return r.ids; };
  const forRec = id => s.onboardingRequirements.filter(r => r.onboardingId === id), tasksOf = id => s.onboardingTasks.filter(t => t.onboardingId === id);
  const req = (id, name, status, daysAgo = 3) => { const r = forRec(id).find(x => x.name.startsWith(name)); if (!r) return; r.status = status; r.requestedAt = ago(daysAgo + 2);
    if (status === 'Received' || status === 'Verified') r.receivedAt = ago(daysAgo); if (status === 'Verified') r.verifiedAt = ago(Math.max(0, daysAgo - 1)); };
  const task = (id, name, status, daysAgo = 1) => { const t = tasksOf(id).find(x => x.name.startsWith(name)); if (!t) return; t.status = status; t.completedAt = status === 'Completed' ? ago(daysAgo) : ''; };
  const comm = (c, onboardingId, daysAgo, type, message, status = 'Sent') => s.communications.push({ id: uid('com'), clientId: c.id, date: ago(daysAgo), type, message, status, onboardingId });

  // Client 1 — ABC Fashion · Myntra · Waiting for Client (past its target date, so it also shows an Overdue alert)
  const c1 = mkClient('Rhea Malhotra', 'ABC Fashion (Demo)', 'rhea@example.com', '+91 90000 00011', 'Apparel brand', 'https://abcfashion.example.com', 'Demo — new Myntra seller, 40 styles.', 12);
  acct(c1, 'mp_myntra', 'ABC Fashion Official', 'MYN-48213', 'https://www.myntra.com/abc-fashion');
  const [r1] = start(c1, [['mp_myntra', 'sv_myn']], 12, -2);
  ['Myntra seller / partner ID', 'Myntra Partner Portal user access', 'Business / company details'].forEach(n => req(r1, n, 'Verified', 6));
  req(r1, 'GST information', 'Received', 4); req(r1, 'Product category information', 'Received', 4);
  ['Brand information', 'Brand approval', 'Product catalogue', 'Product images'].forEach(n => req(r1, n, 'Requested', 3));
  task(r1, 'Myntra Partner Portal access', 'Completed', 6); task(r1, 'Business information collected', 'Completed', 4); task(r1, 'Existing catalog reviewed', 'In Progress');
  evt(c1, r1, 9, 'Requirement "Myntra seller / partner ID": Not Requested → Verified'); evt(c1, r1, 3, 'Requested from client: Brand information, Brand approval / authorization letter, Product catalogue, Product images');
  comm(c1, r1, 3, 'Information Request', 'Hi Rhea,\n\nTo set up your Myntra Account Management on Myntra, please share the following:\n\n• Brand information\n• Brand approval / authorization letter\n• Product catalogue\n• Product images (high resolution)\n\nPlease do not share account passwords or OTPs — we will guide you on granting user access securely.\n\nOnce we receive these details, we can complete the setup and begin the service activities.\n\nRegards,\nDesireTech');

  // Client 2 — SehatSutra · Amazon · Ready to Start (everything done; try Start Service)
  const c2 = mkClient('Karan Sethi', 'SehatSutra (Demo)', 'karan@example.com', '+91 90000 00012', 'Health & wellness D2C', 'https://sehatsutra.example.com', 'Demo — wellness supplements brand on Amazon.', 9);
  acct(c2, 'mp_amazon', 'SehatSutra Wellness', 'A3DEMO1234XYZ', 'https://www.amazon.in/sp?seller=A3DEMO1234XYZ');
  const [r2] = start(c2, [['mp_amazon', 'sv_amz']], 9, 5);
  forRec(r2).forEach(r => req(r2, r.name, r.required ? 'Verified' : 'Not Required', 4)); tasksOf(r2).forEach(t => task(r2, t.name, 'Completed', 1));
  const rec2 = s.onboardingRecords.find(r => r.id === r2); rec2.status = 'Ready to Start'; rec2.readyAt = td;
  evt(c2, r2, 4, 'All required client information verified'); evt(c2, r2, 0, 'Marked Ready to Start');
  comm(c2, r2, 1, 'Onboarding Progress', 'Hi Karan,\n\nHere is an update on your Amazon Account Management onboarding on Amazon:\n\n• Overall progress: 100%\n\nRegards,\nDesireTech');

  // Client 3 — XYZ Brand · Amazon + Flipkart · Account Management + Advertising · Onboarding
  const c3 = mkClient('Vikram Shah', 'XYZ Brand (Demo)', 'vikram@example.com', '+91 90000 00013', 'Consumer electronics', 'https://xyzbrand.example.com', 'Demo — wants account management and advertising on Amazon and Flipkart.', 3);
  acct(c3, 'mp_amazon', 'XYZ Brand Store', 'A1XYZDEMO5678', ''); acct(c3, 'mp_flipkart', 'XYZ Brand', 'FKXYZ-2231', '');
  const ids3 = start(c3, [['mp_amazon', 'sv_amz'], ['mp_amazon', 'sv_ads'], ['mp_flipkart', 'sv_fk'], ['mp_flipkart', 'sv_ads']], 3, 11);
  req(ids3[0], 'Amazon Seller ID', 'Requested', 2); req(ids3[0], 'GST information', 'Requested', 2); task(ids3[0], 'Existing catalog reviewed', 'In Progress');
  evt(c3, ids3[0], 2, 'Requested from client: Amazon Seller ID, GST information');

  const old = new Set(s0.onboardingRecords.map(r => r.id));
  return recalc(s, s.onboardingRecords.filter(r => !old.has(r.id)).map(r => r.id));
}
