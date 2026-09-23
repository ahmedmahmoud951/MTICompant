using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MTI.ProjectManagement.Application.Contracts;

namespace MTI.ProjectManagement.Infrastructure.Services;

public class BackblazeB2StorageService : IMediaStorageService, IB2StorageService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<BackblazeB2StorageService>? _logger;
    private readonly IAmazonS3 _s3Client;
    private readonly string _bucketName;
    private readonly string _downloadUrl;

    public BackblazeB2StorageService(
        IConfiguration configuration,
        ILogger<BackblazeB2StorageService>? logger = null)
    {
        _configuration = configuration;
        _logger = logger;

        var keyId = _configuration["BackblazeB2:KeyId"] ?? throw new InvalidOperationException("BackblazeB2:KeyId is missing.");
        var appKey = _configuration["BackblazeB2:ApplicationKey"] ?? throw new InvalidOperationException("BackblazeB2:ApplicationKey is missing.");
        _bucketName = _configuration["BackblazeB2:BucketName"] ?? "MTICompany";
        var serviceUrl = _configuration["BackblazeB2:ServiceUrl"] ?? "https://s3.us-east-005.backblazeb2.com";
        _downloadUrl = _configuration["BackblazeB2:DownloadUrl"] ?? "https://f005.backblazeb2.com";

        var credentials = new BasicAWSCredentials(keyId.Trim(), appKey.Trim());
        var config = new AmazonS3Config
        {
            ServiceURL = serviceUrl,
            AuthenticationRegion = "us-east-005",
            ForcePathStyle = true
        };

        _s3Client = new AmazonS3Client(credentials, config);
    }

    private static string SanitizeFileName(string fileName)
    {
        var clean = Path.GetFileName(fileName) ?? "file";
        var ext = Path.GetExtension(clean);
        if (ext.Length > 16) ext = "";

        // B2/S3 SigV4 rejects non-ASCII / special chars in object keys ("Seed signature is invalid")
        var nameOnly = Path.GetFileNameWithoutExtension(clean);
        var ascii = new string(nameOnly
            .Select(ch => char.IsAsciiLetterOrDigit(ch) || ch is '-' or '_' or '.' ? ch : '_')
            .ToArray())
            .Trim('_', '.');

        if (string.IsNullOrWhiteSpace(ascii) || ascii.Length < 2)
            ascii = "file";

        if (ascii.Length > 80)
            ascii = ascii[..80];

        var safeExt = new string((ext ?? "")
            .Select(ch => char.IsAsciiLetterOrDigit(ch) || ch == '.' ? ch : '_')
            .ToArray());

        return $"{ascii}_{Guid.NewGuid():N}{safeExt}";
    }

    public string BuildDocumentObjectKey(Guid projectId, Guid documentId, Guid versionId, string fileName)
    {
        var safeFileName = SanitizeFileName(fileName);
        return $"projects/{projectId}/documents/{documentId}/versions/{versionId}/{safeFileName}";
    }

    public string BuildAssetObjectKey(Guid projectId, Guid assetId, string fileName)
    {
        var safeFileName = SanitizeFileName(fileName);
        return $"projects/{projectId}/assets/{assetId}/{safeFileName}";
    }

    public static string ComputeSha256(Stream stream)
    {
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var hashBytes = sha256.ComputeHash(stream);
        if (stream.CanSeek) stream.Position = 0;
        return BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
    }

    public string BuildChatObjectKey(Guid conversationId, Guid messageId, Guid attachmentId, string fileName)
    {
        var safeFileName = SanitizeFileName(fileName);
        return $"chat/{conversationId}/{messageId}/{attachmentId}/{safeFileName}";
    }

    public string BuildObjectKey(string entityType, Guid? projectId, Guid? siteId, Guid? entityId, Guid mediaId, string fileName)
    {
        var cleanFileName = Path.GetFileName(fileName).Replace(" ", "_");
        return entityType.ToLowerInvariant() switch
        {
            "document" or "documentversion" => $"projects/{projectId}/documents/{entityId}/versions/{mediaId}/{cleanFileName}",
            "asset" or "companyasset" => $"projects/{projectId}/assets/{entityId}/{cleanFileName}",
            "chat" or "conversation" => $"chat/{entityId}/media/{mediaId}/{cleanFileName}",
            "projectdata" or "data" => $"projects/{projectId}/sites/{siteId}/data/{entityId}/media/{mediaId}/{cleanFileName}",
            "task" or "taskitem" => $"tasks/{entityId}/attachments/{mediaId}/{cleanFileName}",
            "user" or "profile" => $"users/{entityId}/profile/{mediaId}/{cleanFileName}",
            _ => $"general/{entityType.ToLowerInvariant()}/{entityId}/{mediaId}/{cleanFileName}"
        };
    }

    public async Task<(string ObjectKey, string Checksum, long FileSize)> UploadStreamAsync(
        Stream stream,
        string objectKey,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        using var ms = new MemoryStream();
        await stream.CopyToAsync(ms, cancellationToken);
        ms.Position = 0;

        string checksum;
        using (var sha256 = System.Security.Cryptography.SHA256.Create())
        {
            var hashBytes = sha256.ComputeHash(ms);
            checksum = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
        }
        ms.Position = 0;

        var putRequest = new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = objectKey,
            InputStream = ms,
            ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType,
            // Required for Backblaze B2 S3-compatible API — avoids "Seed signature is invalid"
            DisablePayloadSigning = true,
            UseChunkEncoding = false
        };

        await _s3Client.PutObjectAsync(putRequest, cancellationToken);
        return (objectKey, checksum, ms.Length);
    }


    public Task<string> GeneratePreSignedUploadUrlAsync(string objectKey, string contentType, TimeSpan expiry, CancellationToken cancellationToken = default)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucketName,
            Key = objectKey,
            Verb = HttpVerb.PUT,
            ContentType = contentType,
            Expires = DateTime.UtcNow.Add(expiry)
        };

        var url = _s3Client.GetPreSignedURL(request);
        return Task.FromResult(url);
    }

    public Task<string> GeneratePreSignedDownloadUrlAsync(string objectKey, TimeSpan expiry, CancellationToken cancellationToken = default)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucketName,
            Key = objectKey,
            Verb = HttpVerb.GET,
            Expires = DateTime.UtcNow.Add(expiry)
        };

        var url = _s3Client.GetPreSignedURL(request);
        return Task.FromResult(url);
    }

    public async Task<bool> DoesObjectExistAsync(string objectKey, CancellationToken cancellationToken = default)
    {
        try
        {
            var meta = await _s3Client.GetObjectMetadataAsync(_bucketName, objectKey, cancellationToken);
            return meta.HttpStatusCode == System.Net.HttpStatusCode.OK;
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return false;
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Failed to check object existence in B2 for {ObjectKey}", objectKey);
            return false;
        }
    }

    public async Task<Stream?> DownloadFileAsync(string objectKey, CancellationToken cancellationToken = default)
    {
        try
        {
            var res = await _s3Client.GetObjectAsync(_bucketName, objectKey, cancellationToken);
            var ms = new MemoryStream();
            await res.ResponseStream.CopyToAsync(ms, cancellationToken);
            ms.Position = 0;
            return ms;
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<bool> DeleteFileAsync(string objectKey, CancellationToken cancellationToken = default)
    {
        try
        {
            await _s3Client.DeleteObjectAsync(_bucketName, objectKey, cancellationToken);
            return true;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to delete object from Backblaze B2: {ObjectKey}", objectKey);
            return false;
        }
    }

    // IB2StorageService implementation
    public async Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType, string bucketName, CancellationToken cancellationToken = default)
    {
        var mediaId = Guid.NewGuid();
        var objectKey = $"uploads/{DateTime.UtcNow:yyyy/MM}/{mediaId}/{Path.GetFileName(fileName)}";
        var targetBucket = string.IsNullOrWhiteSpace(bucketName) ? _bucketName : bucketName;

        var putRequest = new PutObjectRequest
        {
            BucketName = targetBucket,
            Key = objectKey,
            InputStream = fileStream,
            ContentType = contentType
        };

        await _s3Client.PutObjectAsync(putRequest, cancellationToken);
        return objectKey;
    }

    public async Task<Stream?> DownloadFileAsync(string bucketName, string objectKey, CancellationToken cancellationToken = default)
    {
        return await DownloadFileAsync(objectKey, cancellationToken);
    }

    public async Task<bool> DeleteFileAsync(string bucketName, string objectKey, CancellationToken cancellationToken = default)
    {
        return await DeleteFileAsync(objectKey, cancellationToken);
    }

    public string GetPreSignedUrl(string bucketName, string objectKey, TimeSpan expiry)
    {
        return GeneratePreSignedDownloadUrlAsync(objectKey, expiry).GetAwaiter().GetResult();
    }
}
