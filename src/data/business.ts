export const business = {
  name: 'LIRANKO | לירנקו – פתרונות חשמל',
  owner: 'לירן קוזוקרו',
  phone: '+972586567657',
  whatsapp: '972586567657',
  serviceArea: ['ראש העין', 'אזור המרכז', 'השרון'],
  domain: 'https://liranko.co.il',
  gtmId: '',
  qualification: 'לירן קוזוקרו | חשמלאי מוסמך | מתקין Shelly מורשה',
  servicesApproved: true,
  logo: '/logo.png',
  socialLinks: [] as string[],
};

export function contactUrl(kind: 'phone' | 'whatsapp', _service = '') {
  const raw = (kind === 'phone' ? business.phone : business.whatsapp || business.phone) ?? '';
  const digits = raw.replace(/\D/g, '');

  if (kind === 'phone') {
    if (!/^972\d{9}$/.test(digits)) return undefined;
    return `tel:${digits.replace(/^972/, '0')}`;
  }

  if (!/^972\d{9}$/.test(digits)) return undefined;

  const message = 'שלום לירן, הגעתי דרך האתר ואני מעוניין לקבל פרטים על עבודת חשמל.';
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
