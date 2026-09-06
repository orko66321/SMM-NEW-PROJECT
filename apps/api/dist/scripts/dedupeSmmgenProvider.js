// One-off ops fix: remove the duplicate disabled "smmgen" Provider row that
// points at the same upstream API (https://my.smmgen.com/api/v2) as the
// active "my.smmgen" provider.
//
// The disabled provider can't be deleted from the admin UI because Service
// rows still reference it, and the Services page has no delete action for a
// service. This script reconciles those Service rows against the surviving
// provider and then deletes the dead Provider row.
//
// For each Service mapped (as primary OR backup) to the dead provider:
//   - if the surviving provider already has a Service with the SAME
//     providerServiceId (product code) → that's a genuine duplicate: move
//     every Order / OrderIntent / Product / DripFeed reference onto the
//     surviving twin, then delete the duplicate row.
//   - otherwise → just repoint the Service's providerId (and/or clear its
//     backupProviderId) onto the surviving provider.
// Then, once nothing references the dead provider, delete it.
//
// SAFE BY DEFAULT: runs as a dry run and only prints the plan. Pass
// --commit to actually apply it (everything runs in a single transaction).
//
//   # dry run
//   DATABASE_URL=... npx tsx apps/api/src/scripts/dedupeSmmgenProvider.ts
//   # apply
//   DATABASE_URL=... npx tsx apps/api/src/scripts/dedupeSmmgenProvider.ts --commit
//
// or, from a build, `node dist/scripts/dedupeSmmgenProvider.js [--commit]`.
import { PrismaClient } from "#prisma/client";
const DEAD_PROVIDER_ID = "cmt9ouiva000fu7gulj4r4076";
const LIVE_API_URL = "https://my.smmgen.com/api/v2";
const COMMIT = process.argv.includes("--commit");
// A standalone client so the script doesn't drag in src/env.ts's full
// runtime-config validation — it only needs DATABASE_URL.
const prisma = new PrismaClient({ log: ["error", "warn"] });
async function reassignServiceRefs(tx, fromServiceId, toServiceId) {
    const [orders, orderIntents, products, dripFeeds] = await Promise.all([
        tx.order.updateMany({ where: { serviceId: fromServiceId }, data: { serviceId: toServiceId } }),
        tx.orderIntent.updateMany({ where: { serviceId: fromServiceId }, data: { serviceId: toServiceId } }),
        tx.product.updateMany({ where: { serviceId: fromServiceId }, data: { serviceId: toServiceId } }),
        tx.dripFeed.updateMany({ where: { serviceId: fromServiceId }, data: { serviceId: toServiceId } }),
    ]);
    return {
        orders: orders.count,
        orderIntents: orderIntents.count,
        products: products.count,
        dripFeeds: dripFeeds.count,
    };
}
async function countServiceRefs(tx, serviceId) {
    const [orders, orderIntents, products, dripFeeds] = await Promise.all([
        tx.order.count({ where: { serviceId } }),
        tx.orderIntent.count({ where: { serviceId } }),
        tx.product.count({ where: { serviceId } }),
        tx.dripFeed.count({ where: { serviceId } }),
    ]);
    return { orders, orderIntents, products, dripFeeds };
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
        console.error(`\nResolve by hand (or hard-code the surviving id in this script) and re-run.`);
        process.exitCode = 1;
        return;
    }
    const live = liveCandidates[0];
    console.log(`Live provider:  ${live.id}  "${live.name}"  ${live.apiUrl}  [${live.status}]\n`);
    // Every Service touching the dead provider, as primary or as backup.
    const deadServices = await prisma.service.findMany({
        where: { OR: [{ providerId: DEAD_PROVIDER_ID }, { backupProviderId: DEAD_PROVIDER_ID }] },
        orderBy: { providerServiceId: "asc" },
    });
    console.log(`${deadServices.length} Service row(s) reference the dead provider.\n`);
    let toMerge = 0;
    let toRepoint = 0;
    let toClearBackup = 0;
    await prisma.$transaction(async (tx) => {
        for (const svc of deadServices) {
            const isPrimary = svc.providerId === DEAD_PROVIDER_ID;
            const isBackup = svc.backupProviderId === DEAD_PROVIDER_ID;
            const label = `[${svc.providerServiceId ?? "no-code"}] "${svc.name}" (cost ${svc.providerCostPer1000}/1000, ${svc.status})`;
            // Does the surviving provider already carry this product code?
            const twin = svc.providerServiceId
                ? await tx.service.findFirst({
                    where: { providerId: live.id, providerServiceId: svc.providerServiceId, id: { not: svc.id } },
                })
                : null;
            if (isPrimary && twin) {
                const refs = await countServiceRefs(tx, svc.id);
                console.log(`MERGE  ${label}\n` +
                    `       → into surviving ${svc.id === twin.id ? "self?!" : twin.id} ` +
                    `(cost ${twin.providerCostPer1000}/1000, ${twin.status})\n` +
                    `       moving refs: ${refs.orders} order(s), ${refs.orderIntents} intent(s), ` +
                    `${refs.products} product(s), ${refs.dripFeeds} drip feed(s), then DELETE this row`);
                toMerge++;
                if (COMMIT) {
                    await reassignServiceRefs(tx, svc.id, twin.id);
                    await tx.service.delete({ where: { id: svc.id } });
                }
                continue;
            }
            // No twin (or the dead link is only a backup): repoint onto the live provider.
            const data = {};
            if (isPrimary) {
                data.providerId = live.id;
                toRepoint++;
                console.log(`REPOINT ${label}\n       primary providerId → ${live.id}`);
            }
            if (isBackup) {
                // Don't leave backup == primary; if primary is (now) the live
                // provider, a backup pointing at the same provider is meaningless.
                const primaryAfter = isPrimary ? live.id : svc.providerId;
                data.backupProviderId = primaryAfter === live.id ? null : live.id;
                toClearBackup++;
                console.log(`${isPrimary ? "        " : "REPOINT "}${isPrimary ? "" : label + "\n       "}` +
                    `backupProviderId → ${data.backupProviderId ?? "null"}`);
            }
            if (COMMIT)
                await tx.service.update({ where: { id: svc.id }, data });
        }
        // Nothing should reference the dead provider now.
        const [stillPrimary, stillBackup] = await Promise.all([
            tx.service.count({ where: { providerId: DEAD_PROVIDER_ID } }),
            tx.service.count({ where: { backupProviderId: DEAD_PROVIDER_ID } }),
        ]);
        console.log(`\nAfter reconcile: ${stillPrimary} primary + ${stillBackup} backup Service refs to the dead provider ` +
            `${COMMIT ? "(live count)" : "(dry run — would be 0)"}.`);
        if (COMMIT) {
            if (stillPrimary > 0 || stillBackup > 0) {
                throw new Error("Dead provider still referenced after reconcile — rolling back, investigate.");
            }
            await tx.providerSyncLog.deleteMany({ where: { providerId: DEAD_PROVIDER_ID } });
            await tx.provider.delete({ where: { id: DEAD_PROVIDER_ID } });
            console.log(`DELETED dead provider ${DEAD_PROVIDER_ID}.`);
        }
    }, { timeout: 120_000, maxWait: 15_000 });
    console.log(`\nSummary: ${toMerge} duplicate service(s) merged + deleted, ${toRepoint} repointed, ` +
        `${toClearBackup} backup link(s) updated.`);
    if (!COMMIT)
        console.log(`\nDRY RUN — nothing was changed. Re-run with --commit to apply.\n`);
    else
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
