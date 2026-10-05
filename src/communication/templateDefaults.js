// MVP 3A: Communication Template Library - constants + starter templates.
// Starter templates are SEED data only: they are written once (see migrate() in data/store.js) and then live in
// localStorage under state.communicationTemplates. Placeholders such as {{client_name}} are plain text for now.
import { uid } from '../data/util.js';

export const CATEGORIES = ['Sales', 'Follow-up', 'Onboarding', 'Service', 'Reporting', 'Retention'];
export const CHANNELS = ['Email', 'WhatsApp', 'SMS', 'General'];
export const VARIABLES = ['client_name', 'company_name', 'contact_name', 'marketplace', 'service_name', 'month', 'employee_name', 'task_name', 'issue_name', 'pending_items', 'report_period', 'next_month'].map(v => `{{${v}}}`);

const SIGN = '\n\nRegards,\nDesireTech';
// [name, category, marketplace, service, channel, subject, body, notes]
const STARTERS = [
  ['General Service Introduction', 'Sales', 'Any', 'Any', 'Email', 'How DesireTech can help grow your marketplace business',
    'Hello {{contact_name}},\n\nThank you for your interest in DesireTech.\n\nWe help brands and sellers launch, manage and grow their business on online marketplaces - from account setup and cataloguing to advertising, monthly account management and reporting.\n\nIf you share a little about {{company_name}} and the marketplaces you sell on, we can suggest the right service plan for you.' + SIGN, 'First message to a new enquiry.'],
  ['Amazon Marketplace Service Introduction', 'Sales', 'Amazon', 'Amazon Account Management', 'Email', 'Amazon account management for {{company_name}}',
    'Hello {{contact_name}},\n\nThank you for your interest in our {{service_name}} service.\n\nFor {{company_name}} on {{marketplace}}, DesireTech can take care of account health, listing quality, inventory and pricing checks, advertising optimisation and a clear monthly report - so you can focus on your products.\n\nWould you like us to share the detailed scope and next steps?' + SIGN, ''],
  ['Marketplace Management Introduction', 'Sales', 'Any', 'Any', 'WhatsApp', '',
    'Hello {{contact_name}},\n\nThis is DesireTech. We manage day-to-day marketplace operations for sellers - catalogue, listings, inventory, pricing, advertising and monthly reporting.\n\nWe would be happy to understand your requirements for {{company_name}} on {{marketplace}} and suggest a plan. When would be a good time to speak?' + SIGN, 'Short WhatsApp-friendly intro.'],
  ['Proposal Sent Follow-up', 'Follow-up', 'Any', 'Any', 'Email', 'Following up on our proposal for {{company_name}}',
    'Hello {{contact_name}},\n\nWe shared our proposal for {{service_name}} for {{company_name}} recently. We wanted to check whether you had a chance to go through it.\n\nIf you have any questions or would like us to adjust the scope, please let us know and we will be glad to help.' + SIGN, ''],
  ['Interested Lead Follow-up', 'Follow-up', 'Any', 'Any', 'WhatsApp', '',
    'Hello {{contact_name}},\n\nThank you for showing interest in DesireTech. We would love to help {{company_name}} grow on {{marketplace}}.\n\nCould you share a few details about your products and current sales so we can prepare the right plan for you?' + SIGN, ''],
  ['No Response Follow-up', 'Follow-up', 'Any', 'Any', 'Email', 'Checking in - {{company_name}}',
    'Hello {{contact_name}},\n\nWe reached out earlier about {{service_name}} for {{company_name}} and have not heard back, so we wanted to check in.\n\nIf now is not the right time, no problem - just let us know and we can reconnect whenever suits you.' + SIGN, 'Use after 5-7 days of silence.'],
  ['Welcome New Client', 'Onboarding', 'Any', 'Any', 'Email', 'Welcome to DesireTech',
    'Hello {{contact_name}},\n\nWelcome to DesireTech.\n\nWe have started the onboarding process for {{company_name}} and will guide you through the required steps for your {{marketplace}} account.\n\nWe will share the required information and next steps shortly.' + SIGN, ''],
  ['Onboarding Started', 'Onboarding', 'Any', 'Any', 'WhatsApp', '',
    'Hello {{contact_name}},\n\nThe onboarding for {{company_name}} ({{service_name}}) has started. {{employee_name}} from our team will be your point of contact during this stage.\n\nWe will keep you updated as each step is completed.' + SIGN, ''],
  ['Information Required', 'Onboarding', 'Any', 'Any', 'Email', 'Information required to start {{service_name}}',
    'Hello {{contact_name}},\n\nTo proceed with the setup of {{service_name}} for {{company_name}} on {{marketplace}}, we require the following:\n\n{{pending_items}}\n\nFor account access, please invite DesireTech as a user instead of sharing passwords or OTPs.\n\nOnce received, we will move to the next step.' + SIGN, ''],
  ['Missing Information Reminder', 'Onboarding', 'Any', 'Any', 'WhatsApp', '',
    'Hello {{contact_name}},\n\nA gentle reminder - we are still waiting for the following to continue the onboarding of {{company_name}}:\n\n{{pending_items}}\n\nPlease share these when you can so that we can avoid any delay in starting your service.' + SIGN, ''],
  ['Ready to Start', 'Onboarding', 'Any', 'Any', 'Email', 'Your {{service_name}} is ready to start',
    'Hello {{contact_name}},\n\nGood news - the onboarding for {{company_name}} is complete and everything is ready for {{service_name}} on {{marketplace}}.\n\nWe will begin the first service cycle for {{month}} and share regular updates with you.' + SIGN, ''],
  ['Service Progress Update', 'Service', 'Any', 'Any', 'WhatsApp', '',
    'Hello {{contact_name}},\n\nHere is your progress update for {{service_name}} ({{month}}) for {{company_name}}.\n\nWork is progressing as planned. Items still pending:\n{{pending_items}}\n\nPlease let us know if you have any questions.' + SIGN, ''],
  ['Task Completed', 'Service', 'Any', 'Any', 'General', '',
    'Hello {{contact_name}},\n\nWe have completed "{{task_name}}" for {{company_name}} on {{marketplace}}.\n\nWe will continue with the remaining activities for {{month}} and keep you informed.' + SIGN, ''],
  ['Issue Notification', 'Service', 'Any', 'Any', 'Email', 'Issue identified on your {{marketplace}} account',
    'Hello {{contact_name}},\n\nWhile working on {{service_name}} for {{company_name}}, we identified the following issue: {{issue_name}}.\n\nOur team is looking into it and we will update you as soon as we have progress. If anything is needed from your side, we will let you know.' + SIGN, ''],
  ['Issue Resolved', 'Service', 'Any', 'Any', 'General', '',
    'Hello {{contact_name}},\n\nThe issue "{{issue_name}}" on your {{marketplace}} account for {{company_name}} has been resolved.\n\nPlease let us know if you notice anything unusual. {{employee_name}} will continue to monitor it.' + SIGN, ''],
];

// `s` only needs `services` so the Service field can point at an existing service; otherwise it falls back to "Any".
export function seedCommTemplates(s) {
  const now = new Date().toISOString(), names = new Set((s?.services || []).map(x => x.name));
  return STARTERS.map(([name, category, marketplace, service, channel, subject, body, notes]) => ({
    id: uid('ctp'), name, category, marketplace, service: names.has(service) ? service : 'Any', channel, subject, body, notes,
    favorite: false, active: true, createdAt: now, updatedAt: now,
  }));
}
