# Backlog

Ideas and decisions deferred until the current objective is done. Not part of the queue: nothing here is picked up by the factory.

| Added | Item | Why deferred |
|---|---|---|
| 2026-11-02 | Harden `checkPathTraversal` in `Common/sources/utils.js` (compare with a trailing separator or `path.relative`), with tests before and after; consider a pull request upstream. Investigated: not exploitable in the current callers. | Rafael: keep focus on the pilot objective first. |
| 2026-11-02 | Migrate `Common/sources/commondefines.js` and `license.js` last: the `Makefile` patches them in place with `sed`, and after a migration the patched `.js` would be a gitignored build output. Needs a packet that moves the three build constants to a small JS file or changes the `Makefile`. | Ordering (DIAG-common-b), not a change of direction. |
