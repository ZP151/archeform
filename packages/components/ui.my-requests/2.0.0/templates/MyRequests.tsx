export type MyRequest = { id: string; status: string; summary: string };

export function MyRequests({ requests }: { requests: MyRequest[] }) {
  return <section className="fp-card" data-factory-component="ui.my-requests@2.0.0"><div className="fp-card-header"><div><p className="fp-card-meta">Your activity</p><h2>{{tsx_text:heading}}</h2></div><span className="fp-card-meta">{requests.length} items</span></div><div className="fp-card-body">{requests.length === 0 ? <p className="fp-empty">{{tsx_text:empty_state}}</p> : <ul className="fp-list">{requests.map((request) => <li className="fp-row" key={request.id}><div><strong className="fp-row-title">{request.status}</strong><span className="fp-row-copy">{request.summary}</span></div><span className="fp-status-chip">{request.status}</span></li>)}</ul>}</div></section>;
}
