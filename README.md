# Språket gör inte agenten smartare

Föredrag på [DevLin 2026](https://events.responsive.se/component/civicrm/?task=civicrm/event/info&reset=1&id=171&Itemid=604),
Linköping, 26 november 2026 — Thomas Johannesson, Code 42d AB.

**Presentationen:** <https://jordfras.github.io/devlin-2026/>

- Piltangenterna bläddrar. Varje del av föredraget är en kolumn, och nedåtpil
  går vidare i den.
- **S** öppnar talarvyn med anteckningarna, alltså det som sägs till varje slide.
- Källorna finns på de sista slidesen, med länkar.

## Köra lokalt

Ingen build, inga beroenden. Starta en webbserver i katalogen och öppna
<http://localhost:8000/>:

```sh
python3 -m http.server 8000
```

Talarvyn fungerar inte om `index.html` öppnas direkt som fil.

Byggd med [reveal.js](https://revealjs.com/) (MIT-licens, se
`reveal.js/LICENSE`).

## Licens

© 2026 Code 42d AB. Innehållet, alltså slidesen, talaranteckningarna och
bilderna, är licensierat under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.sv). Koden i
`js/` och `css/` är MIT-licensierad. Code 42d-logorna omfattas inte, och inte
heller Ferris, Go-gophern eller citat ur källorna. Detaljer finns i `LICENSE`.
