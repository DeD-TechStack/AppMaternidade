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
