import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Target, Users, Ban, AlertTriangle, Monitor, XCircle, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '@/components/Navbar';

const sectionIcons = [FileText, Target, Users, Ban, AlertTriangle, Monitor, XCircle, Edit];

const Terms = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 sm:mb-6 -ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>

        {/* Hero */}
        <div className="mb-6 sm:mb-10">
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2">
            {t('terms.pageTitle')}
          </h1>
          <Badge variant="secondary" className="text-xs">{t('terms.lastUpdated')}</Badge>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Section 1 - Introduction */}
          <SectionCard icon={sectionIcons[0]} title={t('terms.section1Title')}>
            <p className="text-sm text-muted-foreground">{t('terms.section1P1')}</p>
            <p className="text-sm text-muted-foreground">{t('terms.section1P2')}</p>
          </SectionCard>

          {/* Section 2 - Purpose */}
          <SectionCard icon={sectionIcons[1]} title={t('terms.section2Title')}>
            <p className="text-sm text-muted-foreground">{t('terms.section2P1')}</p>
            <p className="text-sm text-muted-foreground">{t('terms.section2P2')}</p>
            <p className="text-sm font-medium">{t('terms.section2P3')}</p>
          </SectionCard>

          {/* Section 3 - User Responsibilities */}
          <SectionCard icon={sectionIcons[2]} title={t('terms.section3Title')}>
            {['1', '2', '3'].map(sub => (
              <div key={sub} className="bg-muted/30 rounded-lg p-3">
                <h3 className="text-sm font-semibold mb-2">{t(`terms.section3_${sub}Title`)}</h3>
                <ItemList items={t(`terms.section3_${sub}Items`, { returnObjects: true }) as string[]} />
              </div>
            ))}
          </SectionCard>

          {/* Section 4 - Prohibited Activities */}
          <SectionCard icon={sectionIcons[3]} title={t('terms.section4Title')}>
            <p className="text-sm text-muted-foreground">{t('terms.section4Intro')}</p>
            <ItemList items={t('terms.section4Items', { returnObjects: true }) as string[]} accent="destructive" />
          </SectionCard>

          {/* Section 5 - Food Safety */}
          <SectionCard icon={sectionIcons[4]} title={t('terms.section5Title')}>
            <p className="text-sm font-medium">{t('terms.section5P1')}</p>
            <p className="text-sm text-muted-foreground">{t('terms.section5P2')}</p>
            <p className="text-sm font-medium">{t('terms.section5P3')}</p>
            <ItemList items={t('terms.section5Items', { returnObjects: true }) as string[]} accent="destructive" />
            <p className="text-sm font-semibold bg-destructive/5 rounded-lg p-2.5">{t('terms.section5P4')}</p>
          </SectionCard>

          {/* Section 6 - Platform Limitations */}
          <SectionCard icon={sectionIcons[5]} title={t('terms.section6Title')}>
            <p className="text-sm text-muted-foreground">{t('terms.section6P1')}</p>
            <ItemList items={t('terms.section6Items1', { returnObjects: true }) as string[]} />
            <p className="text-sm text-muted-foreground mt-1">{t('terms.section6P2')}</p>
            <ItemList items={t('terms.section6Items2', { returnObjects: true }) as string[]} />
          </SectionCard>

          {/* Section 7 - Termination */}
          <SectionCard icon={sectionIcons[6]} title={t('terms.section7Title')}>
            <p className="text-sm text-muted-foreground">{t('terms.section7P1')}</p>
            <ItemList items={t('terms.section7Items', { returnObjects: true }) as string[]} accent="destructive" />
          </SectionCard>

          {/* Section 8 - Changes */}
          <SectionCard icon={sectionIcons[7]} title={t('terms.section8Title')}>
            <p className="text-sm text-muted-foreground">{t('terms.section8P1')}</p>
            <p className="text-sm font-medium">{t('terms.section8P2')}</p>
          </SectionCard>

          {/* Bottom spacer */}
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
};

function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0 mt-0.5">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-base sm:text-lg font-semibold pt-1">{title}</h2>
        </div>
        <div className="space-y-2.5 ml-11">{children}</div>
      </CardContent>
    </Card>
  );
}

function ItemList({ items, accent = 'primary' }: { items: string[]; accent?: string }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
          <span className={`text-${accent} shrink-0`}>•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default Terms;