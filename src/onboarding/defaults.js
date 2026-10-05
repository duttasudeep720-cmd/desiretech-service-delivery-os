// Default onboarding checklists. These are only SEED data: once loaded they live in localStorage
// (onboardingTemplates + onboardingTemplateItems) and are edited from the "Onboarding Templates" screen.
//
// Item shape: { kind: 'task' | 'requirement', name, description, category, priority,
//               clientDependency (tasks), required (requirements), key, auto }
//   key  'scope'            -> the "Service scope confirmed" task checked by the Ready-to-Start gate
//   auto 'client_info' / 'store_info' -> task is pre-completed when that data was already captured in the wizard
import { uid } from '../data/util.js';

const NO_PW = 'Do not share passwords or OTPs - invite DesireTech as a user instead.';
const T = (name, category, o = {}) => ({ kind: 'task', name, category, description: '', priority: 'Medium', clientDependency: false, required: true, key: '', auto: '', ...o });
const R = (name, category, o = {}) => ({ kind: 'requirement', name, category, description: '', priority: 'Medium', clientDependency: true, required: true, key: '', auto: '', ...o });

const head = access => [
  T('Client information collected', 'Client Info', { auto: 'client_info', priority: 'High', description: 'Client name, contact details and business type are recorded.' }),
  T(access, 'Account Access', { clientDependency: true, priority: 'High', description: 'Client has invited DesireTech as a user with the required permissions. ' + NO_PW }),
  T('Seller / store information recorded', 'Account Info', { auto: 'store_info', priority: 'High', description: 'Seller/store name, seller ID and store URL are recorded.' }),
  T('Business information collected', 'Business', { description: 'Legal entity, GST and business details checked against the documents received.' }),
];
const tail = [
  T('Service scope confirmed', 'Scope & Planning', { clientDependency: true, priority: 'High', key: 'scope', description: 'Client confirms what is and is not included in the service.' }),
  T('Communication channel confirmed', 'Communication', { clientDependency: true, description: 'Agree WhatsApp / email / call routine and the main point of contact.' }),
  T('First service plan created', 'Planning', { priority: 'High', description: 'Plan for the first monthly service cycle is prepared.' }),
];
const reviews = list => list.map(([n, c, p]) => T(n, c, p ? { priority: p } : {}));

const AMAZON = [
  ...head('Amazon seller account access confirmed'),
  ...reviews([['Product / category information collected', 'Catalog'], ['Existing catalog reviewed', 'Catalog'], ['Existing listings reviewed', 'Listings'], ['Existing advertising status reviewed', 'Advertising'],
    ['Inventory information reviewed', 'Inventory'], ['Pricing information reviewed', 'Pricing'], ['Account health reviewed', 'Account Health', 'High'], ['Existing issues recorded', 'Operations', 'High']]),
  ...tail,
  R('Amazon Seller ID', 'Account Info', { description: 'Merchant token / Seller ID from Seller Central (Settings > Account Info).' }),
  R('Amazon Seller Central user access', 'Account Access', { description: 'User invitation to DesireTech with the agreed permissions. ' + NO_PW }),
  R('Business / company details', 'Business', { description: 'Registered business name, address and contact.' }),
  R('GST information', 'Business', { description: 'GSTIN and GST registration certificate.' }),
  R('Brand information', 'Brand', { description: 'Brand name(s), logo and brand guidelines.' }),
  R('Product catalogue', 'Catalog', { description: 'SKU / ASIN list with MRP and stock status.' }),
  R('Product category information', 'Catalog', { description: 'Categories and sub-categories the products are sold in.' }),
  R('Brand Registry details', 'Brand', { required: false, description: 'Brand Registry status / authorization letter, if applicable.' }),
  R('Amazon Advertising console access', 'Advertising', { required: false, description: 'Advertising console user access (if advertising is in scope).' }),
  R('Pricing / MRP sheet', 'Pricing', { required: false }),
];

const MYNTRA = [
  ...head('Myntra Partner Portal access confirmed'),
  ...reviews([['Brand & approval status reviewed', 'Brand'], ['Existing catalog reviewed', 'Catalog'], ['Style quality & image compliance reviewed', 'Listings'], ['Inventory information reviewed', 'Inventory'],
    ['Pricing & MRP reviewed', 'Pricing'], ['Existing promotions reviewed', 'Advertising'], ['Orders & returns reviewed', 'Operations'], ['Existing account issues recorded', 'Operations', 'High']]),
  ...tail,
  R('Myntra seller / partner ID', 'Account Info', { description: 'Partner / vendor ID used on the Myntra Partner Portal.' }),
  R('Myntra Partner Portal user access', 'Account Access', { description: 'User access for DesireTech on the Partner Portal. ' + NO_PW }),
  R('Business / company details', 'Business', { description: 'Registered business name, address and contact.' }),
  R('GST information', 'Business', { description: 'GSTIN and GST registration certificate.' }),
  R('Product category information', 'Catalog', { description: 'Categories (e.g. men / women / kids, article types).' }),
  R('Brand information', 'Brand', { description: 'Brand name(s), logo and brand guidelines.' }),
  R('Brand approval / authorization letter', 'Brand', { description: 'Myntra brand approval, or authorization letter if the brand is not owned.' }),
  R('Product catalogue', 'Catalog', { description: 'Style list with sizes, MRP and stock.' }),
  R('Product images (high resolution)', 'Catalog', { description: 'Images meeting Myntra image guidelines.' }),
  R('Existing promotions / discount details', 'Advertising', { required: false }),
  R('Current pricing / MRP sheet', 'Pricing', { required: false }),
];

const FLIPKART = [
  ...head('Flipkart Seller Hub access confirmed'),
  ...reviews([['Product / category information collected', 'Catalog'], ['Existing catalog reviewed', 'Catalog'], ['Existing listings reviewed', 'Listings'], ['Inventory information reviewed', 'Inventory'],
    ['Pricing information reviewed', 'Pricing'], ['Existing promotions reviewed', 'Advertising'], ['Account health reviewed', 'Account Health', 'High'], ['Existing issues recorded', 'Operations', 'High']]),
  ...tail,
  R('Flipkart Seller ID', 'Account Info', { description: 'Seller ID from Flipkart Seller Hub.' }),
  R('Flipkart Seller Hub user access', 'Account Access', { description: 'Sub-user / access for DesireTech. ' + NO_PW }),
  R('Business / company details', 'Business'),
  R('GST information', 'Business', { description: 'GSTIN and GST registration certificate.' }),
  R('Brand information', 'Brand'),
  R('Product catalogue', 'Catalog', { description: 'SKU / FSN list with MRP and stock.' }),
  R('Product category information', 'Catalog'),
  R('Brand approval / authorization letter', 'Brand', { required: false }),
  R('Flipkart Ads access', 'Advertising', { required: false }),
];

const MEESHO = [
  ...head('Meesho Supplier Panel access confirmed'),
  ...reviews([['Product / category information collected', 'Catalog'], ['Existing catalog reviewed', 'Catalog'], ['Listing quality reviewed', 'Listings'], ['Inventory information reviewed', 'Inventory'],
    ['Pricing & shipping charges reviewed', 'Pricing'], ['Orders & returns reviewed', 'Operations'], ['Account health reviewed', 'Account Health', 'High'], ['Existing issues recorded', 'Operations', 'High']]),
  ...tail,
  R('Meesho Supplier ID', 'Account Info'),
  R('Meesho Supplier Panel user access', 'Account Access', { description: 'Panel access for DesireTech. ' + NO_PW }),
  R('Business / company details', 'Business'),
  R('GST information', 'Business', { description: 'GSTIN if registered; otherwise confirm the exemption.' }),
  R('Product catalogue', 'Catalog'),
  R('Product category information', 'Catalog'),
  R('Product images', 'Catalog', { required: false }),
  R('Pricing & shipping preferences', 'Pricing', { required: false }),
];

const BLINKIT = [
  ...head('Blinkit partner portal access confirmed'),
  ...reviews([['Product / category information collected', 'Catalog'], ['Existing catalog reviewed', 'Catalog'], ['Inventory & availability reviewed', 'Inventory'], ['Pricing & MRP reviewed', 'Pricing'],
    ['Warehouse / city coverage reviewed', 'Operations'], ['Existing promotions reviewed', 'Advertising'], ['Existing issues recorded', 'Operations', 'High']]),
  ...tail,
  R('Blinkit vendor / seller ID', 'Account Info'),
  R('Blinkit partner portal user access', 'Account Access', { description: 'Portal access for DesireTech. ' + NO_PW }),
  R('Business / company details', 'Business'),
  R('GST information', 'Business', { description: 'GSTIN and GST registration certificate.' }),
  R('Product catalogue', 'Catalog', { description: 'SKU list with MRP, pack size and shelf life.' }),
  R('Product category information', 'Catalog'),
  R('Warehouse / city coverage details', 'Operations', { description: 'Cities and warehouses currently serviced.' }),
  R('FSSAI license', 'Business', { required: false, description: 'Required for food / FMCG categories.' }),
];

const ADS = [
  ...head('Advertising account access confirmed'),
  ...reviews([['Existing campaigns reviewed', 'Advertising'], ['Current ad spend and ACOS / ROAS reviewed', 'Performance', 'High'], ['Keyword and targeting review done', 'Advertising'], ['Catalog readiness for ads reviewed', 'Catalog']]),
  T('Advertising budget confirmed', 'Advertising', { clientDependency: true, priority: 'High', description: 'Client confirms the monthly advertising budget.' }),
  ...tail,
  R('Advertising console user access', 'Account Access', { description: 'Ads console access for DesireTech. ' + NO_PW }),
  R('Monthly advertising budget', 'Advertising'),
  R('Advertising goals / target ACOS or ROAS', 'Advertising'),
  R('Hero products / priority SKUs', 'Catalog'),
  R('Business / company details', 'Business'),
  R('Existing campaign reports', 'Advertising', { required: false }),
];

const LISTING = [
  ...head('Marketplace account access confirmed'),
  ...reviews([['Existing catalog reviewed', 'Catalog'], ['Existing listings reviewed', 'Listings'], ['Category and attribute requirements reviewed', 'Catalog'], ['Image and content standards reviewed', 'Listings']]),
  ...tail,
  R('Product catalogue / SKU sheet', 'Catalog'),
  R('Product images', 'Catalog'),
  R('Product information (features, specs, USPs)', 'Catalog'),
  R('Brand guidelines', 'Brand'),
  R('Business / company details', 'Business'),
  R('Brand approval / authorization letter', 'Brand', { required: false }),
];

const GROWTH = [
  ...head('Marketplace account access confirmed'),
  ...reviews([['Sales history reviewed', 'Performance', 'High'], ['Competitor landscape reviewed', 'Performance'], ['Catalog and listing readiness reviewed', 'Catalog'], ['Growth opportunities identified', 'Planning']]),
  ...tail,
  R('Last 3 months sales reports', 'Performance'),
  R('Growth goals and targets', 'Planning'),
  R('Product catalogue', 'Catalog'),
  R('Business / company details', 'Business'),
  R('Competitor list', 'Performance', { required: false }),
  R('Growth budget', 'Planning', { required: false }),
];

// marketplaceId '' = applies to any marketplace (used when no marketplace-specific template exists)
export const DEFAULT_TEMPLATES = [
  { marketplaceId: 'mp_amazon', serviceId: 'sv_amz', items: AMAZON },
  { marketplaceId: 'mp_myntra', serviceId: 'sv_myn', items: MYNTRA },
  { marketplaceId: 'mp_flipkart', serviceId: 'sv_fk', items: FLIPKART },
  { marketplaceId: 'mp_meesho', serviceId: 'sv_mee', items: MEESHO },
  { marketplaceId: 'mp_blinkit', serviceId: 'sv_bli', items: BLINKIT },
  { marketplaceId: '', serviceId: 'sv_ads', items: ADS },
  { marketplaceId: '', serviceId: 'sv_cat', items: LISTING },
  { marketplaceId: '', serviceId: 'sv_gro', items: GROWTH },
];

export function seedOnboardingTemplates() {
  const onboardingTemplates = [], onboardingTemplateItems = [];
  DEFAULT_TEMPLATES.forEach(d => {
    const id = uid('otp'); onboardingTemplates.push({ id, marketplaceId: d.marketplaceId, serviceId: d.serviceId });
    d.items.forEach((it, order) => onboardingTemplateItems.push({ id: uid('oti'), templateId: id, ...it, order }));
  });
  return { onboardingTemplates, onboardingTemplateItems };
}

// Used when a service has no onboarding template at all (e.g. a custom service). Keeps onboarding usable.
export const BASIC_ITEMS = [
  ...head('Marketplace account access confirmed'),
  T('Existing catalog and listings reviewed', 'Catalog'),
  T('Existing issues recorded', 'Operations'),
  ...tail,
  R('Seller / account ID', 'Account Info'),
  R('Marketplace user access', 'Account Access', { description: NO_PW }),
  R('Business / company details', 'Business'),
  R('GST information', 'Business'),
  R('Product catalogue', 'Catalog'),
];
