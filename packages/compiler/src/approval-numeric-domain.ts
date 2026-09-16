import {
  isNumericFieldValueAllowed,
  type ApplicationGraphV1,
} from "@factory/graph";
type Field = ApplicationGraphV1["domain"]["entities"][number]["fields"][number];
/** First-party compiler-private conditional profile. No new runtime dependency. */
export function selectNumericApproval(
  graph: ApplicationGraphV1,
  approvalEntity?: string,
) {
  const constrained = graph.domain.entities.flatMap((entity) =>
    entity.fields
      .filter((field) => field.numericDomain)
      .map((field) => ({ entity, field })),
  );
  if (!constrained.length) return undefined;
  const deny = (): never => {
    throw new Error(
      "Numeric domains require a supported Approval numeric presentation target.",
    );
  };
  if (
    graph.apiVersion !== "factory.application-graph/v1" ||
    !approvalEntity ||
    constrained.length !== 1 ||
    constrained[0]!.entity.key !== approvalEntity
  )
    return deny();
  const business = constrained[0]!.entity.fields.filter(
    (f) =>
      !["id", "status", "version", "createdAt", "updatedAt"].includes(f.key),
  );
  const titles = business.filter((f) => f.type === "string" && f.required),
    temporal = business.filter(
      (f) => (f.type === "date" || f.type === "datetime") && f.required,
    );
  if (titles.length !== 1 || temporal.length !== 1) return deny();
  const field = constrained[0]!.field;
  numericApprovalWitness(graph, approvalEntity, field);
  return {
    entityKey: approvalEntity,
    titleFieldKey: titles[0]!.key,
    summaryFieldKeys: [field.key, temporal[0]!.key],
  };
}
export function numericApprovalWitness(
  graph: ApplicationGraphV1,
  entity: string,
  field: Field,
): number {
  if (
    !field.numericDomain ||
    (field.type !== "integer" && field.type !== "decimal")
  )
    throw new Error("Numeric verification witness is unavailable.");
  for (const seed of graph.domain.seedData ?? [])
    if (
      seed.entity === entity &&
      Object.hasOwn(seed.values, field.key) &&
      isNumericFieldValueAllowed(
        seed.values[field.key],
        field.type,
        field.numericDomain,
      )
    )
      return seed.values[field.key] as number;
  throw new Error("Numeric verification witness is unavailable.");
}
export const numericDomainTypeSource =
  "type NumericDomain = {apiVersion:'factory.numeric-field-domain/v1';minimum?:{value:number;inclusive:boolean};maximum?:{value:number;inclusive:boolean}};";
/** Same immutable descriptor and predicates drive both emitted boundaries. */
export function renderNumericDomainChecks(): string {
  return `${numericDomainTypeSource}
// factory.generated.approval-numeric-domain/v1
function numericDomainAllows(value:unknown,type:string,domain:NumericDomain):boolean {
 if(typeof value!=='number'||!Number.isFinite(value))return false;
 if(type==='integer'&&(!Number.isInteger(value)||value< -2147483648||value>2147483647))return false;
 const {minimum,maximum}=domain;
 return (!minimum||(minimum.inclusive?value>=minimum.value:value>minimum.value))&&(!maximum||(maximum.inclusive?value<=maximum.value:value<maximum.value));
}
function numericDomainMessage(key:string,domain:NumericDomain):string {
 const label=key.replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/[-_]/g,' ').replace(/^./,c=>c.toUpperCase());
 const parts:string[]=[];if(domain.minimum)parts.push((domain.minimum.inclusive?'at least ':'greater than ')+domain.minimum.value);if(domain.maximum)parts.push((domain.maximum.inclusive?'at most ':'less than ')+domain.maximum.value);
 return label+' must be '+parts.join(' and ')+'.';
}
`;
}
export function renderTrustedNumericRecord(): string {
  return `
type ApprovalDecimalParts={negative:boolean;digits:string;order:bigint};
function approvalDecimalParts(text:string):ApprovalDecimalParts|undefined {
 const match=/^(-?)(0|[1-9][0-9]*)(?:[.]([0-9]+))?(?:e([+-]?[0-9]+))?$/i.exec(text);if(!match)return undefined;
 const fraction=match[3]??'',coefficient=(match[2]+fraction).replace(/^0+/,'');
 if(!coefficient)return {negative:false,digits:'0',order:0n};
 return {negative:match[1]==='-',digits:coefficient.replace(/0+$/,''),order:BigInt(coefficient.length)+BigInt(match[4]??'0')-BigInt(fraction.length)};
}
function compareApprovalDecimals(left:ApprovalDecimalParts,right:ApprovalDecimalParts):number {
 if(left.digits==='0')return right.digits==='0'?0:right.negative?1:-1;
 if(right.digits==='0')return left.negative?-1:1;
 if(left.negative!==right.negative)return left.negative?-1:1;
 const direction=left.negative?-1:1;
 if(left.order!==right.order)return (left.order<right.order?-1:1)*direction;
 const width=Math.max(left.digits.length,right.digits.length),a=left.digits.padEnd(width,'0'),b=right.digits.padEnd(width,'0');
 return (a===b?0:a<b?-1:1)*direction;
}
function trustedApprovalDecimal(value:unknown,domain?:NumericDomain):unknown {
 if(typeof value==='number')return Number.isFinite(value)&&(!domain||numericDomainAllows(value,'decimal',domain))?value:undefined;
 const text=typeof value==='string'?value:value&&typeof value==='object'&&typeof (value as {toString?:unknown}).toString==='function'?String(value):undefined;
 if(typeof text!=='string')return undefined;
 const exact=approvalDecimalParts(text);if(!exact)return undefined;
 // Compare persisted DECIMAL values before any lossy Number conversion. Bounds
 // use the canonical decimal spelling of their immutable JSON number values.
 if(domain?.minimum){const order=compareApprovalDecimals(exact,approvalDecimalParts(String(domain.minimum.value))!);if(order<0||order===0&&!domain.minimum.inclusive)return undefined;}
 if(domain?.maximum){const order=compareApprovalDecimals(exact,approvalDecimalParts(String(domain.maximum.value))!);if(order>0||order===0&&!domain.maximum.inclusive)return undefined;}
 const number=Number(text);return Number.isFinite(number)?number:undefined;
}
function validateTrustedApprovalRecord(record:StoredRecord):void {
 const values:Record<string,unknown>={};
 for(const field of approvalFields.filter(f=>!['id','status','version','createdAt','updatedAt'].includes(f.key))) {
  if(!Object.hasOwn(record,field.key))continue;
  const value=record[field.key];
  values[field.key]=value==null?value:field.type==='decimal'?trustedApprovalDecimal(value,field.numericDomain):['date','datetime'].includes(field.type)&&value instanceof Date?value.toISOString():value;
 }
 approvalValues(values,true,true);
}
`;
}
