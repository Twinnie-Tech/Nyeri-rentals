import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";

/**
 * Sanity CMS client held only on the BFF.
 * Listing media/copy stays in Sanity; Nest owns the write token for web + mobile.
 */
@Injectable()
export class SanityService {
  private readonly logger = new Logger(SanityService.name);
  private readonly projectId: string | null;
  private readonly dataset: string;
  private readonly apiVersion: string;
  private readonly token: string | null;
  private readonly mutateUrl: string | null;
  private readonly queryUrl: string | null;
  private readonly assetsUrl: string | null;

  constructor(config: ConfigService) {
    this.projectId = config.get<string>("SANITY_PROJECT_ID") || null;
    this.dataset = config.get<string>("SANITY_DATASET") || "production";
    this.apiVersion = config.get<string>("SANITY_API_VERSION") || "2024-01-01";
    this.token = config.get<string>("SANITY_WRITE_TOKEN") || null;

    if (this.projectId) {
      const host = `https://${this.projectId}.api.sanity.io/v${this.apiVersion}`;
      this.mutateUrl = `${host}/data/mutate/${this.dataset}`;
      this.queryUrl = `${host}/data/query/${this.dataset}`;
      this.assetsUrl = `${host}/assets/images/${this.dataset}`;
    } else {
      this.mutateUrl = null;
      this.queryUrl = null;
      this.assetsUrl = null;
    }
  }

  isConfigured() {
    return Boolean(this.mutateUrl && this.token);
  }

  private assertConfigured() {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        "Sanity write is not configured (SANITY_PROJECT_ID / SANITY_WRITE_TOKEN)",
      );
    }
  }

  async mutate(mutations: object[]) {
    this.assertConfigured();
    // returnIds defaults to false — without it, creates succeed but results have no id
    const url = new URL(this.mutateUrl!);
    url.searchParams.set("returnIds", "true");
    url.searchParams.set("autoGenerateArrayKeys", "true");

    const res = await fetch(url.toString(), {
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
      throw new Error(`Sanity mutate failed: ${text}`);
    }

    return res.json() as Promise<{
      transactionId: string;
      results: Array<{
        id?: string;
        documentId?: string;
        operation: string;
      }>;
    }>;
  }

  private resultDocumentId(result?: {
    id?: string;
    documentId?: string;
  }): string | undefined {
    return result?.id || result?.documentId;
  }

  async createDocument(doc: Record<string, unknown>) {
    const result = await this.mutate([{ create: doc }]);
    const id = this.resultDocumentId(result.results?.[0]);
    if (!id) {
      this.logger.error(
        `Sanity create returned no document id: ${JSON.stringify(result)}`,
      );
      throw new Error("Sanity create returned no document id");
    }
    return { ...doc, _id: id };
  }

  async createOrReplaceDocument(
    doc: Record<string, unknown> & { _id: string },
  ) {
    const result = await this.mutate([{ createOrReplace: doc }]);
    return {
      ...doc,
      _id: this.resultDocumentId(result.results?.[0]) || doc._id,
    };
  }

  async patchDocument(id: string, set: Record<string, unknown>) {
    await this.mutate([
      {
        patch: {
          id,
          set,
        },
      },
    ]);
    return { _id: id, ...set };
  }

  async deleteDocument(id: string) {
    await this.mutate([{ delete: { id } }]);
    return { deleted: true, id };
  }

  async query<T = unknown>(
    groq: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    this.assertConfigured();
    const url = new URL(this.queryUrl!);
    url.searchParams.set("query", groq);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(`$${key}`, JSON.stringify(value));
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Sanity query failed: ${text}`);
      throw new Error("Sanity query failed");
    }

    const json = (await res.json()) as { result: T };
    return json.result;
  }

  async uploadImage(
    buffer: Buffer,
    filename: string,
    contentType: string,
  ): Promise<{ _id: string; url?: string }> {
    this.assertConfigured();
    const url = new URL(this.assetsUrl!);
    url.searchParams.set("filename", filename);

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": contentType || "application/octet-stream",
      },
      body: new Uint8Array(buffer),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Sanity asset upload failed: ${text}`);
      throw new Error("Sanity asset upload failed");
    }

    const asset = (await res.json()) as {
      document: { _id: string; url?: string };
    };
    return { _id: asset.document._id, url: asset.document.url };
  }
}
