import {
  createCalculatedRequestTotalRuntime,
  type ApplicationGraphV1,
} from "@factory/graph";

/** First-party conditional profile. Legacy profiles never emit these fragments. */
export function selectCalculatedApproval(
  graph: ApplicationGraphV1,
  approvalEntity?: string,
) {
  const calculated = graph.domain.entities.flatMap((entity) =>
    entity.fields
      .filter((field) => field.calculation)
      .map((field) => ({ entity, field })),
  );
  if (!calculated.length) return undefined;
  const deny = (): never => {
    throw new Error(
      "Calculated totals require a supported complete Approval presentation target and coherent seed.",
    );
  };
  if (
    !approvalEntity ||
    calculated.length !== 1 ||
    calculated[0]!.entity.key !== approvalEntity ||
    graph.apiVersion !== "factory.application-graph/v1"
  )
    return deny();
  const { entity, field: output } = calculated[0]!;
  const rule = output.calculation!;
  const quantity = entity.fields.find(
    (field) => field.key === rule.quantityFieldKey,
  )!;
  const price = entity.fields.find(
    (field) => field.key === rule.unitPriceFieldKey,
  )!;
  const business = entity.fields.filter(
    (field) =>
      !["id", "status", "version", "createdAt", "updatedAt"].includes(
        field.key,
      ),
  );
  const titles = business.filter(
    (field) => field.type === "string" && field.required,
  );
  if (
    titles.length !== 1 ||
    !quantity?.numericDomain ||
    !price?.numericDomain ||
    quantity.type !== "integer" ||
    price.type !== "decimal" ||
    output.type !== "decimal" ||
    !quantity.required ||
    !price.required ||
    !output.required ||
    output.numericDomain ||
    new Set([quantity.key, price.key, output.key]).size !== 3 ||
    business.filter((field) => ["integer", "decimal"].includes(field.type))
      .length !== 3 ||
    graph.domain.entities.some(
      (candidate) =>
        candidate.key !== entity.key &&
        candidate.fields.some(
          (field) => field.numericDomain || field.calculation,
        ),
    )
  )
    return deny();
  const runtime = createCalculatedRequestTotalRuntime();
  const witness = graph.domain.seedData?.find(
    (seed) =>
      seed.entity === entity.key &&
      business.every((field) => {
        const value = seed.values[field.key];
        if (value === undefined || value === null) return !field.required;
        if (["integer", "decimal"].includes(field.type))
          return typeof value === "number";
        if (field.type === "boolean") return typeof value === "boolean";
        if (field.type === "json") return true;
        if (typeof value !== "string" || (field.required && !value.trim()))
          return false;
        if (field.type === "enum")
          return field.values?.includes(value) === true;
        if (field.type === "email")
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        if (field.type === "url") {
          try {
            return ["http:", "https:"].includes(new URL(value).protocol);
          } catch {
            return false;
          }
        }
        if (field.type === "date")
          return (
            /^\d{4}-\d{2}-\d{2}(T00:00:00(?:\.000)?Z)?$/.test(value) &&
            Number.isFinite(Date.parse(value)) &&
            new Date(value).toISOString().slice(0, 10) === value.slice(0, 10)
          );
        if (field.type === "datetime")
          return (
            /^\d{4}-\d{2}-\d{2}T/.test(value) &&
            Number.isFinite(Date.parse(value))
          );
        return true;
      }) &&
      typeof seed.values[quantity.key] === "number" &&
      typeof seed.values[price.key] === "number" &&
      typeof seed.values[output.key] === "number" &&
      runtime.calculate(
        seed.values[quantity.key],
        seed.values[price.key],
        quantity.numericDomain!,
        price.numericDomain!,
      ) === seed.values[output.key],
  );
  if (!witness) return deny();
  return {
    entityKey: entity.key,
    titleFieldKey: titles[0]!.key,
    summaryFieldKeys: [quantity.key, price.key, output.key],
    quantity,
    price,
    output,
    witness,
  };
}

export function renderCalculatedMath(): string {
  return `// factory.generated.approval-calculated-total/v1
import { calculatedRuntime } from './calculated-request-total.js';
type CalculatedRule={apiVersion:'factory.quantity-unit-price-total/v1';quantityFieldKey:string;unitPriceFieldKey:string};
`;
}

/** Emit the same checked Graph implementation with a checked consumer boundary. */
export function calculatedRuntimeFiles() {
  const source = `// First-party Graph exact-decimal runtime; no arithmetic fork.\nexport const calculatedRuntime = (${createCalculatedRequestTotalRuntime.toString()})();\n`;
  const declaration = `type NumericDomain={apiVersion:'factory.numeric-field-domain/v1';minimum?:{value:number;inclusive:boolean};maximum?:{value:number;inclusive:boolean}};
export declare const calculatedRuntime: {calculate:(q:unknown,p:unknown,qd:NumericDomain,pd:NumericDomain)=>number|null;normalizeTrusted:(value:unknown,type:'integer'|'decimal',domain?:NumericDomain)=>number|null;validateTrustedTotal:(q:unknown,p:unknown,total:unknown,qd:NumericDomain,pd:NumericDomain)=>boolean};\n`;
  return ["api/src", "web/app"].flatMap((directory) => [
    { path: directory + "/calculated-request-total.js", render: () => source },
    {
      path: directory + "/calculated-request-total.d.ts",
      render: () => declaration,
    },
  ]);
}

export function renderCalculatedTrustedRecord(): string {
  return `${renderCalculatedMath()}
const calculatedOutput=approvalFields.find(field=>field.calculation)!;
const calculatedQuantity=approvalFields.find(field=>field.key===calculatedOutput.calculation!.quantityFieldKey)!;
const calculatedPrice=approvalFields.find(field=>field.key===calculatedOutput.calculation!.unitPriceFieldKey)!;
function calculatedRecordValues(record:StoredRecord):Record<string,unknown> {
 const values:Record<string,unknown>={};
 for(const field of approvalFields.filter(field=>!['id','status','version','createdAt','updatedAt'].includes(field.key))) {
  if(!Object.hasOwn(record,field.key))continue;
  const value=record[field.key];
  values[field.key]=field.type==='integer'||field.type==='decimal'?calculatedRuntime.normalizeTrusted(value,field.type,field.numericDomain):['date','datetime'].includes(field.type)&&value instanceof Date?value.toISOString():value;
 }
 return values;
}
function validateTrustedApprovalRecord(record:StoredRecord):void {
 if(!calculatedRuntime.validateTrustedTotal(record[calculatedQuantity.key],record[calculatedPrice.key],record[calculatedOutput.key],calculatedQuantity.numericDomain!,calculatedPrice.numericDomain!))failApproval(409,'approval.calculation_invalid_record');
 try{approvalValues(calculatedRecordValues(record),true,true);}catch{failApproval(409,'approval.calculation_invalid_record');}
}
function deriveApprovalValues(values:Record<string,unknown>,current?:StoredRecord):Record<string,unknown> {
 const merged=current?{...calculatedRecordValues(current),...values}:{...values};
 delete merged[calculatedOutput.key];
 approvalValues(merged,true);
 const total=calculatedRuntime.calculate(merged[calculatedQuantity.key],merged[calculatedPrice.key],calculatedQuantity.numericDomain!,calculatedPrice.numericDomain!);
 if(total===null)throw new ApprovalMutationError(400,{code:'approval.invalid_request',fieldErrors:{[calculatedOutput.key]:'Enter quantity and unit price with an exactly representable total.'}});
 return {...merged,[calculatedQuantity.key]:calculatedRuntime.normalizeTrusted(merged[calculatedQuantity.key],'integer',calculatedQuantity.numericDomain!),[calculatedPrice.key]:calculatedRuntime.normalizeTrusted(merged[calculatedPrice.key],'decimal',calculatedPrice.numericDomain!),[calculatedOutput.key]:total};
}
function projectCalculatedRecord(record:StoredRecord):StoredRecord {
 validateTrustedApprovalRecord(record);return {...record,...calculatedRecordValues(record)};
}
`;
}

export function renderCalculatedPage(source: string): string {
  return source
    .replace(
      "className='approval-summary'",
      "className='approval-summary approval-calculated-summary'",
    )
    .replace(
      "className='approval-summary-support'",
      "className={field.calculation ? 'approval-summary-amount' : 'approval-summary-support'}",
    )
    .replace("type JsonRecord =", renderCalculatedMath() + "type JsonRecord =")
    .replace(
      "readonly numericDomain?: NumericDomain;",
      "readonly calculation?: CalculatedRule; readonly numericDomain?: NumericDomain;",
    )
    .replace(
      "  for (const field of fields) {",
      "  for (const field of fields) {\n    if(field.calculation)continue;",
    )
    .replace(
      "  return payload;\n}",
      "  for(const field of fields.filter(field=>field.calculation)){const rule=field.calculation!,q=fields.find(f=>f.key===rule.quantityFieldKey)!,p=fields.find(f=>f.key===rule.unitPriceFieldKey)!;if(calculatedRuntime.calculate(payload[q.key],payload[p.key],q.numericDomain!,p.numericDomain!)===null)throw new SafeUiError('Enter quantity and unit price with an exactly representable total.');}\n  return payload;\n}",
    )
    .replace(
      "function FieldControl({ field, value, onChange, id }:",
      "function FieldControl({ field, value, onChange, id, fields, formValues }:",
    )
    .replace(
      "readonly field: RuntimeField; readonly value: string | boolean;",
      "readonly fields?: readonly RuntimeField[]; readonly formValues?: Readonly<Record<string,string|boolean>>; readonly field: RuntimeField; readonly value: string | boolean;",
    )
    .replace(
      "  const common = { id, name: field.key,",
      `  if(field.calculation){let preview:number|null=null;try{const q=fields!.find(f=>f.key===field.calculation!.quantityFieldKey)!,p=fields!.find(f=>f.key===field.calculation!.unitPriceFieldKey)!,payload=formPayload([q,p],formValues??{});preview=calculatedRuntime.calculate(payload[q.key],payload[p.key],q.numericDomain!,p.numericDomain!);}catch{}return <><output id={id} aria-describedby={id+'-preview'} aria-live='polite'>{preview===null?'Unavailable':String(preview)}</output><small id={id+'-preview'} role={preview===null?'status':undefined}>{preview===null?'Enter valid quantity and unit price to calculate the total.':'Calculated preview'}</small></>;}
  const common = { id, name: field.key,`,
    )
    .replaceAll(
      "<FieldControl id=",
      "<FieldControl fields={fields} formValues={values} id=",
    )
    .replace(
      "  return { events: events.filter",
      "  if(entity===approvalRecordIdentity.entityKey){const fields=definition.entities.find(e=>e.key===entity)!.fields,output=fields.find(f=>f.calculation)!,q=fields.find(f=>f.key===output.calculation!.quantityFieldKey)!,p=fields.find(f=>f.key===output.calculation!.unitPriceFieldKey)!;for(const record of records as JsonRecord[])if(!calculatedRuntime.validateTrustedTotal(record[q.key],record[p.key],record[output.key],q.numericDomain!,p.numericDomain!))throw new SafeUiError('Decision history is unavailable. Try again.');}\n  return { events: events.filter",
    );
}

export const calculatedApprovalStyles =
  ".approval-v1 .approval-calculated-summary > div:not(.approval-summary-status) > dt { position: static; width: auto; height: auto; padding: 0; margin: 0 0 var(--factory-spacing-space-1); overflow: visible; clip-path: none; white-space: normal; font-size: var(--factory-typography-font-size-sm); }";
