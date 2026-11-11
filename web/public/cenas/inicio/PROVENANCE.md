# PROVENANCE of the composed Início scenes (11/11/2026)

Scenes: Codex image_gen (ChatGPT plan) green-key studio scenes, composited offline with `DIRECOES_20261111/ferramentas/compor.py` (`verde_restante: 0` in all three) over real captures of this site's own Início page (390x844, deviceScaleFactor 2, reduced motion, taken from the MAT-49c worktree). The captures are stand-ins for the final app screens: card MAT-49d recomposes the same file names with the new Hoje/Sessão/Madrugada screens, with no code change.

| file | source scene | model | date | prompt id | real captures (one different screen per device) |
|---|---|---|---|---|---|
| heroi@1x.webp, heroi@2x.webp | `brutos/S1_trio_mel.png` sha256 1fb08107bd0b7ec6368f528325cd98a0efaf4db582c0859bbcc0587ca3d91d53 | Codex image_gen (ChatGPT plan) | 2026-11-11 | S1_trio_mel | Início at the numbers; at the shift-change card; at the FAQ |
| faixa-cacau@1x.webp, faixa-cacau@2x.webp | `brutos/S3_tablets_cacau.png` sha256 8d72fa3432647217545f9387bacfa310ce167c7592ec6a1554ed6521ea3d261d | Codex image_gen (ChatGPT plan) | 2026-11-11 | S3_tablets_cacau | Início at the comparison table; at the closing panel (the left tablet overlaps the right one's left edge in the scene, so a screen with no text there was chosen) |
| tabela@1x.webp, tabela@2x.webp | `brutos/S4_celular_linho.png` sha256 569aeaa94ec46e63c08640f4476cb12da6ff93e133c822c870fdf76691844b60 | Codex image_gen (ChatGPT plan) | 2026-11-11 | S4_celular_linho | Início at the testimonials |

Output sha256:

- heroi@1x.webp 45968638a96552cea51366e3a6b92b672b27086b3a88a645c68d3eabcf333005
- heroi@2x.webp a12ecef9a7c9100781266f7b1ff6ceac1bafe6d8538ae2f12d7622e195552fd0
- faixa-cacau@1x.webp 27d29eb3f41aa86ab662f15b4f349ee70f3fec8ef29e598f88dffafc0ca59433
- faixa-cacau@2x.webp 1f627752cf43caee885dbfefc5f6120a43b81f4bb065479c6dc6599e05c197d9
- tabela@1x.webp f376e575952336c336d1dea7ef298c5e73da2e6c9d4d2c875db3cd920ad2867b
- tabela@2x.webp ebe9d4a8374ca0926682183d110befa46121ec689603c28534172f92d41a9dff

## Recomposed by MAT-49d (2026-11-11)

Same scene sources and compositor (`compor.py`, `verde_restante: 0`); the screens are now window captures (not full-page) of the new app screens, deviceScaleFactor 2, reduced motion, from the MAT-49d worktree on base a8cad7d. Each capture height matches the aspect of its green screen, so the top of the screen is shown with no crop distortion. No "Protótipo" or "dados de exemplo" in the visible text of any capture.

- heroi@1x.webp: scene `brutos/S1_trio_mel.png`; captures: Hoje (day) 390x1102, Hoje (Madrugada) 390x853, Sessão 390x1013 (demonstration notice hidden at capture time, so none is inside the media; MAT-49d round 3); 2026-11-11; sha256 8dea22ae9ee659fad7661dd6940d369d297743ef9c8f5ee97e1d045a3c7b5fd8
- heroi@2x.webp: scene `brutos/S1_trio_mel.png`; captures: Hoje (day) 390x1102, Hoje (Madrugada) 390x853, Sessão 390x1013 (demonstration notice hidden at capture time, so none is inside the media; MAT-49d round 3); 2026-11-11; sha256 5ae0c9255be82e588d153da02506826be9888050c73f50210cf46d9a54b01538
- faixa-cacau@1x.webp: scene `brutos/S4_celular_linho.png`; captures: Hoje (Madrugada active, session running) 390x850; one-device fallback because the S3 two-tablet scene overlaps the tablets; 2026-11-11; sha256 d229af61d325b7a30b9257fda053ee9be4162c05a13e410b3bb581b4b3f8c839
- faixa-cacau@2x.webp: scene `brutos/S4_celular_linho.png`; captures: Hoje (Madrugada active, session running) 390x850; one-device fallback because the S3 two-tablet scene overlaps the tablets; 2026-11-11; sha256 a794f2c63da93261c31850f2faaff85ffdaa1585082ddb1405fe4bc686971c65
- tabela@1x.webp: scene `brutos/S4_celular_linho.png`; captures: Hoje (day) 390x850; 2026-11-11; sha256 f65156590a9e7619e516ad662f440835ef0fefd2013cd7264e7d02f6ab12bb47
- tabela@2x.webp: scene `brutos/S4_celular_linho.png`; captures: Hoje (day) 390x850; 2026-11-11; sha256 ee5fe93871ca5ef51f5739b4e48d9061d40dcf539b354cd2b7aa70e8017f2e84
