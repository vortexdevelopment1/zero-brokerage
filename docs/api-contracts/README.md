# API Contracts

This directory defines the Canonical Step 05 API Contract for new externally
consumed Zero Brokerage HTTP endpoints. It does not claim that every currently
running endpoint already uses that contract: the Step 04 authentication surface
is a Legacy Step 04 Compatibility Surface and remains unchanged in Batch 01.

Migration of that legacy surface is a future explicit task. It must not be
silently combined with unrelated batches.

- [HTTP conventions and compatibility](conventions.md)
- [Response and error contract](error-format.md)

The public HTTP contract is distinct from internal TypeScript module interfaces,
database persistence models, and provider payloads.
