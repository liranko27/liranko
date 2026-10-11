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
  if (kind === 'phone') return 'tel:0586567657';

  const normalized = (business.whatsapp || business.phone).replace(/\D/g, '');
  if (!/^972\d{9}$/.test(normalized)) return undefined;

  const message = 'שלום לירן, הגעתי דרך האתר ואני מעוניין לקבל פרטים על עבודת חשמל.';
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
