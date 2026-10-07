# DCA Solana Trade — промо-шортс

Готовое видео: **`dca_solana_trade_short.mp4`** (1080×1920, 9:16, 30 fps, 54.8 с, H.264 + AAC, громкость −14 LUFS для YouTube Shorts / Reels / TikTok).

## Структура
| Сцена | Время | Что происходит |
|---|---|---|
| Хук | 0–4.8 с | «Хватит торговать на эмоциях» — красный обвал, глитч, затем зелёный рост и «Пусть бот покупает за тебя» |
| Логотип | 4.8–10.4 с | Появление логотипа по буквам, бегущая лента тикеров, телефон с сайтом в 3D |
| Jupiter | 10.4–16.6 с | Схема маршрутизации SOL/USDC → Jupiter → DCA, карточки «DCA-ордера live» и статистика |
| 4 шага | 16.6–27.9 с | Колода карточек шагов с прогресс-баром, финал «24/7» с кольцом |
| Инструменты | 27.9–34.2 с | 3D-карусель: DCA-движок, карта ордеров, Win Rate, лента сделок |
| Защита | 34.2–41.5 с | Стопка карточек: фильтры, TP/SL, чёрный список, 2FA |
| Тарифы | 41.5–47.7 с | FREE → PRO с искрами, уведомление из Telegram |
| CTA | 47.7–54.8 с | URL, «ссылка в описании», дисклеймер о рисках |

Озвучка — ElevenLabs (`eleven_multilingual_v2`, голос «Geniy»), ударения расставлены вручную (`audio/voiceover_script.txt`),
произношение проверено обратным распознаванием (ElevenLabs Scribe). Субтитры синхронизированы по словам из
таймингов ElevenLabs. Бит и звуковые эффекты сгенерированы ElevenLabs Sound Effects.

## Пересборка
```bash
export ELEVENLABS_API_KEY=...            # ключ не хранится в репозитории
cd promo-short
python3 scripts/tts.py <voice_id> eleven_multilingual_v2 audio/voiceover_script.txt audio/voiceover  # новая озвучка (.mp3 + .json)
python3 scripts/mix.py                   # сведение голоса, бита и SFX -> audio/mix.wav
cd source && node ../scripts/render.mjs  # покадровый рендер comp.html -> seg0..3.mp4 (нужен Playwright + ffmpeg)
```
