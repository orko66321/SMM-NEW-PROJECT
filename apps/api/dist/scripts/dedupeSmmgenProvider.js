// One-off ops fix: remove the duplicate disabled "smmgen" Provider row that
// points at the same upstream API (https://my.smmgen.com/api/v2) as the
// active "my.smmgen" provider. The whole catalogue was imported twice —
// once under each provider row — so there are thousands of exact-duplicate
// Service rows mapped to the dead provider.
//
// The disabled provider can't be deleted from the admin UI because those
// Service rows reference it, and the Services page has no bulk delete.
//
// For every Service mapped (primary OR backup) to the dead provider:
//   - if the surviving provider already has a Service with the SAME
//     providerServiceId (product code) -> genuine duplicate: move every
//     Order / OrderIntent / Product / DripFeed reference onto the surviving
//     twin, then delete the duplicate row.
//   - otherwise -> repoint the Service's providerId (and clear a dead
//     backupProviderId) onto the surviving provider.
// Then, once nothing references the dead provider, delete it.
//
// Set-based: a handful of bulk UPDATE/DELETE statements in ONE transaction,
// not row-by-row — this has to handle ~7.8k rows.
//
// SAFE BY DEFAULT: dry run unless --commit is passed.
//
//   node apps/api/dist/scripts/dedupeSmmgenProvider.js            # dry run
//   node apps/api/dist/scripts/dedupeSmmgenProvider.js --commit   # apply
//
// (or `npx tsx apps/api/src/scripts/dedupeSmmgenProvider.ts [--commit]`)
import { PrismaClient } from "#prisma/client";
const DEAD_PROVIDER_ID = "cmt9ouiva000fu7gulj4r4076";
const LIVE_API_URL = "https://my.smmgen.com/api/v2";
const COMMIT = process.argv.includes("--commit");
const prisma = new PrismaClient({ log: ["error", "warn"] });
async function scalar(rows) {
    const v = rows[0] ? Object.values(rows[0])[0] : 0;
    return Number(v ?? 0);
}
async function main() {
    console.log(`\n=== smmgen provider dedupe — ${COMMIT ? "COMMIT" : "DRY RUN"} ===\n`);
    const dead = await prisma.provider.findUnique({ where: { id: DEAD_PROVIDER_ID } });
    if (!dead) {
        console.log(`Dead provider ${DEAD_PROVIDER_ID} not found — nothing to do (already removed?).`);
        return;
    }
    console.log(`Dead provider:  ${dead.id}  "${dead.name}"  ${dead.apiUrl}  [${dead.status}]`);
    const liveCandidates = await prisma.provider.findMany({
        where: { apiUrl: LIVE_API_URL, id: { not: DEAD_PROVIDER_ID } },
    });
    if (liveCandidates.length !== 1) {
        console.error(`\nABORT: expected exactly 1 surviving provider with apiUrl "${LIVE_API_URL}" ` +
            `(other than the dead one), found ${liveCandidates.length}:`);
        for (const p of liveCandidates)
            console.error(`  - ${p.id}  "${p.name}"  [${p.status}]`);
        process.exitCode = 1;
        return;
    }
    const LIVE = liveCandidates[0].id;
    console.log(`Live provider:  ${LIVE}  "${liveCandidates[0].name}"  ${liveCandidates[0].apiUrl}  [${liveCandidates[0].status}]\n`);
    // ── Plan (counts only) ────────────────────────────────────────────────
    const deadPrimary = await scalar(await prisma.$queryRaw `SELECT count(*)::int n FROM "Service" WHERE "providerId" = ${DEAD_PROVIDER_ID}`);
    const deadBackup = await scalar(await prisma.$queryRaw `SELECT count(*)::int n FROM "Service" WHERE "backupProviderId" = ${DEAD_PROVIDER_ID}`);
    const twinned = await scalar(await prisma.$queryRaw `
      SELECT count(*)::int n FROM "Service" dead
      WHERE dead."providerId" = ${DEAD_PROVIDER_ID}
        AND EXISTS (
          SELECT 1 FROM "Service" live
          WHERE live."providerId" = ${LIVE}
            AND live."providerServiceId" = dead."providerServiceId"
        )`);
    const repoint = deadPrimary - twinned;
    const refCount = async (table) => scalar(await prisma.$queryRawUnsafe(`SELECT count(*)::int n FROM "${table}" x
         JOIN "Service" dead ON dead.id = x."serviceId"
         WHERE dead."providerId" = $1`, DEAD_PROVIDER_ID));
    const [ordRefs, intentRefs, prodRefs, dripRefs] = await Promise.all([
        refCount("Order"),
        refCount("OrderIntent"),
        refCount("Product"),
        refCount("DripFeed"),
    ]);
    console.log(`Dead provider is referenced by:`);
    console.log(`  ${deadPrimary} Service row(s) as PRIMARY  (${twinned} are duplicates -> delete, ${repoint} have no twin -> repoint)`);
    console.log(`  ${deadBackup} Service row(s) as BACKUP     (-> backupProviderId cleared)`);
    console.log(`  ${ordRefs} Order, ${intentRefs} OrderIntent, ${prodRefs} Product, ${dripRefs} DripFeed row(s) on those services (reference reassigned before delete)\n`);
    if (!COMMIT) {
        console.log(`DRY RUN — nothing changed. Re-run with --commit to apply.\n`);
        return;
    }
    // ── Apply (one transaction) ──────────────────────────────────────────
    await prisma.$transaction(async (tx) => {
        // 1-4. Reassign every dependent reference from a duplicate dead-provider
        //      service onto its surviving twin.
        const moveRefs = (table) => tx.$executeRawUnsafe(`UPDATE "${table}" x SET "serviceId" = live.id
         FROM "Service" dead
         JOIN "Service" live
           ON live."providerServiceId" = dead."providerServiceId"
          AND live."providerId" = $1
         WHERE x."serviceId" = dead.id
           AND dead."providerId" = $2`, LIVE, DEAD_PROVIDER_ID);
        console.log(`moved Order refs:      ${await moveRefs("Order")}`);
        console.log(`moved OrderIntent refs:${await moveRefs("OrderIntent")}`);
        console.log(`moved Product refs:    ${await moveRefs("Product")}`);
        console.log(`moved DripFeed refs:   ${await moveRefs("DripFeed")}`);
        // 5. Delete the duplicate dead-provider services (those that have a twin).
        const deleted = await tx.$executeRawUnsafe(`DELETE FROM "Service" AS dead USING "Service" live
         WHERE dead."providerId" = $1
           AND live."providerServiceId" = dead."providerServiceId"
           AND live."providerId" = $2`, DEAD_PROVIDER_ID, LIVE);
        console.log(`deleted duplicate services: ${deleted}`);
        // 6. Repoint whatever dead-provider services are left (no twin existed).
        const repointed = await tx.$executeRawUnsafe(`UPDATE "Service" SET "providerId" = $1 WHERE "providerId" = $2`, LIVE, DEAD_PROVIDER_ID);
        console.log(`repointed services:         ${repointed}`);
        // 7. Clear any backup links to the dead provider.
        const backupCleared = await tx.$executeRawUnsafe(`UPDATE "Service" SET "backupProviderId" = NULL WHERE "backupProviderId" = $1`, DEAD_PROVIDER_ID);
        console.log(`cleared backup links:       ${backupCleared}`);
        // 8. Nothing may reference the dead provider now.
        const stillPrimary = await scalar(await tx.$queryRawUnsafe(`SELECT count(*)::int n FROM "Service" WHERE "providerId" = $1`, DEAD_PROVIDER_ID));
        const stillBackup = await scalar(await tx.$queryRawUnsafe(`SELECT count(*)::int n FROM "Service" WHERE "backupProviderId" = $1`, DEAD_PROVIDER_ID));
        if (stillPrimary > 0 || stillBackup > 0) {
            throw new Error(`Dead provider still referenced (${stillPrimary} primary, ${stillBackup} backup) — rolling back.`);
        }
        await tx.providerSyncLog.deleteMany({ where: { providerId: DEAD_PROVIDER_ID } });
        await tx.provider.delete({ where: { id: DEAD_PROVIDER_ID } });
        console.log(`\nDELETED dead provider ${DEAD_PROVIDER_ID}.`);
    }, { timeout: 600_000, maxWait: 20_000 });
    console.log(`\nDone.\n`);
}
main()
    .catch((err) => {
    console.error("\nFailed:", err);
    process.exitCode = 1;
})
    .finally(async () => {
    await prisma.$disconnect();
});
