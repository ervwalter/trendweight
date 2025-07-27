using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using System.Security.Claims;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.ProviderLinks.Services;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Features.Providers;
using TrendWeight.Features.Providers.Models;
using TrendWeight.Features.Profile.Models;
using TrendWeight.Common.Models;
using TrendWeight.Infrastructure.DataAccess.Models;
using TrendWeight.Tests.Fixtures;
using Xunit;

namespace TrendWeight.Tests.Features.Providers.Controllers;

public class ProvidersControllerTests : TestBase
{
    private readonly Mock<IProviderLinkService> _providerLinkServiceMock;
    private readonly Mock<ISourceDataService> _sourceDataServiceMock;
    private readonly Mock<IProviderIntegrationService> _providerIntegrationServiceMock;
    private readonly Mock<IMeasurementSyncService> _measurementSyncServiceMock;
    private readonly Mock<IProfileService> _profileServiceMock;
    private readonly Mock<ILogger<ProvidersController>> _loggerMock;
    private readonly ProvidersController _sut;

    public ProvidersControllerTests()
    {
        _providerLinkServiceMock = new Mock<IProviderLinkService>();
        _sourceDataServiceMock = new Mock<ISourceDataService>();
        _providerIntegrationServiceMock = new Mock<IProviderIntegrationService>();
        _measurementSyncServiceMock = new Mock<IMeasurementSyncService>();
        _profileServiceMock = new Mock<IProfileService>();
        _loggerMock = new Mock<ILogger<ProvidersController>>();

        _sut = new ProvidersController(
            _providerLinkServiceMock.Object,
            _sourceDataServiceMock.Object,
            _providerIntegrationServiceMock.Object,
            _measurementSyncServiceMock.Object,
            _profileServiceMock.Object,
            _loggerMock.Object);
    }

    #region GetProviderLinks Tests

    [Fact]
    public async Task GetProviderLinks_WithValidUser_ReturnsProviderList()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var providerLinks = CreateTestProviderLinks(userId);

        SetupAuthenticatedUser(userId.ToString());
        _providerLinkServiceMock.Setup(x => x.GetAllForUserAsync(userId))
            .ReturnsAsync(providerLinks);

        // Act
        var result = await _sut.GetProviderLinks();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<List<ProviderLinkResponse>>().Subject;
        response.Should().HaveCount(2);

        response[0].Provider.Should().Be("withings");
        response[0].HasToken.Should().Be(true);
        response[1].Provider.Should().Be("fitbit");
        response[1].HasToken.Should().Be(true);
    }

    [Fact]
    public async Task GetProviderLinks_WithDisabledLegacyProvider_IncludesItWithIsDisabledTrue()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var providerLinks = new List<DbProviderLink>
        {
            CreateTestProviderLink(userId, "withings"),
            CreateTestProviderLink(userId, "fitbit"),
            new DbProviderLink
            {
                Uid = userId,
                Provider = "legacy",
                UpdateReason = "legacy_import",
                Token = new Dictionary<string, object> { { "disabled", true } },
                UpdatedAt = DateTime.UtcNow.ToString("O")
            }
        };

        SetupAuthenticatedUser(userId.ToString());
        _providerLinkServiceMock.Setup(x => x.GetAllForUserAsync(userId))
            .ReturnsAsync(providerLinks);

        // Act
        var result = await _sut.GetProviderLinks();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<List<ProviderLinkResponse>>().Subject;

        // Should return all providers including disabled legacy
        response.Should().HaveCount(3);
        var legacyProvider = response.Single(r => r.Provider == "legacy");
        legacyProvider.IsDisabled.Should().BeTrue();
    }

    [Fact]
    public async Task GetProviderLinks_WithActiveLegacyProvider_IncludesLegacy()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var providerLinks = new List<DbProviderLink>
        {
            CreateTestProviderLink(userId, "withings"),
            CreateTestProviderLink(userId, "legacy")
        };

        SetupAuthenticatedUser(userId.ToString());
        _providerLinkServiceMock.Setup(x => x.GetAllForUserAsync(userId))
            .ReturnsAsync(providerLinks);

        // Act
        var result = await _sut.GetProviderLinks();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<List<ProviderLinkResponse>>().Subject;

        // Should return all providers including legacy
        response.Should().HaveCount(2);
        response.Should().Contain(r => r.Provider == "legacy");
    }

    [Fact]
    public async Task GetProviderLinks_WithNoUserIdClaim_ReturnsUnauthorized()
    {
        // Arrange
        SetupAuthenticatedUser(null);

        // Act
        var result = await _sut.GetProviderLinks();

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User ID not found");
    }

    [Fact]
    public async Task GetProviderLinks_WithInvalidGuid_ReturnsUnauthorized()
    {
        // Arrange
        SetupAuthenticatedUser("invalid-guid");

        // Act
        var result = await _sut.GetProviderLinks();

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User ID not found");
    }

    [Fact]
    public async Task GetProviderLinks_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString());
        _providerLinkServiceMock.Setup(x => x.GetAllForUserAsync(It.IsAny<Guid>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.GetProviderLinks();

        // Assert
        result.Result.Should().BeOfType<ObjectResult>()
            .Which.StatusCode.Should().Be(500);
        var errorResult = result.Result as ObjectResult;
        errorResult!.Value.Should().BeOfType<ErrorResponse>();
    }

    #endregion

    #region DisconnectProvider Tests

    [Fact]
    public async Task DisconnectProvider_WithValidProviderAndLink_ReturnsSuccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "withings";
        var existingLink = CreateTestProviderLink(userId, provider);
        var providerService = new Mock<IProviderService>();

        SetupAuthenticatedUser(userId.ToString());
        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, provider))
            .ReturnsAsync(existingLink);
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService(provider))
            .Returns(providerService.Object);
        providerService.Setup(x => x.RemoveProviderLinkAsync(userId))
            .ReturnsAsync(true);

        // Act
        var result = await _sut.DisconnectProvider(provider);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ProviderOperationResponse>().Subject;

        response.Message.Should().Be($"{provider} disconnected successfully");
        providerService.Verify(x => x.RemoveProviderLinkAsync(userId), Times.Once);
    }

    [Theory]
    [InlineData("invalid-provider")]
    [InlineData("unknown")]
    [InlineData("google")]
    public async Task DisconnectProvider_WithInvalidProvider_ReturnsBadRequest(string invalidProvider)
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString());

        // Act
        var result = await _sut.DisconnectProvider(invalidProvider);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("Invalid provider. Must be 'withings' or 'fitbit'");
    }

    [Fact]
    public async Task DisconnectProvider_WithLegacyProvider_ReturnsSuccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "legacy";
        var existingLink = CreateTestProviderLink(userId, provider);

        SetupAuthenticatedUser(userId.ToString());
        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, provider))
            .ReturnsAsync(existingLink);

        // Mock the provider service for legacy
        var mockLegacyService = new Mock<IProviderService>();
        mockLegacyService.Setup(x => x.RemoveProviderLinkAsync(userId))
            .ReturnsAsync(true);

        _providerIntegrationServiceMock.Setup(x => x.GetProviderService(provider))
            .Returns(mockLegacyService.Object);

        // Act
        var result = await _sut.DisconnectProvider(provider);

        // Assert
        // This test will initially fail because we haven't implemented legacy support yet
        // We expect it to succeed after implementation
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ProviderOperationResponse>().Subject;
        response.Message.Should().Be($"{provider} disconnected successfully");

        // Verify provider service was called to remove the link
        mockLegacyService.Verify(x => x.RemoveProviderLinkAsync(userId), Times.Once);

        // Verify source data was NOT deleted for legacy provider
        _sourceDataServiceMock.Verify(x => x.DeleteSourceDataAsync(userId, provider), Times.Never);
    }

    [Fact]
    public async Task DisconnectProvider_WithNoUserIdClaim_ReturnsUnauthorized()
    {
        // Arrange
        SetupAuthenticatedUser(null);

        // Act
        var result = await _sut.DisconnectProvider("withings");

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User ID not found");
    }

    [Fact]
    public async Task DisconnectProvider_WhenLinkNotFound_ReturnsNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "withings";

        SetupAuthenticatedUser(userId.ToString());
        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, provider))
            .ReturnsAsync((DbProviderLink?)null);

        // Act
        var result = await _sut.DisconnectProvider(provider);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be($"No {provider} connection found");
    }

    [Fact]
    public async Task DisconnectProvider_WhenProviderServiceNotFound_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "withings";
        var existingLink = CreateTestProviderLink(userId, provider);

        SetupAuthenticatedUser(userId.ToString());
        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, provider))
            .ReturnsAsync(existingLink);
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService(provider))
            .Returns((IProviderService?)null);

        // Act
        var result = await _sut.DisconnectProvider(provider);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be($"Provider service not found for: {provider}");
    }

    [Fact]
    public async Task DisconnectProvider_WhenRemoveFails_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "withings";
        var existingLink = CreateTestProviderLink(userId, provider);
        var providerService = new Mock<IProviderService>();

        SetupAuthenticatedUser(userId.ToString());
        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, provider))
            .ReturnsAsync(existingLink);
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService(provider))
            .Returns(providerService.Object);
        providerService.Setup(x => x.RemoveProviderLinkAsync(userId))
            .ReturnsAsync(false);

        // Act
        var result = await _sut.DisconnectProvider(provider);

        // Assert
        result.Result.Should().BeOfType<ObjectResult>()
            .Which.StatusCode.Should().Be(500);
        var errorResult = result.Result as ObjectResult;
        errorResult!.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be($"Failed to disconnect {provider}");
    }

    #endregion

    #region EnableProvider Tests

    [Fact]
    public async Task EnableProvider_WithLegacyProvider_ReturnsSuccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var legacyService = new Mock<LegacyService>(_providerLinkServiceMock.Object, new Mock<ILogger<LegacyService>>().Object);
        legacyService.Setup(x => x.EnableProviderLinkAsync(userId))
            .ReturnsAsync(true);

        SetupAuthenticatedUser(userId.ToString());
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("legacy"))
            .Returns(legacyService.Object);

        // Act
        var result = await _sut.EnableProvider("legacy");

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ProviderOperationResponse>().Subject;
        response.Message.Should().Be("legacy enabled successfully");

        legacyService.Verify(x => x.EnableProviderLinkAsync(userId), Times.Once);
    }

    [Fact]
    public async Task EnableProvider_WithNonLegacyProvider_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString());

        // Act
        var result = await _sut.EnableProvider("withings");

        // Assert
        result.Should().NotBeNull();
        var badResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badResult.Value.Should().BeOfType<ErrorResponse>().Subject;
        response.Error.Should().Be("Only legacy provider can be enabled");
    }

    [Fact]
    public async Task EnableProvider_WithNonExistentLink_ReturnsNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var legacyService = new Mock<LegacyService>(_providerLinkServiceMock.Object, new Mock<ILogger<LegacyService>>().Object);
        legacyService.Setup(x => x.EnableProviderLinkAsync(userId))
            .ReturnsAsync(false);

        SetupAuthenticatedUser(userId.ToString());
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("legacy"))
            .Returns(legacyService.Object);

        // Act
        var result = await _sut.EnableProvider("legacy");

        // Assert
        result.Should().NotBeNull();
        var notFoundResult = result.Result.Should().BeOfType<NotFoundObjectResult>().Subject;
        var response = notFoundResult.Value.Should().BeOfType<ErrorResponse>().Subject;
        response.Error.Should().Be("No legacy connection found");
    }

    [Fact]
    public async Task EnableProvider_WithAlreadyEnabledLink_ReturnsSuccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var legacyService = new Mock<LegacyService>(_providerLinkServiceMock.Object, new Mock<ILogger<LegacyService>>().Object);
        legacyService.Setup(x => x.EnableProviderLinkAsync(userId))
            .ReturnsAsync(true);

        SetupAuthenticatedUser(userId.ToString());
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("legacy"))
            .Returns(legacyService.Object);

        // Act
        var result = await _sut.EnableProvider("legacy");

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ProviderOperationResponse>().Subject;
        response.Message.Should().Be("legacy enabled successfully");
    }

    [Fact]
    public async Task EnableProvider_WithNoUserId_ReturnsUnauthorized()
    {
        // Arrange
        SetupAuthenticatedUser(null);

        // Act
        var result = await _sut.EnableProvider("legacy");

        // Assert
        result.Should().NotBeNull();
        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task EnableProvider_WithNoLegacyService_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString());
        _providerIntegrationServiceMock.Setup(x => x.GetProviderService("legacy"))
            .Returns((IProviderService?)null);

        // Act
        var result = await _sut.EnableProvider("legacy");

        // Assert
        result.Should().NotBeNull();
        var badResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badResult.Value.Should().BeOfType<ErrorResponse>().Subject;
        response.Error.Should().Be("Legacy service not available");
    }

    #endregion

    #region ResyncProvider Tests

    [Fact]
    public async Task ResyncProvider_WithValidProviderAndLink_ReturnsSuccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "fitbit";
        var existingLink = CreateTestProviderLink(userId, provider);
        var user = CreateTestProfile(userId);
        var providerService = new Mock<IProviderService>();

        SetupAuthenticatedUser(userId.ToString());
        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, provider))
            .ReturnsAsync(existingLink);
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId.ToString()))
            .ReturnsAsync(user);
        _measurementSyncServiceMock.Setup(x => x.ResyncProviderAsync(userId, provider, user.Profile.UseMetric))
            .ReturnsAsync(new ProviderSyncResult { Provider = provider, Success = true });

        // Act
        var result = await _sut.ResyncProvider(provider);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ProviderOperationResponse>().Subject;

        response.Message.Should().Be($"{provider} resync completed successfully");
        // Resync logic is now handled internally by MeasurementSyncService
    }

    [Theory]
    [InlineData("invalid-provider")]
    [InlineData("unknown")]
    [InlineData("legacy")] // Legacy provider cannot be resynced
    public async Task ResyncProvider_WithInvalidProvider_ReturnsBadRequest(string invalidProvider)
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString());

        // Act
        var result = await _sut.ResyncProvider(invalidProvider);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("Invalid provider. Must be 'withings' or 'fitbit'");
    }

    [Fact]
    public async Task ResyncProvider_WhenUserNotFound_ReturnsNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "withings";
        var existingLink = CreateTestProviderLink(userId, provider);

        SetupAuthenticatedUser(userId.ToString());
        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, provider))
            .ReturnsAsync(existingLink);
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId.ToString()))
            .ReturnsAsync((DbProfile?)null);

        // Act
        var result = await _sut.ResyncProvider(provider);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User not found");
    }

    [Fact]
    public async Task ResyncProvider_WhenSyncFails_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var provider = "withings";
        var existingLink = CreateTestProviderLink(userId, provider);
        var user = CreateTestProfile(userId);
        var providerService = new Mock<IProviderService>();

        SetupAuthenticatedUser(userId.ToString());
        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, provider))
            .ReturnsAsync(existingLink);
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId.ToString()))
            .ReturnsAsync(user);
        _measurementSyncServiceMock.Setup(x => x.ResyncProviderAsync(userId, provider, user.Profile.UseMetric))
            .ReturnsAsync(new ProviderSyncResult { Provider = provider, Success = false });

        // Act
        var result = await _sut.ResyncProvider(provider);

        // Assert
        result.Result.Should().BeOfType<ObjectResult>()
            .Which.StatusCode.Should().Be(500);
        var errorResult = result.Result as ObjectResult;
        errorResult!.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be($"Failed to resync {provider} data");
    }

    #endregion

    #region GetProviderLinksBySharingCode Tests

    [Fact]
    public async Task GetProviderLinksBySharingCode_WithValidCodeAndSharingEnabled_ReturnsProviderList()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var sharingCode = "test-sharing-code";
        var user = CreateTestProfile(userId);
        user.Profile.SharingEnabled = true;
        user.Profile.SharingToken = sharingCode;
        var providerLinks = CreateTestProviderLinks(userId);

        _profileServiceMock.Setup(x => x.GetBySharingTokenAsync(sharingCode))
            .ReturnsAsync(user);
        _providerLinkServiceMock.Setup(x => x.GetAllForUserAsync(userId))
            .ReturnsAsync(providerLinks);

        // Act
        var result = await _sut.GetProviderLinksBySharingCode(sharingCode);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<List<ProviderLinkResponse>>().Subject;
        response.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetProviderLinksBySharingCode_WithDisabledLegacyProvider_IncludesItWithIsDisabledTrue()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var sharingCode = "test-sharing-code";
        var user = CreateTestProfile(userId);
        user.Profile.SharingEnabled = true;
        user.Profile.SharingToken = sharingCode;

        var providerLinks = new List<DbProviderLink>
        {
            CreateTestProviderLink(userId, "withings"),
            new DbProviderLink
            {
                Uid = userId,
                Provider = "legacy",
                UpdateReason = "legacy_import",
                Token = new Dictionary<string, object> { { "disabled", true } },
                UpdatedAt = DateTime.UtcNow.ToString("O")
            }
        };

        _profileServiceMock.Setup(x => x.GetBySharingTokenAsync(sharingCode))
            .ReturnsAsync(user);
        _providerLinkServiceMock.Setup(x => x.GetAllForUserAsync(userId))
            .ReturnsAsync(providerLinks);

        // Act
        var result = await _sut.GetProviderLinksBySharingCode(sharingCode);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<List<ProviderLinkResponse>>().Subject;

        // Should return all providers including disabled legacy
        response.Should().HaveCount(2);
        var legacyProvider = response.Single(r => r.Provider == "legacy");
        legacyProvider.IsDisabled.Should().BeTrue();
    }

    [Fact]
    public async Task GetProviderLinksBySharingCode_WhenUserNotFound_ReturnsNotFound()
    {
        // Arrange
        var sharingCode = "invalid-code";
        _profileServiceMock.Setup(x => x.GetBySharingTokenAsync(sharingCode))
            .ReturnsAsync((DbProfile?)null);

        // Act
        var result = await _sut.GetProviderLinksBySharingCode(sharingCode);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User not found");
    }

    [Fact]
    public async Task GetProviderLinksBySharingCode_WhenSharingDisabled_ReturnsNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var sharingCode = "test-sharing-code";
        var user = CreateTestProfile(userId);
        user.Profile.SharingEnabled = false;
        user.Profile.SharingToken = sharingCode;

        _profileServiceMock.Setup(x => x.GetBySharingTokenAsync(sharingCode))
            .ReturnsAsync(user);

        // Act
        var result = await _sut.GetProviderLinksBySharingCode(sharingCode);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User not found");
    }

    #endregion

    #region Helper Methods

    private void SetupAuthenticatedUser(string? userId)
    {
        var claims = new List<Claim>();
        if (userId != null)
            claims.Add(new Claim(ClaimTypes.NameIdentifier, userId));

        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);

        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
    }

    private static DbProfile CreateTestProfile(Guid userId)
    {
        return new DbProfile
        {
            Uid = userId,
            Email = "test@example.com",
            Profile = new TrendWeight.Features.Profile.Models.ProfileData
            {
                FirstName = "Test User",
                UseMetric = false,
                SharingToken = "test-token",
                SharingEnabled = true
            }
        };
    }

    private static DbProviderLink CreateTestProviderLink(Guid userId, string provider)
    {
        return new DbProviderLink
        {
            Uid = userId,
            Provider = provider,
            UpdateReason = "connected",
            Token = new Dictionary<string, object>
            {
                { "access_token", "test-token" },
                { "refresh_token", "test-refresh" }
            },
            UpdatedAt = DateTime.UtcNow.ToString("O")
        };
    }

    private static List<DbProviderLink> CreateTestProviderLinks(Guid userId)
    {
        return new List<DbProviderLink>
        {
            CreateTestProviderLink(userId, "withings"),
            CreateTestProviderLink(userId, "fitbit")
        };
    }

    #endregion
}
