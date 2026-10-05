import { useEffect, useMemo, useState } from 'react';
import { UI } from './ui.jsx';
import { TaskModal, IssueModal, MessageModal, ClientModal, AddTaskModal, NoteModal } from './modals.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Clients, { ClientDetail } from './pages/Clients.jsx';
import Tasks from './pages/Tasks.jsx';
import Issues from './pages/Issues.jsx';
import Communication from './pages/Communication.jsx';
import Reports from './pages/Reports.jsx';
import Templates from './pages/Templates.jsx';
import Settings from './pages/Settings.jsx';
import OnboardingPage from './onboarding/OnboardingPage.jsx';
import OnboardingDetail from './onboarding/OnboardingDetail.jsx';
import OnboardingTemplates from './onboarding/OnboardingTemplates.jsx';
import { NewClientModal } from './onboarding/NewClientWizard.jsx';
import { OnbTaskModal, OnbReqModal } from './onboarding/onbModals.jsx';
import CommTemplateModal from './communication/TemplateModal.jsx';
import { GenerateFromTemplateModal } from './communication/MessageGenerator2.jsx';
import ViewMessageModal from './communication/ViewMessageModal.jsx';
import ProposalModal from './proposals/ProposalModal.jsx';
import ProposalPreviewModal from './proposals/ProposalPreviewModal.jsx';
import LeadsPage from './leads/LeadsPage.jsx';
import LeadModal from './leads/LeadModal.jsx';
import LeadDetailModal from './leads/LeadDetailModal.jsx';
import AssignProposalModal from './leads/AssignProposalModal.jsx';
import ConvertLeadModal from './leads/ConvertLeadModal.jsx';

const NAV = [['dashboard', 'Dashboard'], ['leads', 'Leads'], ['onboarding', 'Onboarding'], ['clients', 'Clients'], ['tasks', 'Tasks'], ['issues', 'Issues'], ['communication', 'Communication'], ['reports', 'Reports'], ['templates', 'Service Templates'], ['onboarding-templates', 'Onboarding Templates'], ['settings', 'Settings']];
const MODALS = { task: TaskModal, issue: IssueModal, message: MessageModal, client: ClientModal, addTask: AddTaskModal, note: NoteModal, newClient: NewClientModal, onbTask: OnbTaskModal, onbReq: OnbReqModal, commTemplate: CommTemplateModal, genFromTemplate: GenerateFromTemplateModal, viewMessage: ViewMessageModal, proposal: ProposalModal, proposalView: ProposalPreviewModal, lead: LeadModal, leadView: LeadDetailModal, assignProposal: AssignProposalModal, convertLead: ConvertLeadModal };
function useRoute() {
  const [h, setH] = useState(location.hash || '#/dashboard');
  useEffect(() => { const f = () => setH(location.hash || '#/dashboard'); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  const [, page = 'dashboard', id] = h.split('/'); return { page, id };
}
export default function App() {
  const { page, id } = useRoute(); const [modal, setModal] = useState(null), [nav, setNav] = useState(false), [toast, setToast] = useState('');
  const ui = useMemo(() => ({ open: (type, props = {}) => setModal({ type, props }), close: () => setModal(null), toast: m => { setToast(m); setTimeout(() => setToast(''), 3200); } }), []);
  const M = modal && MODALS[modal.type]; useEffect(() => setNav(false), [page]);
  const view = page === 'clients' ? (id ? <ClientDetail id={id} /> : <Clients />) : page === 'tasks' ? <Tasks /> : page === 'issues' ? <Issues />
    : page === 'communication' ? <Communication tab={id} /> : page === 'reports' ? <Reports id={id} /> : page === 'templates' ? <Templates /> : page === 'onboarding' ? (id ? <OnboardingDetail key={id} id={id} /> : <OnboardingPage />) : page === 'onboarding-templates' ? <OnboardingTemplates /> : page === 'leads' ? <LeadsPage arg={id} /> : page === 'settings' ? <Settings /> : <Dashboard />;
  return <UI.Provider value={ui}>
    <div className="shell">
      <aside className={'side' + (nav ? ' open' : '')}><div className="brand"><b>DESIRETECH</b><small>Desire – Launch – Sell – Grow – Scale</small></div>
        <button className="burger" onClick={() => setNav(!nav)}>☰</button>
        <nav>{NAV.map(([k, l]) => <a key={k} href={'#/' + k} className={page === k ? 'on' : ''}>{l}</a>)}</nav></aside>
      <main>{view}</main></div>
    {M && <M {...modal.props} />}{toast && <div className="toast">{toast}</div>}
  </UI.Provider>;
}
