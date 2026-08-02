# vendored

Third-party browser modules, checked in so the app needs no build step and no
network at runtime.

- **`tonal.js`** — [tonal](https://github.com/tonaljs/tonal) **v6.4.0**, the
  self-contained ESM bundle (`tonal.bundle.mjs`, all deps inlined). Provides
  `Key`, `Chord`, `Scale`, `Note`, `Progression`, `RomanNumeral`.

To update the pin:

```sh
curl -sSL "https://esm.sh/tonal@<version>/es2022/tonal.bundle.mjs" -o web/vendor/tonal.js
# sanity check it's self-contained (should print nothing):
grep -oE 'from ?"https?://[^"]*"|from ?"/[^"]*"' web/vendor/tonal.js
```
