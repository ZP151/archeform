# Factory Pilot Console Next

Console Next is a local-only preview of the Factory Pilot control console. It uses the exact, checked-in `package-lock.json` and local shadcn-derived primitive copies only. It never invokes a shadcn CLI, source registry, Git client, or package manager at runtime.

Run it after installing the locked dependencies:

```powershell
Set-Location apps/console-next
npm ci --ignore-scripts
npm run dev
```

It binds to `127.0.0.1:5173` and talks only to the existing local Factory API. The local capability stays in browser memory. `apps/web` remains the rollback console.
