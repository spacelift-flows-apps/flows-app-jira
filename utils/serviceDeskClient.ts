import { JiraConfig } from "./jiraClient";

export class ServiceDeskClient {
  private baseUrl: string;
  private auth: string;

  constructor(config: JiraConfig) {
    this.baseUrl = config.jiraUrl.replace(/\/$/, "");
    this.auth = Buffer.from(`${config.email}:${config.apiToken}`).toString(
      "base64",
    );
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    experimental: boolean = false,
  ): Promise<T> {
    const url = `${this.baseUrl}/rest/servicedeskapi${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Basic ${this.auth}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    // Add experimental header for approval endpoints
    if (experimental) {
      headers["X-ExperimentalApi"] = "opt-in";
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Service Desk API error (${response.status}): ${errorText}`,
      );
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength === "0" || response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    return JSON.parse(text) as T;
  }

  async get<T>(endpoint: string, experimental: boolean = false): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: "GET" }, experimental);
  }

  async post<T>(
    endpoint: string,
    data?: any,
    experimental: boolean = false,
  ): Promise<T> {
    return this.makeRequest<T>(
      endpoint,
      {
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
      },
      experimental,
    );
  }
}

export function createServiceDeskClient(config: JiraConfig): ServiceDeskClient {
  return new ServiceDeskClient(config);
}
