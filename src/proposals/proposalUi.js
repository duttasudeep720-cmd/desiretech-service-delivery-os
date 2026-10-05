import { copyText } from '../ui.jsx';
import { duplicateProposal } from './proposalActions.js';

export const copyProposal = (ui, p) => copyText(p.content || '').then(() => ui.toast('Proposal content copied'));
// Opens the existing MVP 3B generator; pre-selects the "Proposal Sent Follow-up" template when it exists and is active.
export function createMessageFrom(ui, s) {
  const t = (s.communicationTemplates || []).find(x => x.active && x.name === 'Proposal Sent Follow-up');
  ui.open('genFromTemplate', { pre: t ? { templateId: t.id } : {} });
}
export function duplicateAndEdit(ui, id) { const n = duplicateProposal(id); ui.toast('Duplicated as a Draft copy.'); ui.open('proposal', { id: n }); }
