export type MyRequest = { id: string; status: string; summary: string };

export function MyRequests({ requests }: { requests: MyRequest[] }) {
  return <section aria-labelledby="my-requests-heading"><h2 id="my-requests-heading">{{tsx_text:heading}}</h2>{requests.length === 0 ? <p>{{tsx_text:empty_state}}</p> : <ul>{requests.map((request) => <li key={request.id}><strong>{request.status}</strong> {request.summary}</li>)}</ul>}</section>;
}
