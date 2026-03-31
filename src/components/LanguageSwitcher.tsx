import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { LANGUAGES } from '@/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  return (
    <div className="flex items-center gap-3">
      <Globe className="h-5 w-5 text-muted-foreground shrink-0" />
      <div className="flex-1">
        <p className="font-semibold text-sm">{t('profile.language')}</p>
      </div>
      <Select value={i18n.language?.substring(0, 2) || 'en'} onValueChange={(v) => i18n.changeLanguage(v)}>
        <SelectTrigger className="w-[140px] h-9 rounded-xl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.native}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
