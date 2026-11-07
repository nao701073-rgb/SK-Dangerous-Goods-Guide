// SKDG R65: fail-closed legacy migration entry point.
// Existing installations require a reviewed forward-only upgrade and verified backup/restore.
console.error('SKDG_R65_UNSAFE_DIRECT_MIGRATE_BLOCKED: use migrate:plan for read-only catalog verification; approved DB upgrade is not installed.');
process.exitCode = 78;
