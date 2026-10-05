// MVP 3C: Proposal Library - constants + starter proposals.
// Starters are SEED data only: written once by migrate() (meta.mvp3c) and then edited/deleted freely by the user.
// Variables such as {{company_name}} are stored as plain text; they are NOT replaced in this MVP.
import { uid } from '../data/util.js';

export const CLIENT_TYPES = ['New Seller', 'Existing Seller', 'Brand', 'Manufacturer', 'D2C Business', 'Marketplace Seller', 'Small Business', 'Enterprise', 'Other'];
export const STATUSES = ['Draft', 'Active', 'Archived'];
export const EXTRA_CATEGORIES = ['Marketplace Management', 'Digital Growth', 'Other'];
export const PROPOSAL_VARIABLES = ['client_name', 'company_name', 'contact_name', 'marketplace', 'service_name', 'month', 'pricing', 'employee_name'].map(v => `{{${v}}}`);
// Category list = marketplaces already in Settings + the extra categories (no second marketplace list is kept).
export const categoryOptions = s => [...new Set([...s.marketplaces.map(m => m.name), ...EXTRA_CATEGORIES])];
export const proposalMarketplaceOptions = s => [...new Set(['Any', ...s.marketplaces.map(m => m.name), 'Other'])];
export const proposalServiceOptions = s => [...new Set(['Any', ...s.services.map(x => x.name), 'Other'])];

const num = a => a.map((x, i) => `${i + 1}. ${x}`).join('\n'), bul = a => a.map(x => '• ' + x).join('\n');
const TERMS = [
  'Services start after onboarding is complete and the required access and information have been received.',
  'Fees, billing cycle and payment terms are confirmed in writing before work begins.',
  'Results depend on marketplace policies, competition, product quality and customer demand. DesireTech does not guarantee specific sales, rankings or timelines.',
  'Account access is shared through user invitations. Passwords and OTPs must not be shared with DesireTech.',
  'Either party may end the service with written notice, as agreed at the start of the engagement.',
];
const ADS = 'Advertising budgets are paid by the client directly to the marketplace and are separate from DesireTech fees.';
const PRICING = 'Fees depend on the scope of work, the number of products (SKUs) and the marketplaces covered. A detailed quote is shared after we understand your requirement.\n\nProposed investment: {{pricing}}';
const NEXT = ['Share your marketplace account details and current requirements.', 'We confirm the scope and the proposed investment.', 'We start onboarding for {{company_name}}.', 'Your first monthly plan is shared with you.'];

// Builds the full proposal text from the section fields (12-part DesireTech structure).
function compose(title, f) {
  return `DESIRETECH

${title}

Prepared for:
{{company_name}}
Attention: {{contact_name}}

1. About DesireTech
DesireTech helps brands and sellers launch, sell, grow and scale on online marketplaces. We combine hands-on marketplace operations with clear updates and monthly reporting, so you always know what has been done and what comes next.

2. Understanding Your Requirement
${f.problem}

3. Objective
${f.description}

4. Proposed Services
${bul(f.servicesIncluded.split('\n'))}

5. Deliverables
${f.deliverables}

6. Our Process
${f.process}

7. Expected Benefits
${f.benefits}

8. Client Requirements
${f.requirements}

9. Investment / Pricing
${f.pricing}

10. Terms
${f.terms}

11. Next Steps
${f.callToAction}

12. Contact
DesireTech
{{employee_name}}

Regards,
DesireTech`;
}

// name, category, marketplace, service, target, f{...}
const STARTERS = [
  ['Amazon Account Management Proposal', 'Amazon', 'Amazon', 'Amazon Account Management', 'Existing Seller', {
    description: 'Monthly management of your existing Amazon seller account covering account health, listings, inventory, pricing, advertising and reporting.',
    problem: 'Running an Amazon account needs steady attention. Account health, stock levels, pricing, listing quality and advertising all affect sales, and many sellers do not have the time or in-house expertise to monitor all of them every month.',
    servicesIncluded: ['Account health monitoring', 'Listing quality and content review', 'Inventory and pricing checks', 'Buy Box monitoring', 'Amazon Ads management and optimisation', 'Search term and keyword analysis', 'Competitor checks', 'Issue and ticket follow-up', 'Monthly client update and report'].join('\n'),
    deliverables: bul(['Monthly activity checklist, completed and tracked', 'Issue log with status and resolution', 'Recommendations for listings, pricing, inventory and advertising', 'Monthly service report']),
    process: num(['Account review and onboarding', 'Monthly service plan agreed with you', 'Ongoing monitoring and optimisation', 'Issue handling and follow-up with Seller Support', 'Regular progress updates', 'Monthly report and next-month plan']),
    benefits: bul(['Clear visibility of account health and open issues', 'Faster response to listing, stock and pricing problems', 'Consistent advertising review and optimisation', 'Less of your own time spent on day-to-day account work', 'A structured monthly report you can act on']),
    requirements: bul(['User access to your Amazon seller account (by invitation, not passwords)', 'Brand Registry details, if applicable', 'Current product, pricing and stock information', 'One main point of contact for approvals']),
    pricing: PRICING, terms: bul([...TERMS, ADS]), callToAction: bul(NEXT) }],
  ['Amazon Seller Launch Proposal', 'Amazon', 'Amazon', 'Amazon Seller Setup / Launch', 'New Seller', {
    description: 'End-to-end support to set up your Amazon seller presence and launch your first products, then move into monthly management.',
    problem: 'Starting on Amazon involves account registration, documentation, catalogue creation and listing compliance. Mistakes at this stage can delay your launch or lead to rejected listings.',
    servicesIncluded: ['Seller account registration guidance', 'Document and compliance checklist', 'Brand Registry guidance, where applicable', 'Catalogue and product listing creation', 'Image and content guidelines for listings', 'Initial pricing and inventory setup', 'Initial advertising setup', 'Handover into monthly account management'].join('\n'),
    deliverables: bul(['Launch checklist with status tracking', 'Listings created for the agreed products', 'Content and image guidance for each listing', 'Initial advertising structure', 'Launch summary and recommended next steps']),
    process: num(['Requirement discussion and product review', 'Account setup guidance and document checklist', 'Catalogue preparation', 'Listing creation and quality check', 'Pricing, inventory and advertising setup', 'Go-live review and handover']),
    benefits: bul(['A structured and compliant start on Amazon', 'Fewer listing rejections and rework', 'Faster path from account to first live products', 'A clear plan for the first months of selling']),
    requirements: bul(['Business and tax documents, submitted by you to the marketplace', 'Product details, images and pricing', 'Brand and trademark details, if applicable', 'Stock availability and fulfilment plan']),
    pricing: PRICING, terms: bul([...TERMS, ADS]), callToAction: bul(NEXT) }],
  ['Marketplace Management Proposal', 'Marketplace Management', 'Any', 'Marketplace Account Management', 'Marketplace Seller', {
    description: 'Day-to-day management of your seller accounts across one or more marketplaces with one process and one monthly report.',
    problem: 'Selling on several marketplaces multiplies the daily work. Each platform has its own catalogue rules, account health measures, promotions and support channels.',
    servicesIncluded: ['Account monitoring on each marketplace', 'Catalogue and listing management', 'Inventory and pricing checks', 'Order and returns review', 'Promotion and campaign support', 'Issue and seller-support follow-up', 'Competitor checks', 'Monthly client update and report'].join('\n'),
    deliverables: bul(['Monthly plan for each marketplace', 'Completed activity checklists', 'Issue log with resolutions', 'Consolidated monthly report']),
    process: num(['Review of your current marketplace accounts', 'Onboarding and access setup', 'Monthly plan per marketplace', 'Ongoing management and issue follow-up', 'Progress updates', 'Monthly report and next-month plan']),
    benefits: bul(['One team and one process across marketplaces', 'Consistent catalogue and pricing standards', 'Issues noticed and followed up earlier', 'A single monthly view of performance']),
    requirements: bul(['User access to each marketplace account (by invitation, not passwords)', 'Current catalogue, pricing and stock information', 'A main point of contact for approvals']),
    pricing: PRICING, terms: bul(TERMS), callToAction: bul(NEXT) }],
  ['Myntra Seller Management Proposal', 'Myntra', 'Myntra', 'Myntra Account Management', 'Existing Seller', {
    description: 'Monthly management of your Myntra seller account covering catalogue quality, orders, returns, promotions and reporting.',
    problem: 'Fashion sellers on Myntra must keep catalogue quality high, manage returns and respond to platform requirements and campaigns. Rejected styles and missed promotions directly affect sales.',
    servicesIncluded: ['Catalogue and listing quality checks', 'Catalogue rejection follow-up and resubmission', 'Style performance review', 'Inventory and pricing checks', 'Orders and returns review', 'Campaign and promotion support', 'Seller support issue follow-up', 'Monthly client update and report'].join('\n'),
    deliverables: bul(['Monthly activity checklist, completed and tracked', 'Resubmission list for rejected styles', 'Recommendations for catalogue, pricing and promotions', 'Monthly service report']),
    process: num(['Account and catalogue review', 'Monthly service plan agreed with you', 'Ongoing catalogue and order monitoring', 'Issue handling with seller support', 'Progress updates', 'Monthly report and next-month plan']),
    benefits: bul(['Fewer catalogue rejections and delays', 'Better visibility of style performance', 'Timely participation in suitable campaigns', 'Regular, structured reporting']),
    requirements: bul(['User access to your Myntra seller account (by invitation, not passwords)', 'Current catalogue, images and pricing information', 'Stock and return information', 'One main point of contact for approvals']),
    pricing: PRICING, terms: bul(TERMS), callToAction: bul(NEXT) }],
  ['Marketplace Growth & Management Proposal', 'Digital Growth', 'Any', 'Marketplace Growth', 'D2C Business', {
    description: 'Combined marketplace management and growth planning for D2C brands that want to scale sales on online marketplaces.',
    problem: 'D2C brands often have a strong product but limited marketplace experience. Growth needs more than account upkeep: it needs a plan for catalogue, advertising, promotions and regular performance review.',
    servicesIncluded: ['Marketplace account management', 'Growth plan for the agreed marketplaces', 'Catalogue and listing improvement', 'Advertising and promotion planning', 'Competitor and category analysis', 'Monthly performance review', 'Monthly growth report and recommendations'].join('\n'),
    deliverables: bul(['Growth plan with priorities for the coming months', 'Monthly activity checklist, completed and tracked', 'Monthly performance report', 'Recommendations and next-month plan']),
    process: num(['Brand, product and marketplace review', 'Growth plan and priorities agreed with you', 'Account management and execution', 'Advertising and promotion support', 'Monthly performance review', 'Report and plan for the next month']),
    benefits: bul(['A clear marketplace growth plan instead of ad-hoc effort', 'Regular management of the day-to-day account work', 'Better decisions through monthly performance review', 'One team for operations and growth']),
    requirements: bul(['User access to your marketplace accounts (by invitation, not passwords)', 'Brand, product and pricing information', 'Sales and advertising history, where available', 'A main point of contact for approvals']),
    pricing: PRICING, terms: bul([...TERMS, ADS]), callToAction: bul(NEXT) }],
];

export function seedProposals() {
  const now = new Date().toISOString();
  return STARTERS.map(([name, category, marketplace, service, targetClientType, f]) => ({
    id: uid('prp'), name, category, marketplace, service, targetClientType, ...f, content: compose(name, f),
    version: '1.0', status: 'Active', notes: '', favorite: false, createdAt: now, updatedAt: now,
  }));
}
