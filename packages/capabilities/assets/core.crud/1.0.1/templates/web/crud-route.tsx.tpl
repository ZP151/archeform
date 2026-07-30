export default function ManagedRecordRoute() {
  return (
    <main data-capability="core.crud" data-entity="{{entityKey}}">
      <h1>{{entityKey}}</h1>
    </main>
  );
}
