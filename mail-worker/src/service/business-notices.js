// Optional per-mailbox integration. Unconfigured Workers keep the original behavior.
function mailbox(config,rules,target) {
  const box=config?.mailbox?.toLowerCase();
  return box && config.webhook===target && target?.startsWith('https://') && rules.length===1 &&
    rules[0].trim().toLowerCase()===box ? box : '';
}
export function wantsAlias(cfg,row,rules,target,secret) {
  const box=mailbox(cfg,rules,target), addr=String(row.toEmail || '').toLowerCase();
  const at=addr.lastIndexOf('@'), plus=addr.indexOf('+');
  return !!box && !!secret && plus>0 && at>plus+1 && addr.slice(0,plus)+addr.slice(at)===box &&
    !rules.includes(row.toEmail);
}
export function aliasNotice(cfg,row,owner,rules,target,secret) {
  if (!wantsAlias(cfg,row,rules,target,secret) || owner?.toLowerCase()!==mailbox(cfg,rules,target)) return null;
  return {emailId:row.emailId,toEmail:owner.toLowerCase()};
}
export function internalId(cfg,sender,recipients,rules,target) {
  const box=mailbox(cfg,rules,target);
  if (box && (sender.toLowerCase()===box || recipients.some(a=>a.toLowerCase()===box)))
    return '<'+crypto.randomUUID()+box.slice(box.lastIndexOf('@'))+'>';
  return null;
}
