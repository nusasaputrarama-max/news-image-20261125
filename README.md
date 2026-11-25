# The World in One Day — 25 November 2026

A make.fun bounty entry for
[news-image-20261125](https://make.fun/bounty/news-image-20261125):
a program that draws one image summing up the world's news of
Wednesday 25 November 2026.

## What it does

`main.ts` (Node 22, standard library only) draws a 1024×1024 newspaper
front page — masthead, date band, a lead markets story, six story panels
and a sport strip — and writes it to `/output/entry.png` (or
`$MAKEFUN_OUTPUT_DIR/entry.png` when run outside the grader).

The image is drawn entirely in code: a small PNG encoder (zlib + CRC32),
a 5×7 bitmap font, and geometric pictograms. No network, no clock, no
randomness — two runs write byte-identical files.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## The day's news in the image

- **Markets** — Chip rout deepens: Nvidia falls 7% as the AI sell-off
  spreads; Nikkei drops 2.8%; Nasdaq nears bear market.
- **Gulf crisis** — Two tankers hit by mines in the Strait of Hormuz;
  a third US carrier heads to the Gulf.
- **Climate** — COP31 collapses without a deal in Antalya.
- **US–China tech** — Huawei guilty on 10 of 12 counts in its US trial.
- **Ukraine** — Crimean Bridge partly collapses in a seven-stage strike.
- **Colombia** — Gunmen take 25 hostages in a Cartagena market siege.
- **Space** — Pakistan's first astronaut reaches Tiangong on Shenzhou 24.
- **Sport** — Senegal reinstated as AFCON champions.

Headlines were verified against wire reports of 25 November 2026.

## License

MIT — see [LICENSE](LICENSE).
