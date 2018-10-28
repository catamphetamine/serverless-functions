0.4.0 / 28.10.2018
==================

  * (breaking change) `aws.runtime` parameter is now required, previously was defaulting to `"node6.10"`.

  * Fixed code parameters (e.g. `$initialize`) relative `import` paths for `run-locally`.

  * Fixed `babel-polyfill` for `run-locally`.

  * Fixed code parameters being prematurely compiled by Babel.

0.3.0 / 02.09.2018
==================

  * (breaking change) Migrated from Babel 6 to Babel 7.

  * (breaking change) Removed the deprecated `path` function parameter (use `params` parameter instead).

0.2.0 / 17.08.2018
==================

  * (breaking change) `serverless run` command arguments changed: now it takes `stage` and then `port` (also no default value for `port` now).

  * Added `context` parameter with `stage` and `func`.

0.1.0 / 12.08.2018
==================

Initial release.

