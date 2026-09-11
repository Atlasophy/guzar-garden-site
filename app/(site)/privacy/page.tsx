import type { Metadata } from 'next';
import { SiteFooter } from '@/components/shared/site-footer';
import { SiteHeader } from '@/components/shared/site-header';
import { SITE, TEL_HREF } from '@/components/shared/site-config';

export const metadata: Metadata = {
  title: 'Polityka prywatności',
  alternates: { canonical: '/privacy' },
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader variant="emerald" />
      <main className="reserve-page">
        <div className="wrap reserve-wrap">
          <header className="reserve-heading">
            <p className="eyebrow">Guzar Garden</p>
            <h1>Polityka prywatności</h1>
            <p>Informacje dotyczące rezerwacji stolików i kontaktu z restauracją.</p>
          </header>
          <article className="panel" style={{ maxWidth: '54rem' }}>
            <h2>Administrator danych</h2>
            <p>
              {SITE.name}, {SITE.addressLine}, {SITE.postalCode} {SITE.city}. Kontakt:{' '}
              <a href={TEL_HREF}>{SITE.phoneDisplay}</a>.
            </p>
            <h2>Jakie dane przetwarzamy</h2>
            <p>
              Przy rezerwacji zapisujemy imię i nazwisko, numer telefonu, opcjonalny adres e-mail,
              liczbę gości, termin, wybrany stolik, język, prośby specjalne oraz techniczne dane
              niezbędne do ochrony i obsługi rezerwacji.
            </p>
            <h2>Cel i podstawa</h2>
            <p>
              Dane są używane do przyjęcia i obsługi rezerwacji, wysłania potwierdzenia lub
              informacji o zmianie oraz zapewnienia bezpieczeństwa systemu. Marketing jest
              prowadzony wyłącznie po udzieleniu osobnej zgody, którą można wycofać.
            </p>
            <h2>Odbiorcy i czas przechowywania</h2>
            <p>
              Dane mogą być przetwarzane przez dostawców hostingu, bazy danych i wiadomości SMS
              działających na zlecenie restauracji. Dane rezerwacyjne są przechowywane tylko tak
              długo, jak jest to potrzebne do obsługi wizyty, rozpatrzenia roszczeń i spełnienia
              obowiązków prawnych.
            </p>
            <h2>Prawa gościa</h2>
            <p>
              Możesz poprosić o dostęp, poprawienie, usunięcie lub ograniczenie danych, sprzeciwić
              się przetwarzaniu oraz wycofać zgodę marketingową. Możesz też złożyć skargę do Prezesa
              Urzędu Ochrony Danych Osobowych.
            </p>
            <h2>Kontakt w sprawie danych</h2>
            <p>
              W sprawach dotyczących danych osobowych skontaktuj się bezpośrednio z restauracją pod
              numerem <a href={TEL_HREF}>{SITE.phoneDisplay}</a>.
            </p>
          </article>
        </div>
      </main>
      <SiteFooter variant="emerald" />
    </>
  );
}
