# CI action provenance

This record retains the provenance for the two GitHub Actions used by the
read-only CI workflow. Neither action is application source, a runtime
dependency, nor an Application Graph authority.

## `actions/checkout`

- Official repository: <https://github.com/actions/checkout>
- Tag: `v7.0.1`
- Verified full commit: `3d3c42e5aac5ba805825da76410c181273ba90b1`
- License: MIT, verified from the official repository's
  [`LICENSE`](https://raw.githubusercontent.com/actions/checkout/3d3c42e5aac5ba805825da76410c181273ba90b1/LICENSE).
- Purpose: checks out the repository for the credential-free CI job.
- Verification command:

  ```powershell
  git ls-remote https://github.com/actions/checkout.git refs/tags/v7.0.1 refs/tags/v7.0.1^{}
  ```

## `actions/setup-node`

- Official repository: <https://github.com/actions/setup-node>
- Tag: `v7.0.0`
- Verified full commit: `820762786026740c76f36085b0efc47a31fe5020`
- License: MIT, verified from the official repository's
  [`LICENSE`](https://raw.githubusercontent.com/actions/setup-node/820762786026740c76f36085b0efc47a31fe5020/LICENSE).
- Purpose: selects each Node 22 CI matrix runtime.
- Verification command:

  ```powershell
  git ls-remote https://github.com/actions/setup-node.git refs/tags/v7.0.0 refs/tags/v7.0.0^{}
  ```
