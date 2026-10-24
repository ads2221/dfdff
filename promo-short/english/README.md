# DCA Solana Trade — English versions (Emerald)

- `shorts/` — three 1080×1920 shorts, ~30 s each, voiced by ElevenLabs Liam (`eleven_v4`):
  - `short_en_top5_whale_orders.mp4` — top-5 whale orders (STONK +49.1%, NC +56.4%, ROCK +97.6%, FRIES +140.2%, Kimchi +157.7%)
  - `short_en_whale_vs_bot.mp4` — one trade from signal to exit (FRIES, +140.2% in 48 min)
  - `short_en_filters_decide.mp4` — 1,134 orders, 63% → 67.4% in profit with the base filter
- `thumbnail/` — English thumbnails A / B / C (1920×1080 and 1280×720).
- `source/` — data files for the shorts. The engine `short.js` is shared with the Russian version (`../shorts-emerald/source/`) and switches language via `window.LANG`.

## Full review
`full-review/dca_solana_trade_review_en_1080p.mp4` — the full PC review in English: 1920×1080, 6:24, 13 chapters, Emerald theme, voiced by Liam.

The site's built-in English translation is incomplete, and the Telegram mini app is Russian-only. During capture, the missing strings are swapped in from `scripts/capture/panel_en_extra.json` and `tma_en_dict.json`, so every screen in the video is in English. The "Archive DCA" section is hidden, as in the Russian version.
