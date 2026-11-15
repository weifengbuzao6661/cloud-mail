// The object key comes from the user's live message, never from the request.
const lookup = `SELECT a.key AS objectKey
  FROM attachments a
  JOIN email e ON e.email_id=a.email_id AND e.account_id=a.account_id AND e.user_id=a.user_id
  JOIN account m ON m.account_id=e.account_id AND m.user_id=e.user_id
  WHERE a.att_id=? AND e.email_id=? AND m.account_id=? AND m.user_id=?
    AND e.type=? AND e.is_del=0 AND m.is_del=0 AND a.type=0 AND a.status='0'`;
const id = v => typeof v === 'string' && /^[1-9][0-9]*$/.test(v) && Number.isSafeInteger(Number(v));
const headers = {'Cache-Control':'private, no-store', 'X-Content-Type-Options':'nosniff'};
export async function mailboxAttachment(db, readObject, userId, q) {
  const missing = () => new Response(null, {status:404, headers});
  if (![q.attachmentId,q.emailId,q.accountId].every(id) || !['0','1'].includes(q.type)
      || !Number.isSafeInteger(Number(userId)) || Number(userId)<=0) return missing();
  const row = await db.prepare(lookup).bind(+q.attachmentId,+q.emailId,+q.accountId,+userId,+q.type).first();
  if (!row || !/^attachments\/[^/\\\x00-\x1f]+$/u.test(row.objectKey)) return missing();
  const object = await readObject(row.objectKey);
  if (!object || !object.ok) return missing();
  return new Response(object.body,{headers:{...headers,'Content-Type':'application/octet-stream',
    'Content-Disposition':'attachment'}});
}
