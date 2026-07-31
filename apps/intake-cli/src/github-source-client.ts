import {
  GitHubFixedSourceClient,
  type FixedSourceClient,
  type SourceFetch,
} from "@factory/external-intake";

const GITHUB_API_HOST = "api.github.com";
const GITHUB_READ_TOKEN_ENV = "FACTORY_GITHUB_READ_TOKEN";

function configuredReadToken(value: string | undefined): string | undefined {
  if (value === undefined || value.trim().length === 0) return undefined;
  if (/\s/u.test(value)) {
    throw new TypeError("GitHub read token is invalid.");
  }
  return value;
}

function defaultSourceFetch(
  input: string | URL,
  init?: RequestInit,
): Promise<Response> {
  return globalThis.fetch(input, init);
}

/**
 * Constrains a local read token to GitHub's metadata API. Archive downloads,
 * redirects, output, and quarantine records never receive the credential.
 */
export function createGitHubReadTokenFetch(
  configuredToken: string | undefined,
  sourceFetch: SourceFetch = defaultSourceFetch,
): SourceFetch {
  const token = configuredReadToken(configuredToken);
  if (token === undefined) return sourceFetch;

  return async (input, init) => {
    const headers = new Headers(init?.headers);
    const url = new URL(input);
    if (url.protocol === "https:" && url.hostname === GITHUB_API_HOST) {
      headers.set("authorization", `Bearer ${token}`);
    } else {
      headers.delete("authorization");
    }
    return sourceFetch(input, { ...init, headers });
  };
}

export function createEnvironmentGitHubSourceClient(
  environment: Readonly<Record<string, string | undefined>> = process.env,
  sourceFetch?: SourceFetch,
): FixedSourceClient {
  return new GitHubFixedSourceClient({
    fetch: createGitHubReadTokenFetch(
      environment[GITHUB_READ_TOKEN_ENV],
      sourceFetch,
    ),
  });
}
