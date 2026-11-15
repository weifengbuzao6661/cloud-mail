import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mailboxAttachment } from '../src/service/mailbox-attachment.mjs';

test('only the owning mailbox and live message may read their attachment',async () => {
  const db=new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE account(account_id INT,user_id INT,is_del INT);
    CREATE TABLE email(email_id INT,account_id INT,user_id INT,type INT,is_del INT);
    CREATE TABLE attachments(att_id INT,email_id INT,account_id INT,user_id INT,key TEXT,type INT,status TEXT);
    INSERT INTO account VALUES(1,7,0),(2,8,0);
    INSERT INTO email VALUES(3,1,7,0,0),(4,2,8,0,0),(5,1,7,0,1);
    INSERT INTO attachments VALUES(9,3,1,7,'attachments/sample.bin',0,'0'),(10,5,1,7,'attachments/sample.bin',0,'0');`);
  const sql={prepare:s=>({bind:(...args)=>({first:()=>db.prepare(s).get(...args)})})};
  const bytes=Uint8Array.of(0,255,128,13);let reads=0;
  const get=async key=>{assert.equal(key,'attachments/sample.bin');reads++;return new Response(bytes)};
  const query={attachmentId:'9',emailId:'3',accountId:'1',type:'0'};
  const allowed=await mailboxAttachment(sql,get,7,query);
  assert.equal(allowed.status,200);assert.match(allowed.headers.get('Cache-Control'),/no-store/);
  assert.deepEqual(new Uint8Array(await allowed.arrayBuffer()),bytes);
  for (const [user,changes] of [[8,{}],[7,{emailId:'4'}],[7,{accountId:'2'}],[7,{type:'1'}],
     [7,{attachmentId:'10',emailId:'5'}],[7,{attachmentId:'x'}]]) {
    assert.equal((await mailboxAttachment(sql,get,user,{...query,...changes})).status,404);
  }
  db.exec('UPDATE account SET is_del=1 WHERE account_id=1');
  assert.equal((await mailboxAttachment(sql,get,7,query)).status,404);assert.equal(reads,1);db.close();
});
