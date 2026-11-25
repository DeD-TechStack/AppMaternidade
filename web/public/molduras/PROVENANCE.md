# Provenance: phone frames (molduras)

## IMG-RES vector-geometry exports (2026-11-19)

The original FREEZE frame geometry (`DIRECAO_FABLE/5_freeze/studies/_work/prep.py`, `frame`) is rasterized again, not enlarged from a PNG: outer 678x1423 radius 75, inset 19, screen 640x1385 radius 56. The alpha mask is drawn at 8x original coordinates then BOX-downsampled to 1356x2846; same flat body colors and hole. The original small tiers stay byte-identical. New-tier byte cap: 26,000 B.

| file | SHA256 | bytes | dimensions |
|---|---|---|---|
| moldura-dia-1356w.png | 8be1c06865829b93238b672c36c83f4f2504d70bd86dcec1d44bb2ca1a6a1068 | 24905 | 1356x2846 |
| moldura-noite-1356w.png | 532948ad8213b60975e0302e10c9bd91ad3283f823764c0292d86239e6e036ca | 24820 | 1356x2846 |

Phone frames drawn by `gerar_ativos.py` (`desenhar_moldura`): outer rounded rectangle minus the screen hole, 4x supersampled alpha mask downsampled with BOX, flat body colour, no shadow or gloss.

| file | sha256 | bytes | WxH | source | script (name + sha256) | operation | date |
|---|---|---|---|---|---|---|---|
| moldura-dia.png | 8a8ba75a6e73a9f6c4d5c6c66da9c431043d10163055836cc278eb0b33f2cacc | 8332 | 678x1423 | none (drawn by gerar_ativos.py desenhar_moldura) | gerar_ativos.py sha256 8485a4e01cd8f989db7340d77d502f4da907c993941f3b3b68ca94eb8b5ae7d6 | PNG optimize RGBA 8-bit | 2026-11-18 |
| moldura-noite.png | 5b874012642666da1ae78c950b0d57d767d8b5aab500ce53ab5888dd0432d94f | 8298 | 678x1423 | none (drawn by gerar_ativos.py desenhar_moldura) | gerar_ativos.py sha256 8485a4e01cd8f989db7340d77d502f4da907c993941f3b3b68ca94eb8b5ae7d6 | PNG optimize RGBA 8-bit | 2026-11-18 |

## cap_open

- moldura-dia.png: 8332 bytes over the 1,000 B cap (measured minimum lossless encoding; leader ruled to keep the frame, 18/11)
- moldura-noite.png: 8298 bytes over the 1,000 B cap (measured minimum lossless encoding; leader ruled to keep the frame, 18/11)
