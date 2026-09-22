using System.Text;
using Microsoft.Extensions.Configuration;
using MTI.ProjectManagement.Infrastructure.Services;
using Xunit;

namespace MTI.ProjectManagement.UnitTests;

public class BackblazeB2Tests
{
    [Fact]
    public async Task CanUploadAndDownloadFromBackblazeB2()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            {"BackblazeB2:KeyId", "005bc9fb11d7d470000000001"},
            {"BackblazeB2:ApplicationKey", "K005HsOSzl/nxjJq3k7Pit0160P2U2w"},
            {"BackblazeB2:BucketName", "MTICompany"},
            {"BackblazeB2:ServiceUrl", "https://s3.us-east-005.backblazeb2.com"},
            {"BackblazeB2:DownloadUrl", "https://f005.backblazeb2.com"}
        };

        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var b2Service = new B2StorageService(configuration);

        var testContent = "MTI Engineering Solutions - Backblaze B2 Storage Verification Test " + DateTime.UtcNow.ToString("O");
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(testContent));

        // 1. Upload Test File
        var objectKey = await b2Service.UploadFileAsync(stream, "test_file.txt", "text/plain", "MTICompany");
        Assert.NotNull(objectKey);
        Assert.Contains("test_file.txt", objectKey);

        // 2. Download Test File
        using var downloadedStream = await b2Service.DownloadFileAsync("MTICompany", objectKey);
        Assert.NotNull(downloadedStream);

        using var reader = new StreamReader(downloadedStream);
        var downloadedText = await reader.ReadToEndAsync();
        Assert.Equal(testContent, downloadedText);

        // 3. Pre-Signed / Direct Download URL
        var url = b2Service.GetPreSignedUrl("MTICompany", objectKey, TimeSpan.FromMinutes(10));
        Assert.NotNull(url);
        Assert.Contains("MTICompany", url);
    }
}
