# F5 — Prevent a repeat

**GRANTED tokens present:** none.  
All automation left as **proposal only**. See also `seo-reports/recovery-1029/R5-prevent-repeat.md` and updated `RESTORE.md` in this folder.

| Token | Status |
|-------|--------|
| R5-NIGHTLY-DUMP | proposal only — nightly archive, 14-day retain, weekly scratch restore-test, offsite copy |
| R5-MEDIA-RSYNC | proposal only — daily `/media` backup **without** `--delete` |
| R5-HEALTH-ALERT | proposal only — health payload + drop alert vs yesterday baseline |

Enable exactly when token appears on GRANTED line (after owner reviews scripts).

Root cause summary: 2026-10-27 VPS cutover; `sialkot-mongo-data` volume + older archive content; old VPS unreachable; no verified pre-cutover rich dump.
