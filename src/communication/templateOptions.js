// Dropdown options for the Communication Templates. Marketplaces come from Settings; services come from the
// services that already have a Service Template - no second list is kept.
export const marketplaceOptions = s => [...new Set(['Any', ...s.marketplaces.map(m => m.name), 'Other'])];
export const serviceOptions = s => {
  const ids = new Set(s.serviceTemplates.map(t => t.serviceId));
  return [...new Set(['Any', ...s.services.filter(x => ids.has(x.id)).map(x => x.name)])];
};
// Keep a saved value selectable even if it was renamed/removed elsewhere, so editing never silently changes it.
export const withCurrent = (list, cur) => cur && !list.includes(cur) ? [...list, cur] : list;
