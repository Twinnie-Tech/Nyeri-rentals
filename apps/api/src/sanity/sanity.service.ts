import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Thin Sanity write helper. Listing media/copy stays in Sanity;
 * Nest holds the write token so mobile/web share one path.
 */
@Injectable()
export class SanityService {
  private readonly logger = new Logger(SanityService.name);
  private readonly baseUrl: string | null;
  private readonly token: string | null;

  constructor(config: ConfigService) {
    const projectId = config.get<string>("SANITY_PROJECT_ID");
    const dataset = config.get<string>("SANITY_DATASET") || "production";
    const apiVersion = config.get<string>("SANITY_API_VERSION") || "2024-01-01";
    this.token = config.get<string>("SANITY_WRITE_TOKEN") || null;
    this.baseUrl = projectId
      ? `https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}`
      : null;
  }

  isConfigured() {
    return Boolean(this.baseUrl && this.token);
  }

  async mutate(mutations: object[]) {
    if (!this.baseUrl || !this.token) {
      this.logger.warn("Sanity write not configured — skipping mutate");
      return { skipped: true };
    }

    const res = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mutations }),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Sanity mutate failed: ${text}`);
      throw new Error("Sanity mutate failed");
    }

    return res.json();
  }
}
