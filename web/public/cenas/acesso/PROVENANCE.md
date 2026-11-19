# Provenance: web/public/cenas/acesso/

The generated phone-on-pedestal scene (entrar@1x/@2x) left the site in REP-T3. The only image of the access pages is the Fable-signed door plate 10a. The plate is a read-only source under DIRECAO_FABLE (sha256 asserted by the script), colour-snapped whole, downscaled with LANCZOS, never upscaled, no retouching, no generated pixels.

Columns: file | source + sha256 | script + sha256 | crop | scale | encoder/quality | output sha256 | bytes | size

porta-390w.webp | DIRECAO_FABLE/4_cenas/10a_porta.png sha256:4120836e2626bc66cba05faaa8f99aaabda1b4adbf1eb338838cfeed56d111be | .oc/ativos/porta.py sha256:95718f57a15d2e6de3e178e6c3abd5c04cda6ce4fbe913a88c3fb4f15cd0ceb4; snap whole plate with the prep.py table and snapped() | whole 0,0,1254,1254 | LANCZOS to 390x390 from 1254x1254 | WebP q82 method 6, Pillow | sha256:813ae539827310688fe1bfda6970755cb8e4aa40f5718989fa04abcfe86afb1d | 3328 B | 390x390
porta-720w.webp | same source | same script | whole 0,0,1254,1254 | LANCZOS to 720x720 from 1254x1254 | WebP q82 method 6, Pillow | sha256:c639f598a89c818b503918b407eb24dc5cf23e41b4e6546baf5cc57cba46f1bd | 6476 B | 720x720
porta-780w.webp | same source | same script | whole 0,0,1254,1254 | LANCZOS to 780x780 from 1254x1254 | WebP q82 method 6, Pillow | sha256:84fe1146bc1c1ef55a2160dff3e7e7d684775b2815e170faeeae7ad31c45c118 | 7234 B | 780x780
porta-1254w.webp | same source | same script | whole 0,0,1254,1254 | none (1:1) to 1254x1254 from 1254x1254 | WebP q82 method 6, Pillow | sha256:6b2d3be49e9759f2a4bc926f69659e1cea2b54c0fdeb7fd70e080c41735928cf | 12570 B | 1254x1254

alt (all four files): `ent.alt.porta` of COPY_entrar.md, rendered by `PORTA_ACESSO.alt` in web/src/conteudo/conta.ts.
