/**
 * The shared <head> contents.
 *
 * The site has three root layouts — the emerald public pages, the cream menu
 * and the staff dashboard — because each is genuinely a different document
 * design and the two public stylesheets both want to own `:root`, `.btn` and
 * `.nav`. That is the same separation the static site had (index.html and
 * menu.html were two documents), so a navigation between them is a real page
 * load, exactly as before.
 *
 * What all three share lives here, so the fonts and the favicon cannot drift
 * apart the way the two hand-maintained <head> blocks had begun to.
 */

/**
 * Stamps `js` on the document element before first paint. The reveal
 * animations are gated on it, so with scripting off nothing is ever hidden and
 * the page reads in full — which is how the original pages behaved.
 */
const MARK_JS = `document.documentElement.className+=' js';`;

export function DocumentHead({ includeJsFlag = true }: { includeJsFlag?: boolean }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap"
      />
      {includeJsFlag ? <script dangerouslySetInnerHTML={{ __html: MARK_JS }} /> : null}
    </>
  );
}
