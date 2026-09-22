using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MTI.ProjectManagement.Application.Contracts;

namespace MTI.ProjectManagement.Infrastructure.Services;

public class B2StorageService : IB2StorageService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<B2StorageService>? _logger;
    private readonly HttpClient _httpClient;
    private readonly IAmazonS3? _s3Client;

    private readonly string? _keyId;
    private readonly string? _appKey;
    private readonly string? _bucketName;
    private readonly string _serviceUrl;
    private readonly string _downloadUrl;

    // Cached B2 Auth tokens
    private string? _cachedAuthToken;
    private string? _cachedApiUrl;
    private string? _cachedDownloadUrl;
    private DateTime _authExpiresAt = DateTime.MinValue;

    public B2StorageService(
        IConfiguration configuration,
        ILogger<B2StorageService>? logger = null)
    {
        _configuration = configuration;
        _logger = logger;
        _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(60) };
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "MTI-ProjectManagement/1.0");

        _keyId = _configuration["BackblazeB2:KeyId"];
        _appKey = _configuration["BackblazeB2:ApplicationKey"];
        _bucketName = _configuration["BackblazeB2:BucketName"] ?? "MTICompany";
        _serviceUrl = _configuration["BackblazeB2:ServiceUrl"] ?? "https://s3.us-east-005.backblazeb2.com";
        _downloadUrl = _configuration["BackblazeB2:DownloadUrl"] ?? "https://f005.backblazeb2.com";

        if (!string.IsNullOrEmpty(_keyId) && !string.IsNullOrEmpty(_appKey))
        {
            try
            {
                var credentials = new BasicAWSCredentials(_keyId, _appKey);
                var config = new AmazonS3Config
                {
                    ServiceURL = _serviceUrl,
                    AuthenticationRegion = "us-east-005",
                    ForcePathStyle = true
                };
                _s3Client = new AmazonS3Client(credentials, config);
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Failed to initialize AmazonS3Client for Backblaze B2, falling back to Native B2 REST API.");
            }
        }
    }

    private async Task EnsureB2AuthorizedAsync(CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrEmpty(_cachedAuthToken) && DateTime.UtcNow < _authExpiresAt)
            return;

        if (string.IsNullOrEmpty(_keyId) || string.IsNullOrEmpty(_appKey))
            throw new InvalidOperationException("Backblaze B2 credentials are not configured.");

        var authBytes = Encoding.UTF8.GetBytes($"{_keyId?.Trim()}:{_appKey?.Trim()}");
        var base64Auth = Convert.ToBase64String(authBytes);

        using var request = new HttpRequestMessage(HttpMethod.Get, "https://api.backblazeb2.com/b2api/v3/b2_authorize_account");
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", base64Auth);

        var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new HttpRequestException($"B2 authorize failed with {(int)response.StatusCode}: {err}. Base64 auth length: {base64Auth.Length}, KeyId: {_keyId}");
        }

        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        _cachedAuthToken = root.GetProperty("authorizationToken").GetString();
        var storageApi = root.GetProperty("apiInfo").GetProperty("storageApi");
        _cachedApiUrl = storageApi.GetProperty("apiUrl").GetString();
        _cachedDownloadUrl = storageApi.GetProperty("downloadUrl").GetString();
        _authExpiresAt = DateTime.UtcNow.AddHours(23); // Tokens are valid for 24h
    }

    public async Task<string> UploadFileAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        string bucketName,
        CancellationToken cancellationToken = default)
    {
        var objectKey = $"{DateTime.UtcNow:yyyy/MM}/{Guid.NewGuid():N}/{fileName}";
        var targetBucket = string.IsNullOrEmpty(bucketName) ? _bucketName : bucketName;

        try
        {
            await EnsureB2AuthorizedAsync(cancellationToken);

            // 1. Get Upload URL from B2 API
            using var getUploadUrlReq = new HttpRequestMessage(HttpMethod.Post, $"{_cachedApiUrl}/b2api/v3/b2_get_upload_url");
            getUploadUrlReq.Headers.TryAddWithoutValidation("Authorization", _cachedAuthToken);

            // Resolve bucket ID by name if needed or pass bucketId
            var bucketIdReqBody = JsonSerializer.Serialize(new { bucketId = await GetBucketIdAsync(targetBucket!, cancellationToken) });
            getUploadUrlReq.Content = new StringContent(bucketIdReqBody, Encoding.UTF8, "application/json");

            var uploadUrlRes = await _httpClient.SendAsync(getUploadUrlReq, cancellationToken);
            uploadUrlRes.EnsureSuccessStatusCode();

            var uploadUrlJson = await uploadUrlRes.Content.ReadAsStringAsync(cancellationToken);
            using var uploadUrlDoc = JsonDocument.Parse(uploadUrlJson);
            var uploadUrl = uploadUrlDoc.RootElement.GetProperty("uploadUrl").GetString()!;
            var uploadAuthToken = uploadUrlDoc.RootElement.GetProperty("authorizationToken").GetString()!;

            // 2. Compute SHA1 Checksum
            byte[] fileBytes;
            using (var ms = new MemoryStream())
            {
                await fileStream.CopyToAsync(ms, cancellationToken);
                fileBytes = ms.ToArray();
            }

            var sha1 = Convert.ToHexString(SHA1.HashData(fileBytes)).ToLowerInvariant();

            // 3. Upload File bytes
            using var uploadReq = new HttpRequestMessage(HttpMethod.Post, uploadUrl);
            uploadReq.Headers.TryAddWithoutValidation("Authorization", uploadAuthToken);
            uploadReq.Headers.Add("X-Bz-File-Name", Uri.EscapeDataString(objectKey));
            uploadReq.Headers.Add("Content-Type", contentType);
            uploadReq.Headers.Add("X-Bz-Content-Sha1", sha1);
            uploadReq.Content = new ByteArrayContent(fileBytes);

            var uploadRes = await _httpClient.SendAsync(uploadReq, cancellationToken);
            uploadRes.EnsureSuccessStatusCode();

            return objectKey;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error uploading to Backblaze B2: {Message}", ex.Message);

            // Try S3 client as fallback
            if (_s3Client != null)
            {
                try
                {
                    fileStream.Position = 0;
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
                catch (Exception s3Ex)
                {
                    _logger?.LogError(s3Ex, "S3 Fallback upload also failed.");
                }
            }

            throw;
        }
    }

    private async Task<string> GetBucketIdAsync(string bucketName, CancellationToken cancellationToken)
    {
        await EnsureB2AuthorizedAsync(cancellationToken);

        using var req = new HttpRequestMessage(HttpMethod.Post, $"{_cachedApiUrl}/b2api/v3/b2_list_buckets");
        req.Headers.TryAddWithoutValidation("Authorization", _cachedAuthToken);
        req.Content = new StringContent(JsonSerializer.Serialize(new { bucketName }), Encoding.UTF8, "application/json");

        var res = await _httpClient.SendAsync(req, cancellationToken);
        res.EnsureSuccessStatusCode();

        var json = await res.Content.ReadAsStringAsync(cancellationToken);
        using var doc = JsonDocument.Parse(json);
        var buckets = doc.RootElement.GetProperty("buckets");
        foreach (var b in buckets.EnumerateArray())
        {
            if (b.GetProperty("bucketName").GetString() == bucketName)
            {
                return b.GetProperty("bucketId").GetString()!;
            }
        }

        throw new InvalidOperationException($"Bucket '{bucketName}' not found in Backblaze B2 account.");
    }

    public async Task<Stream?> DownloadFileAsync(string bucketName, string objectKey, CancellationToken cancellationToken = default)
    {
        await EnsureB2AuthorizedAsync(cancellationToken);
        var targetBucket = string.IsNullOrEmpty(bucketName) ? _bucketName : bucketName;
        var downloadUrl = $"{_cachedDownloadUrl ?? _downloadUrl}/file/{targetBucket}/{objectKey}";

        using var req = new HttpRequestMessage(HttpMethod.Get, downloadUrl);
        req.Headers.TryAddWithoutValidation("Authorization", _cachedAuthToken);

        var res = await _httpClient.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        if (!res.IsSuccessStatusCode) return null;

        var ms = new MemoryStream();
        await res.Content.CopyToAsync(ms, cancellationToken);
        ms.Position = 0;
        return ms;
    }

    public async Task<bool> DeleteFileAsync(string bucketName, string objectKey, CancellationToken cancellationToken = default)
    {
        // For deleting files, S3 API or B2 delete file versions can be used
        if (_s3Client != null)
        {
            try
            {
                var targetBucket = string.IsNullOrEmpty(bucketName) ? _bucketName : bucketName;
                await _s3Client.DeleteObjectAsync(new DeleteObjectRequest { BucketName = targetBucket, Key = objectKey }, cancellationToken);
                return true;
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Failed to delete file via S3 client.");
            }
        }
        return true;
    }

    public string GetPreSignedUrl(string bucketName, string objectKey, TimeSpan expiry)
    {
        var targetBucket = string.IsNullOrEmpty(bucketName) ? _bucketName : bucketName;
        return $"{_downloadUrl}/file/{targetBucket}/{objectKey}";
    }
}
