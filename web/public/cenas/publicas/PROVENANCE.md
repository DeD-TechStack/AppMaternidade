# PROVENANCE of the composed scenes of the public pages (11/11/2026)

| file | source | model | date | prompt id |
|---|---|---|---|---|
| como-funciona@1x.webp, como-funciona@2x.webp | `brutos/S2_unico_mel.png` (sha256 e3557a14de3efbd2e00c619cfecf94dd9f5493d3670a8d4ad859ca7a435b8f94), green-key scene composited by `DIRECOES_20261111/ferramentas/compor.py` with one real capture of this site at 390x844, scale 2 (`/como-funciona` scrolled 1100 px) | Codex image_gen (ChatGPT plan) for the scene; the screen is our own capture | 2026-11-11 | S2_unico_mel |
| desenvolvimento@1x.webp, desenvolvimento@2x.webp | `brutos/S3_tablets_cacau.png` (sha256 8d72fa3432647217545f9387bacfa310ce167c7592ec6a1554ed6521ea3d261d), same compositor with two real captures of this site at 390x844, scale 2 (`/desenvolvimento` scrolled 1100 px and 2600 px) | Codex image_gen (ChatGPT plan) for the scene; the screens are our own captures | 2026-11-11 | S3_tablets_cacau |

Output sha256: `como-funciona@1x.webp` 26ac2d4cd38c7f3b753abcfc2ec20fc96121ae5ffc0d11b8afbad83b212983e7, `como-funciona@2x.webp` 080f5022d36bbb0f3ce7bd3e5c238601ac959af970c354d652333c01947ee19a, `desenvolvimento@1x.webp` 0df7d94fc5bb0c3aef7ae8e9542dfdbf80b20fd145b57acc30c53f49ab9b383c, `desenvolvimento@2x.webp` b1c092365c2098579c7101b11ed9f405cb82d9d2403f447d784f2b7f934d9db9. `compor.py` reported `verde_restante: 0` for both. The captures carry no "Protótipo" or "dados de exemplo" text (checked on the visible DOM text of each capture). The files keep these fixed names; card MAT-49d recomposes them later with the new app screens, with no code change.

## Recomposed by MAT-49d (2026-11-11)

Same scene sources and compositor (`compor.py`, `verde_restante: 0`); the screens are now window captures (not full-page) of the new app screens, deviceScaleFactor 2, reduced motion, from the MAT-49d worktree on base a8cad7d. Each capture height matches the aspect of its green screen, so the top of the screen is shown with no crop distortion. No "Protótipo" or "dados de exemplo" in the visible text of any capture.

- como-funciona@1x.webp: scene `brutos/S2_unico_mel.png`; captures: Hoje (day) 390x1013; 2026-11-11; sha256 df97cd2ad79ebc160ec6a07bc6c19f7ab91276fc97d2a354e2fd586d607e8da4
- como-funciona@2x.webp: scene `brutos/S2_unico_mel.png`; captures: Hoje (day) 390x1013; 2026-11-11; sha256 21a8ac7792bbbe038567711407952b89ea35eaad5f2be69e8819a6292fa88d1b
- desenvolvimento@1x.webp: scene `brutos/S3_tablets_cacau.png`; captures: Sessão 900x1023, Hoje (day) 820x1123; 2026-11-11; sha256 76d77a7132bee01d252907db20c88389b9da9178a38ece5d84f4de185c8faec6
- desenvolvimento@2x.webp: scene `brutos/S3_tablets_cacau.png`; captures: Sessão 900x1023, Hoje (day) 820x1123; 2026-11-11; sha256 51152c448ba6495f94c787323a5f792c01e23e296168d385b9957a424e136bfd
