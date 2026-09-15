/** Factory-authored, UNLICENSED compiler-private source fragments (ADR-0063).
 * Only fixed compiler profiles select names and receipt storage. Business
 * authorization and validation remain in their adapters before these fragments. */
export const generatedWriteProtection = {
  key: "generated-write-protection",
  version: "1.0.0",
  ownership: "factory-authored",
  license: "UNLICENSED",
} as const;
const fragments = {
  canonical:
    "function canonicalApproval(value:unknown):string { if(Array.isArray(value)) return '['+value.map(canonicalApproval).join(',')+']'; if(value && typeof value==='object') return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonicalApproval((value as Record<string,unknown>)[k])).join(',')+'}'; return JSON.stringify(value); }",
  validateKey:
    "    if(typeof key!=='string'||! /^[A-Za-z0-9._:-]{1,128}$/.test(key)) failApproval(400,'approval.invalid_request');",
  identity:
    "    const scope=createHash('sha256').update([__CHECKSUM__,actorScope,role,entityKey,recordId??'$create',operation].map(v=>Buffer.byteLength(v)+':'+v).join('')).digest('hex');\n    const requestHash=createHash('sha256').update(canonicalApproval(normalized)).digest('hex');",
  replay:
    "    const replay=(receipt:ApprovalMutationReceipt)=> { if(receipt.requestHash!==requestHash) failApproval(409,'approval.idempotency_conflict'); return {status:receipt.responseStatus,body:structuredClone(receipt.responseBody)}; };",
  transactionStart:
    "    const run=()=>this.store.inTransaction(async store=>{\n      const existing=await store.getApprovalReceipt(scope,key); if(existing) return replay(existing);",
  conditionalWrite:
    "        const updated=await store.conditionalApprovalUpdate(entityKey,current.id,current.status!,current.version!,{...values,status,version:current.version!+1});\n        if(!updated) { const authoritative=await store.find(entityKey,current.id); if(!authoritative) failApproval(404,'approval.not_found'); failApproval(409,'approval.version_conflict',authoritative); } record=updated;",
  saveReceipt:
    "      await store.saveApprovalReceipt({scope,idempotencyKey:key,requestHash,operation,recordId:record.id,responseStatus,responseBody});",
  transactionRetry:
    "    for(let attempt=0;;attempt++) { try { return await run(); } catch(error) { const code=(error as {code?:string})?.code; if(attempt<3 && ['P2002','P2034'].includes(code??'')) continue; throw error; } }",
  memoryMethods:
    "  async getApprovalReceipt(scope:string,key:string):Promise<ApprovalMutationReceipt | undefined> { const receipt=this.approvalReceipts.get(JSON.stringify([scope,key])); return receipt ? structuredClone(receipt) : undefined; }\n  async saveApprovalReceipt(receipt:ApprovalMutationReceipt):Promise<void> { await this.coordinateMutation(()=>{ const key=JSON.stringify([receipt.scope,receipt.idempotencyKey]); if(this.approvalReceipts.has(key)) throw new Error('Duplicate approval receipt.'); this.approvalReceipts.set(key,structuredClone(receipt)); }); }\n  async conditionalApprovalUpdate(entity:string,id:string,status:string,version:number,values:Record<string,unknown>):Promise<StoredRecord | undefined> { return this.coordinateMutation(()=>{ const current=this.collection(entity).get(id); if(!current || current.status!==status || current.version!==version) return undefined; const updated={...current,...values}; this.collection(entity).set(id,updated); return structuredClone(updated); }); }",
  prismaMethods:
    "type ApprovalReceiptDelegate = { findUnique(input:{where:{scope_idempotencyKey:{scope:string;idempotencyKey:string}}}):Promise<ApprovalMutationReceipt|null>; create(input:{data:ApprovalMutationReceipt}):Promise<unknown>; };\nexport class PrismaRecordStore implements RecordStore {\n  private approvalReceiptDelegate():ApprovalReceiptDelegate { return (this.prisma as unknown as {approvalMutationReceipt:ApprovalReceiptDelegate}).approvalMutationReceipt; }\n  async getApprovalReceipt(scope:string,key:string):Promise<ApprovalMutationReceipt | undefined> { return (await this.approvalReceiptDelegate().findUnique({where:{scope_idempotencyKey:{scope,idempotencyKey:key}}}))??undefined; }\n  async saveApprovalReceipt(receipt:ApprovalMutationReceipt):Promise<void> { await this.approvalReceiptDelegate().create({data:receipt}); }\n  async conditionalApprovalUpdate(entity:string,id:string,status:string,version:number,values:Record<string,unknown>):Promise<StoredRecord | undefined> { const result=await this.delegate(entity).updateMany({where:{id,status,version},data:values}); return result.count===1?this.find(entity,id):undefined; }",
} as const;

export function writeProtectionFragments(
  profile: "approval" | "task",
  graphChecksum: string,
) {
  if (
    !["approval", "task"].includes(profile) ||
    !/^sha256:[a-f0-9]{64}$/.test(graphChecksum)
  )
    throw new Error("Invalid write-protection configuration.");
  const convert = (value: string) =>
    profile === "approval"
      ? value
      : value.replaceAll("Approval", "Task").replaceAll("approval", "task");
  const result = Object.fromEntries(
    Object.entries(fragments).map(([key, value]) => [
      key,
      convert(value).replace("__CHECKSUM__", JSON.stringify(graphChecksum)),
    ]),
  ) as { -readonly [K in keyof typeof fragments]: string };
  if (profile === "task") {
    result.identity =
      "    const storedIdempotencyKey='sha256:'+createHash('sha256').update(key).digest('hex');\n" +
      result.identity;
    result.transactionStart = result.transactionStart.replace(
      "Receipt(scope,key)",
      "Receipt(scope,storedIdempotencyKey)",
    );
    result.saveReceipt = result.saveReceipt.replace(
      "idempotencyKey:key",
      "idempotencyKey:storedIdempotencyKey",
    );
  }
  return result;
}
