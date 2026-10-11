export interface Project { title: string; description: string; image: string; alt: string; width: number; height: number }

const jobs = import.meta.glob('../assets/Jobs/*.{jpeg,jpg,png,webp,avif}', {
  eager: true,
  import: 'default',
}) as Record<string, { src: string; width: number; height: number }>;

const curatedProjects = [
  {
    key: '../assets/Jobs/WhatsApp Image 2026-10-11 at 12.02.05 (1).jpeg',
    title: 'החלפת פס לד ושנאי בפרופיל לד שקוע',
    description: 'החלפת פס לד ושנאי בפרופיל לד שקוע עם תוצאה נקייה ואחידה.',
  },
  {
    key: '../assets/Jobs/WhatsApp Image 2026-10-11 at 12.02.05 (2).jpeg',
    title: 'התקנת גופי תאורה ופסי לד בסלון',
    description: 'התקנת גופי תאורה ופסי לד בקונסטרוקצית עץ בסלון.',
  },
  {
    key: '../assets/Jobs/WhatsApp Image 2026-10-11 at 12.02.05 (4).jpeg',
    title: 'הזזת והוספת נקודת תאורה מעל פינת אוכל',
    description: 'הזזת והוספת נקודת תאורה לתאורה מעל פינת אוכל עם מיקום חדש ומדויק.',
  },
  {
    key: '../assets/Jobs/WhatsApp Image 2026-10-11 at 12.02.05 (6).jpeg',
    title: 'לוח חלוקה לעמדת טעינה לרכב חשמלי',
    description: 'לוח חלוקה לעמדת טעינה לרכב חשמלי אחרי מונה, מותאם לדרישות ההתקנה.',
  },
  {
    key: '../assets/Jobs/WhatsApp Image 2026-10-11 at 12.02.05 (7).jpeg',
    title: 'הזזת נקודת תאורה במטבח לפרופיל לד “ר”',
    description: 'הזזת נקודת תאורה במטבח לפרופיל לד “ר” עם פתרון נקי ומסודר.',
  },
  {
    key: '../assets/Jobs/WhatsApp Image 2026-10-11 at 12.02.05.jpeg',
    title: 'הוספת נקודות תאורה תלויות בחדר שינה',
    description: 'הוספת נקודות תאורה תלויות ליד המיטה בחדר שינה.',
  },
  {
    key: '../assets/Jobs/WhatsApp Image 2026-10-11 at 12.02.06 (10).jpeg',
    title: 'תליית פרופיל לד צף במשרדי הייטק',
    description: 'תליית פרופיל לד צף במשרדי הייטק עם תאורה אחידה ומודרנית.',
  },
  {
    key: '../assets/Jobs/WhatsApp Image 2026-10-11 at 12.02.06 (2).jpeg',
    title: 'הזנה למנוע תריס חשמלי',
    description: 'הזנה למנוע תריס חשמלי והקמה של פתרון חשמלי תקין ומסודר.',
  },
  {
    key: '../assets/Jobs/WhatsApp Image 2026-10-11 at 12.02.06 (4).jpeg',
    title: 'הוספת פס לד בכניסה לבית',
    description: 'הוספת פס לד בכניסה לבית עם תאורה נקייה ומחמיאה.',
  },
  {
    key: '../assets/Jobs/WhatsApp Image 2026-10-11 at 12.02.06 (6).jpeg',
    title: 'התקנת בקר Shelly להפעלה חכמה',
    description: 'התקנת בקר Shelly להפעלה חכמה של התאורה.',
  },
  {
    key: '../assets/Jobs/WhatsApp Image 2026-10-11 at 12.02.07 (1).jpeg',
    title: 'התקנת עמדת טעינה בתוך ארון נגד מים',
    description: 'התקנת עמדת טעינה בתוך ארון נגד מים עם פתרון מותאם למקום.',
  },
  {
    key: '../assets/Jobs/WhatsApp Image 2026-10-11 at 12.02.07.jpeg',
    title: 'התקנת תאורה במשרדי הייטק',
    description: 'התקנת תאורה במשרדי הייטק עם פתרון תכנון, תאורה נקייה ועמידה.',
  },
] as const;

export const projects: Project[] = Object.entries(jobs)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, image], index) => {
    const match = curatedProjects.find(item => item.key === path);
    const fallbackTitle = `פרויקט ${index + 1}`;

    return {
      title: match?.title ?? fallbackTitle,
      description: match?.description ?? 'עבודה שבוצעה על ידי לירנקו עם דגש על איכות, בטיחות ודיוק.',
      image: image.src,
      alt: match ? `${match.title} — עבודת חשמל` : `עבודת חשמל ${index + 1}`,
      width: image.width,
      height: image.height,
    };
  });

export const featuredProjects = projects.slice(0, 6);
