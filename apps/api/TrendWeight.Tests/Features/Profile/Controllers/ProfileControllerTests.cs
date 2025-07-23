using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using System.Security.Claims;
using TrendWeight.Features.Profile;
using TrendWeight.Features.Profile.Models;
using TrendWeight.Common.Models;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Infrastructure.DataAccess;
using TrendWeight.Infrastructure.DataAccess.Models;
using TrendWeight.Tests.Fixtures;
using Xunit;

namespace TrendWeight.Tests.Features.Profile.Controllers;

public class ProfileControllerTests : TestBase
{
    private readonly Mock<IProfileService> _profileServiceMock;
    private readonly Mock<ILegacyMigrationService> _migrationServiceMock;
    private readonly Mock<ISupabaseService> _supabaseServiceMock;
    private readonly Mock<ILogger<ProfileController>> _loggerMock;
    private readonly ProfileController _sut;

    public ProfileControllerTests()
    {
        _profileServiceMock = new Mock<IProfileService>();
        _migrationServiceMock = new Mock<ILegacyMigrationService>();
        _supabaseServiceMock = new Mock<ISupabaseService>();
        _loggerMock = new Mock<ILogger<ProfileController>>();
        _sut = new ProfileController(
            _profileServiceMock.Object,
            _migrationServiceMock.Object,
            _supabaseServiceMock.Object,
            _loggerMock.Object);
    }

    #region GetProfile Tests

    [Fact]
    public async Task GetProfile_WithValidUser_ReturnsProfileData()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestProfile(userId);
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId.ToString())).ReturnsAsync(user);

        // Act
        var result = await _sut.GetProfile();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ProfileResponse>().Subject;

        response.User.FirstName.Should().Be("Test User");
        response.IsMe.Should().Be(true);
    }

    [Fact]
    public async Task GetProfile_WithNoUserIdClaim_ReturnsUnauthorized()
    {
        // Arrange
        SetupAuthenticatedUser(null, "test@example.com");

        // Act
        var result = await _sut.GetProfile();

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User ID not found");
    }

    [Fact]
    public async Task GetProfile_WhenUserNotFound_ChecksMigrationAndReturnsProfile()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var migratedProfile = CreateTestProfile(userId);
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId.ToString())).ReturnsAsync((DbProfile?)null);
        _supabaseServiceMock.Setup(x => x.AuthUserExistsAsync(userId)).ReturnsAsync(true); // Auth user exists
        _migrationServiceMock.Setup(x => x.CheckAndMigrateIfNeededAsync(userId.ToString(), "test@example.com"))
            .ReturnsAsync(migratedProfile);

        // Act
        var result = await _sut.GetProfile();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ProfileResponse>().Subject;

        response.User.FirstName.Should().Be("Test User");
        response.IsMe.Should().Be(true);
    }

    [Fact]
    public async Task GetProfile_WhenUserNotFoundAndNoMigration_ReturnsNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId.ToString())).ReturnsAsync((DbProfile?)null);
        _supabaseServiceMock.Setup(x => x.AuthUserExistsAsync(userId)).ReturnsAsync(true); // Auth user exists
        _migrationServiceMock.Setup(x => x.CheckAndMigrateIfNeededAsync(userId.ToString(), "test@example.com"))
            .ReturnsAsync((DbProfile?)null);

        // Act
        var result = await _sut.GetProfile();

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User not found");
    }

    [Fact]
    public async Task GetProfile_WhenUserNotFoundAndAuthUserDeleted_ReturnsUnauthorized()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId.ToString())).ReturnsAsync((DbProfile?)null);
        _supabaseServiceMock.Setup(x => x.AuthUserExistsAsync(userId)).ReturnsAsync(false); // Auth user deleted

        // Act
        var result = await _sut.GetProfile();

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("Authentication expired");
    }

    [Fact]
    public async Task GetProfile_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.GetByIdAsync(It.IsAny<string>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.GetProfile();

        // Assert
        result.Result.Should().BeOfType<ObjectResult>()
            .Which.StatusCode.Should().Be(500);
    }

    #endregion

    #region GetProfileBySharingCode Tests

    [Fact]
    public async Task GetProfileBySharingCode_WithValidCodeAndSharingEnabled_ReturnsProfile()
    {
        // Arrange
        var sharingCode = "test-sharing-code";
        var user = CreateTestProfile(Guid.NewGuid());
        user.Profile.SharingEnabled = true;
        user.Profile.SharingToken = sharingCode;
        _profileServiceMock.Setup(x => x.GetBySharingTokenAsync(sharingCode)).ReturnsAsync(user);

        // Act
        var result = await _sut.GetProfileBySharingCode(sharingCode);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ProfileResponse>().Subject;

        response.IsMe.Should().Be(false); // Always false for sharing code
        response.User.SharingEnabled.Should().Be(true);
    }

    [Fact]
    public async Task GetProfileBySharingCode_WhenUserNotFound_ReturnsNotFound()
    {
        // Arrange
        var sharingCode = "invalid-code";
        _profileServiceMock.Setup(x => x.GetBySharingTokenAsync(sharingCode)).ReturnsAsync((DbProfile?)null);

        // Act
        var result = await _sut.GetProfileBySharingCode(sharingCode);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User not found");
    }

    [Fact]
    public async Task GetProfileBySharingCode_WhenSharingDisabled_ReturnsNotFound()
    {
        // Arrange
        var sharingCode = "test-sharing-code";
        var user = CreateTestProfile(Guid.NewGuid());
        user.Profile.SharingEnabled = false;
        user.Profile.SharingToken = sharingCode;
        _profileServiceMock.Setup(x => x.GetBySharingTokenAsync(sharingCode)).ReturnsAsync(user);

        // Act
        var result = await _sut.GetProfileBySharingCode(sharingCode);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User not found");
    }

    [Fact]
    public async Task GetProfileBySharingCode_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        var sharingCode = "test-code";
        _profileServiceMock.Setup(x => x.GetBySharingTokenAsync(It.IsAny<string>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.GetProfileBySharingCode(sharingCode);

        // Assert
        result.Result.Should().BeOfType<ObjectResult>()
            .Which.StatusCode.Should().Be(500);
    }

    #endregion

    #region UpdateProfile Tests

    [Fact]
    public async Task UpdateProfile_WithValidRequest_ReturnsUpdatedProfile()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new UpdateProfileRequest
        {
            FirstName = "Updated Name",
            GoalWeight = 75.5m,
            UseMetric = true
        };
        var updatedProfile = CreateTestProfile(userId);
        updatedProfile.Profile.FirstName = request.FirstName;
        updatedProfile.Profile.GoalWeight = request.GoalWeight;
        updatedProfile.Profile.UseMetric = request.UseMetric.Value;

        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _supabaseServiceMock.Setup(x => x.AuthUserExistsAsync(userId)).ReturnsAsync(true); // Auth user exists
        _profileServiceMock.Setup(x => x.UpdateOrCreateProfileAsync(userId.ToString(), "test@example.com", request))
            .ReturnsAsync(updatedProfile);

        // Act
        var result = await _sut.UpdateProfile(request);

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ProfileResponse>().Subject;

        response.User.FirstName.Should().Be("Updated Name");
        response.User.GoalWeight.Should().Be(75.5m);
        response.User.UseMetric.Should().Be(true);
        response.IsMe.Should().Be(true);
    }

    [Fact]
    public async Task UpdateProfile_WithNoUserIdClaim_ReturnsUnauthorized()
    {
        // Arrange
        SetupAuthenticatedUser(null, "test@example.com");
        var request = new UpdateProfileRequest { FirstName = "Test" };

        // Act
        var result = await _sut.UpdateProfile(request);

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User ID not found");
    }

    [Fact]
    public async Task UpdateProfile_WithNoEmailClaim_ReturnsUnauthorized()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString(), null);
        var request = new UpdateProfileRequest { FirstName = "Test" };

        // Act
        var result = await _sut.UpdateProfile(request);

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User email not found");
    }

    [Fact]
    public async Task UpdateProfile_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        var request = new UpdateProfileRequest { FirstName = "Test" };
        _supabaseServiceMock.Setup(x => x.AuthUserExistsAsync(userId)).ReturnsAsync(true); // Auth user exists
        _profileServiceMock.Setup(x => x.UpdateOrCreateProfileAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<UpdateProfileRequest>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.UpdateProfile(request);

        // Assert
        result.Result.Should().BeOfType<ObjectResult>()
            .Which.StatusCode.Should().Be(500);
    }

    #endregion

    #region GenerateNewToken Tests

    [Fact]
    public async Task GenerateNewToken_WithValidUser_ReturnsNewToken()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var updatedUser = CreateTestProfile(userId);
        updatedUser.Profile.SharingToken = "new-token-12345";
        updatedUser.Profile.SharingEnabled = true;

        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.GenerateNewSharingTokenAsync(userId.ToString())).ReturnsAsync(updatedUser);

        // Act
        var result = await _sut.GenerateNewToken();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<SharingTokenResponse>().Subject;

        response.SharingToken.Should().Be("new-token-12345");
        response.SharingEnabled.Should().Be(true);
    }

    [Fact]
    public async Task GenerateNewToken_WithNoUserIdClaim_ReturnsUnauthorized()
    {
        // Arrange
        SetupAuthenticatedUser(null, "test@example.com");

        // Act
        var result = await _sut.GenerateNewToken();

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User ID not found");
    }

    [Fact]
    public async Task GenerateNewToken_WhenUserNotFound_ReturnsNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.GenerateNewSharingTokenAsync(userId.ToString())).ReturnsAsync((DbProfile?)null);

        // Act
        var result = await _sut.GenerateNewToken();

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User not found");
    }

    [Fact]
    public async Task GenerateNewToken_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.GenerateNewSharingTokenAsync(It.IsAny<string>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.GenerateNewToken();

        // Assert
        result.Result.Should().BeOfType<ObjectResult>()
            .Which.StatusCode.Should().Be(500);
    }

    #endregion

    #region CompleteMigration Tests

    [Fact]
    public async Task CompleteMigration_WithValidUser_ReturnsSuccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.CompleteMigrationAsync(userId.ToString())).ReturnsAsync(true);

        // Act
        var result = await _sut.CompleteMigration();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<SuccessResponse>().Subject;

        response.Success.Should().Be(true);
    }

    [Fact]
    public async Task CompleteMigration_WithNoUserIdClaim_ReturnsUnauthorized()
    {
        // Arrange
        SetupAuthenticatedUser(null, "test@example.com");

        // Act
        var result = await _sut.CompleteMigration();

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User ID not found");
    }

    [Fact]
    public async Task CompleteMigration_WhenServiceReturnsFalse_ReturnsNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.CompleteMigrationAsync(userId.ToString())).ReturnsAsync(false);

        // Act
        var result = await _sut.CompleteMigration();

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User not found");
    }

    [Fact]
    public async Task CompleteMigration_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.CompleteMigrationAsync(It.IsAny<string>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.CompleteMigration();

        // Assert
        result.Result.Should().BeOfType<ObjectResult>()
            .Which.StatusCode.Should().Be(500);
    }

    #endregion

    #region DeleteAccount Tests

    [Fact]
    public async Task DeleteAccount_WithValidUser_ReturnsSuccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.DeleteAccountAsync(userId)).ReturnsAsync(true);

        // Act
        var result = await _sut.DeleteAccount();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<MessageResponse>().Subject;

        response.Message.Should().Be("Account deleted successfully");
    }

    [Fact]
    public async Task DeleteAccount_WithNoUserIdClaim_ReturnsUnauthorized()
    {
        // Arrange
        SetupAuthenticatedUser(null, "test@example.com");

        // Act
        var result = await _sut.DeleteAccount();

        // Assert
        result.Result.Should().BeOfType<UnauthorizedObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User ID not found");
    }

    [Fact]
    public async Task DeleteAccount_WithInvalidGuidFormat_ReturnsBadRequest()
    {
        // Arrange
        SetupAuthenticatedUser("invalid-guid", "test@example.com");

        // Act
        var result = await _sut.DeleteAccount();

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("Invalid user ID format");
    }

    [Fact]
    public async Task DeleteAccount_WhenServiceReturnsFalse_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.DeleteAccountAsync(userId)).ReturnsAsync(false);

        // Act
        var result = await _sut.DeleteAccount();

        // Assert
        result.Result.Should().BeOfType<ObjectResult>()
            .Which.StatusCode.Should().Be(500);
        var errorResult = result.Result as ObjectResult;
        errorResult!.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("Failed to delete account");
    }

    [Fact]
    public async Task DeleteAccount_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.DeleteAccountAsync(It.IsAny<Guid>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _sut.DeleteAccount();

        // Assert
        result.Result.Should().BeOfType<ObjectResult>()
            .Which.StatusCode.Should().Be(500);
    }

    #endregion

    #region Helper Methods


    private void SetupAuthenticatedUser(string? userId, string? email)
    {
        var claims = new List<Claim>();
        if (userId != null)
            claims.Add(new Claim(ClaimTypes.NameIdentifier, userId));
        if (email != null)
            claims.Add(new Claim(ClaimTypes.Email, email));

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
            Profile = new ProfileData
            {
                FirstName = "Test User",
                GoalStart = DateTime.UtcNow.AddDays(-30),
                GoalWeight = 70,
                PlannedPoundsPerWeek = 1,
                DayStartOffset = 0,
                UseMetric = false,
                ShowCalories = false,
                SharingToken = "test-token-12345",
                SharingEnabled = false,
                IsMigrated = false,
                IsNewlyMigrated = false
            }
        };
    }

    #endregion
}
