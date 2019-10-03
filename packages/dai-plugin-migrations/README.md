# dai-plugin-migration

## Contract naming convention

Contract names in `contracts/abis/addresses` are suffixed with a number (e.g. `_1`) to
indicate the **version** of the contract. The version can come from either different
deployments of the entire system (such as what might happen after a global settlement),
or a simple upgrade (as what happened when DsChief was migrated when a vulnerability was found).

The numbering is totally arbitrary and chosen when we choose to support a new contract. In the future,
they could be renamed more descriptively.
