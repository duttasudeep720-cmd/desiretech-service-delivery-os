// Pre-fill for the EXISTING New Client wizard when a lead is converted. Pure - no storage.
import { mpList } from './leadDefaults.js';

const norm = x => String(x || '').trim().toLowerCase();
export function leadPrefill(s, l) {
  const mpIds = mpList(l).map(n => s.marketplaces.find(m => norm(m.name) === norm(n))?.id).filter(Boolean);
  const sv = s.services.find(x => norm(x.name) === norm(l.service));
  // Same rule the wizard uses to offer a service on a marketplace: a monthly service template or an onboarding template exists.
  const offered = (mp, sid) => s.serviceTemplates.some(t => t.marketplaceId === mp && t.serviceId === sid) || s.onboardingTemplates.some(t => t.serviceId === sid && (t.marketplaceId === mp || !t.marketplaceId));
  return {
    form: { name: l.contactName || l.leadName || '', company: l.companyName || l.leadName || '', contact: l.contactName || '', email: l.email || '', phone: l.phone || '', website: l.website || '', businessType: l.businessType || '', notes: l.notes || '' },
    mpIds, keys: sv ? mpIds.filter(mp => offered(mp, sv.id)).map(mp => mp + '|' + sv.id) : [],
  };
}
