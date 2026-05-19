## What does this PR do?

<!-- One clear sentence. What changed and why. -->


## Linked Issues

<!-- Use "Closes #N" or "Fixes #N" to auto-close issues on merge -->
Closes #

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Schema change (update DummyDb + tests)
- [ ] Refactor (no functional change)
- [ ] Config / infrastructure

## Checklist

- [ ] Tests pass locally (`make test`)
- [ ] No hardcoded values (all through config/env/translations)
- [ ] No stale code left behind
- [ ] If schema changed: DummyDb updated in tests/
- [ ] If new endpoint: rate limiting + auth guard added
- [ ] If mobile string added: goes through `t('key')` — not hardcoded
- [ ] DAILY_LOG.md updated with what was done

## Phase sign-off (if completing a phase)

- [ ] Phase N sign-off written to `tests/v2/PHASEН_SIGNOFF.md`
- [ ] All proof data in `tests/v2/evidence/phaseN/`
