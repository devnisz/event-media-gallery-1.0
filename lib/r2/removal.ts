/**
 * Remoção de objetos no Cloudflare R2 (compatível com S3).
 * Variáveis de ambiente alinhadas ao uploader (`video-uploader/uploader.js`).
 */
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

const DEFAULT_R2_REGION = "auto";
const DEFAULT_KEY_PREFIX = "videos";

function createR2Endpoint(accountId: string) {
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

export type R2DeletionContext = {
  client: S3Client;
  bucket: string;
  keyPrefix: string;
};

/** Instancia cliente S3 apenas se todas as credenciais R2 estiverem definidas. */
export function tryCreateR2DeletionClient(): R2DeletionContext | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucketName = process.env.R2_BUCKET_NAME?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return null;
  }

  const region = process.env.R2_REGION?.trim() || DEFAULT_R2_REGION;
  const keyPrefix = (
    process.env.R2_KEY_PREFIX?.trim() || DEFAULT_KEY_PREFIX
  ).replace(/^\/+|\/+$/g, "");

  try {
    const client = new S3Client({
      region,
      endpoint: createR2Endpoint(accountId),
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    return { client, bucket: bucketName, keyPrefix };
  } catch {
    return null;
  }
}

function formatErr(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Lista e apaga objetos sob `prefix/` (ex.: `videos/<videoId>/`).
 * Falhas por lote são acumuladas; falhas em Listagem encerram esse prefixo mas não lançam.
 */
export async function deleteAllObjectsWithPrefix(
  client: S3Client,
  bucket: string,
  prefix: string,
): Promise<{ deleted: number; errors: string[] }> {
  const errors: string[] = [];
  let deleted = 0;
  let continuationToken: string | undefined;

  const normalizedPrefix = `${prefix.replace(/\/+$/, "")}/`;

  try {
    do {
      let listOut;
      try {
        listOut = await client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: normalizedPrefix,
            ContinuationToken: continuationToken,
          }),
        );
      } catch (err) {
        errors.push(`ListObjects "${normalizedPrefix}": ${formatErr(err)}`);
        break;
      }

      const keys = (listOut.Contents ?? [])
        .map((o) => o.Key)
        .filter((k): k is string => Boolean(k));

      continuationToken = listOut.IsTruncated
        ? listOut.NextContinuationToken
        : undefined;

      if (keys.length === 0) {
        continue;
      }

      for (let i = 0; i < keys.length; i += 1000) {
        const batch = keys.slice(i, i + 1000);

        try {
          const delOut = await client.send(
            new DeleteObjectsCommand({
              Bucket: bucket,
              Delete: {
                Objects: batch.map((Key) => ({ Key })),
                Quiet: false,
              },
            }),
          );

          deleted += delOut.Deleted?.length ?? 0;

          for (const err of delOut.Errors ?? []) {
            errors.push(
              `${err.Key ?? "?"}: ${err.Message ?? err.Code ?? "unknown"}`,
            );
          }
        } catch (err) {
          errors.push(`DeleteObjects (${batch.length} keys): ${formatErr(err)}`);
        }
      }
    } while (continuationToken);
  } catch (err) {
    errors.push(`deleteAllObjectsWithPrefix "${normalizedPrefix}": ${formatErr(err)}`);
  }

  return { deleted, errors };
}
