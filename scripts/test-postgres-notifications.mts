import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire, Module } from "node:module";

// Never load .env.local or run this test against a hosted database.
const database = new URL(process.env.DATABASE_URL || "postgresql://invalid");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(database.hostname), "Use an isolated loopback PostgreSQL database");
assert.equal(process.env.NODE_ENV, "development");
const messages: Array<{ headers: Headers; body: { to: string[]; text: string } }> = [];
const require = createRequire(import.meta.url);
const clerkPath = require.resolve("@clerk/nextjs/server");
const previousClerk = require.cache[clerkPath];
const clerkMock = new Module(clerkPath);
let currentUserId = "";
clerkMock.exports = {
  auth: async () => ({ isAuthenticated: true, userId: currentUserId }),
  clerkClient: async () => ({ users: { getUser: async (id: string) => ({
    primaryEmailAddressId: "primary",
    emailAddresses: [{ id: "primary", emailAddress: `${id}@example.invalid`, verification: { status: "verified" } }],
  }) } }),
};
require.cache[clerkPath] = clerkMock;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  assert.equal(input, "https://api.resend.com/emails", "Only the stubbed email endpoint is requested");
  messages.push({ headers: new Headers(init?.headers), body: JSON.parse(String(init?.body)) });
  return Response.json({ id: `test-email-${messages.length}` });
};
process.env.RESEND_API_KEY = "test-no-external-mail";
process.env.NOTIFICATION_EMAIL_FROM = "test@example.invalid";
process.env.CRON_SECRET = "test-cron-secret";
const store = await import("../src/lib/notification-storage");
const service = await import("../src/lib/notification-service");
const { sql, ensureSchema } = await import("../src/lib/postgres");
try {
  await ensureSchema();
  const id = randomUUID();
  const author = `author-${id}`;
  const watcher = `watcher-${id}`;
  const moderator = `moderator-${id}`;
  currentUserId = watcher;
  await sql`INSERT INTO articles (id,slug,title,content_type,created_at,updated_at) VALUES (${id},${id},'Test aircraft','aircraft',NOW(),NOW())`;
  await store.setArticleWatch(watcher, id, true);
  assert.equal(await store.isWatchingArticle(watcher,id),true);
  assert.deepEqual(await store.listArticleWatcherIds(id),[watcher]);
  await store.saveNotificationPreferences(watcher,"daily",{watched_article_edited:true});
  const revision = {
    id: randomUUID(), articleId:id, articleSlug:id, proposedSlug:id, title:"Test aircraft", contentType:"aircraft",
    status:"approved", contributorId:author, contributorName:"Test author", editSummary:"Update", sources:[], relationships:[],
    markdown:"", fields:[], sections:[], verification:null, moderatorId:null, moderatorNote:null,
    parentRevisionId:null, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(),
    submittedAt:null, reviewedAt:null,
  } satisfies Parameters<typeof service.emitRevisionOutcome>[0]["revision"];
  await service.emitRevisionOutcome({actorId:moderator,revision,outcome:"approved"});
  const { GET: poll } = await import("../src/app/api/notifications/route");
  const bell = await (await poll()).json();
  assert.equal(bell.unreadCount, 1, "The notification bell reads emitted PostgreSQL notifications");
  const inbox = await store.listNotifications(watcher);
  assert.equal(inbox.items[0].href, `/aircraft/${id}`, "Watch notifications use the typed canonical article route");
  assert.equal(inbox.total,1,"The PostgreSQL watch produces a notification in the inbox");
  assert.equal(await store.getUnreadCount(watcher),1);
  assert.equal(await store.getUnreadCount(author),1);
  assert.equal(messages.length,0,"Daily preferences do not send immediate mail");
  assert.equal(await store.getNotificationForUser(inbox.items[0].id,author),null);
  assert.equal(await store.markNotificationRead(author,inbox.items[0].id),0);
  await store.markNotificationRead(watcher,inbox.items[0].id);
  assert.equal(await store.getUnreadCount(watcher),0,"Read state is shared with the bell");
  assert.equal((await (await poll()).json()).unreadCount, 0);
  await service.emitRevisionOutcome({actorId:moderator,revision,outcome:"approved"});
  assert.equal((await store.listNotifications(watcher)).total,1,"Retried approval is deduplicated");
  await store.markAllNotificationsRead(author);
  assert.equal(await store.getUnreadCount(author),0);
  const {GET,POST} = await import("../src/app/api/notifications/digest/route");
  assert.equal((await GET(new Request("http://localhost/api/notifications/digest"))).status,401);
  assert.equal(messages.length,0,"Unauthorized cron requests cannot send mail");
  const request = () => new Request("http://localhost/api/notifications/digest",{headers:{authorization:"Bearer test-cron-secret"}});
  assert.equal((await GET(request())).status,200);
  assert.equal(messages.length,1);
  assert.deepEqual(messages[0].body.to,[`${watcher}@example.invalid`]);
  assert.equal((await store.queueEmailDelivery(inbox.items[0].id,watcher))?.status,"sent");
  await POST(request());
  assert.equal(messages.length,1,"Rerunning the digest does not redeliver sent notifications");
  await store.saveNotificationPreferences(watcher,"immediate",{custom:true});
  await service.emitCustomNotification({recipientId:watcher,actorId:moderator,title:"Custom",message:"Test",href:"/notifications"});
  assert.equal(messages.length,2,"Immediate preference sends one email");
  assert.equal((await store.getNotificationPreferences(watcher)).enabledTypes.watched_article_edited,false);
  await store.saveNotificationPreferences(watcher,"daily",{custom:true});
  const retry = await service.emitCustomNotification({recipientId:watcher,actorId:moderator,title:"Retry",message:"Test",href:"/notifications"});
  assert.ok(retry);
  await store.queueEmailDelivery(retry.id,watcher);
  await store.updateEmailDelivery({notificationId:retry.id,status:"failed",failureReason:"Temporary test failure",incrementRetry:true});
  assert.ok((await store.listFailedEmailDeliveries()).some(value => value.notification_id===retry.id));
  await service.deliverDailyDigests();
  assert.equal(messages.length,3,"A failed digest delivery is retried");
  assert.equal((await store.queueEmailDelivery(retry.id,watcher))?.status,"sent");
  const renamedDraft = { ...revision, id: randomUUID(), proposedSlug: `new-${id}`, status: "changes_requested" as const };
  await service.emitRevisionOutcome({ actorId: moderator, revision: renamedDraft, outcome: "changes_requested" });
  const changes = (await store.listNotifications(author)).items.find(value => value.revisionId === renamedDraft.id);
  assert.equal(changes?.href, `/contribute/${id}?type=aircraft`, "Requested changes link to the existing article, not an unpublished proposed rename");
  const previousAuthor = `previous-${id}`;
  const approvedRename = { ...renamedDraft, id: randomUUID(), status: "approved" as const };
  await service.emitRevisionOutcome({ actorId: moderator, revision: approvedRename, outcome: "approved", previousLiveRevision: { ...revision, contributorId: previousAuthor } });
  assert.equal((await store.listNotifications(previousAuthor)).items[0].href, `/aircraft/new-${id}/history`);
  const approvedNotice = (await store.listNotifications(author)).items.find(value => value.revisionId === approvedRename.id);
  assert.equal(approvedNotice?.href, `/contribute/new-${id}?type=aircraft`);
  await store.setArticleWatch(watcher,id,false);
  assert.deepEqual(await store.listArticleWatcherIds(id),[]);
  console.log("PostgreSQL approval, watches, inbox, read state, preferences, email tracking and authenticated digest checks passed.");
} finally {
  globalThis.fetch = originalFetch;
  require.cache[clerkPath] = previousClerk;
  await sql.end();
}
