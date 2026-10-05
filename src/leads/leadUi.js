// Helpers shared by the lead list and the lead details modal.
const TPL = { New: 'General Service Introduction', Contacted: 'No Response Follow-up', Interested: 'Interested Lead Follow-up', 'Proposal Sent': 'Proposal Sent Follow-up', Discussion: 'Interested Lead Follow-up', Won: 'Welcome New Client' };
// Opens the existing MVP 3B generator with the lead as context (and a suitable starter template when one exists and is active).
export function generateForLead(ui, s, l) {
  const t = (s.communicationTemplates || []).find(x => x.active && x.name === TPL[l.status]);
  ui.open('genFromTemplate', { pre: { leadId: l.id, ...(t ? { templateId: t.id } : {}) } });
}
// MVP 3F: same generator, preferring a WhatsApp template (falls back to the status template). The generator's "Send via WhatsApp" does the rest.
export function whatsAppForLead(ui, s, l) {
  const all = (s.communicationTemplates || []).filter(x => x.active), t = all.find(x => x.channel === 'WhatsApp' && x.name === TPL[l.status]) || all.find(x => x.channel === 'WhatsApp') || all.find(x => x.name === TPL[l.status]);
  ui.open('genFromTemplate', { pre: { leadId: l.id, ...(t ? { templateId: t.id } : {}) } });
}
