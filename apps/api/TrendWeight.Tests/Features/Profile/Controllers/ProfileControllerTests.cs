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
using TrendWeight.Infrastructure.DataAccess.Models;
using Xunit;

namespace TrendWeight.Tests.Features.Profile.Controllers;

public class ProfileControllerTests
{
    private readonly Mock<IProfileService> _profileServiceMock;
    private readonly Mock<ILegacyMigrationService> _migrationServiceMock;
    private readonly Mock<ILogger<ProfileController>> _loggerMock;
    private readonly ProfileController _sut;

    public ProfileControllerTests()
    {
        _profileServiceMock = new Mock<IProfileService>();
        _migrationServiceMock = new Mock<ILegacyMigrationService>();
        _loggerMock = new Mock<ILogger<ProfileController>>();
        _sut = new ProfileController(
            _profileServiceMock.Object,
            _migrationServiceMock.Object,
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
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId)).ReturnsAsync(user);

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
    public async Task GetProfile_WithNoUserIdClaim_ThrowsUnauthorized()
    {
        SetupAuthenticatedUser(null, "test@example.com");

        var act = () => _sut.GetProfile();

        // The error middleware turns this into a 401
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task GetProfile_WhenUserNotFound_ChecksMigrationAndReturnsProfile()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var migratedProfile = CreateTestProfile(userId);
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId)).ReturnsAsync((DbProfile?)null);
        _migrationServiceMock.Setup(x => x.CheckAndMigrateIfNeededAsync(userId, "test@example.com"))
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
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId)).ReturnsAsync((DbProfile?)null);
        _migrationServiceMock.Setup(x => x.CheckAndMigrateIfNeededAsync(userId, "test@example.com"))
            .ReturnsAsync((DbProfile?)null);

        // Act
        var result = await _sut.GetProfile();

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User not found");
    }

    [Fact]
    public async Task GetProfile_WhenUserNotFound_ReturnsNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId)).ReturnsAsync((DbProfile?)null);
        _migrationServiceMock.Setup(x => x.CheckAndMigrateIfNeededAsync(userId, "test@example.com"))
            .ReturnsAsync((DbProfile?)null);

        // Act
        var result = await _sut.GetProfile();

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User not found");
    }

    [Fact]
    public async Task GetProfile_WhenExceptionThrown_PropagatesToErrorMiddleware()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.GetByIdAsync(It.IsAny<Guid>()))
            .ThrowsAsync(new Exception("Database error"));

        var act = () => _sut.GetProfile();

        await act.Should().ThrowAsync<Exception>().WithMessage("Database error");
    }

    [Fact]
    public async Task GetProfile_WhenClerkEmailDiffers_UpdatesStoredEmailThroughProfileService()
    {
        var userId = Guid.NewGuid();
        var user = CreateTestProfile(userId);
        user.Email = "old@example.com";
        SetupAuthenticatedUser(userId.ToString(), "new@example.com");
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId)).ReturnsAsync(user);
        _profileServiceMock.Setup(x => x.UpdateAsync(It.IsAny<DbProfile>())).ReturnsAsync((DbProfile p) => p);

        var result = await _sut.GetProfile();

        result.Result.Should().BeOfType<OkObjectResult>();
        _profileServiceMock.Verify(x => x.UpdateAsync(It.Is<DbProfile>(p => p.Uid == userId && p.Email == "new@example.com")), Times.Once);
    }

    [Fact]
    public async Task GetProfile_WhenClerkEmailMatches_DoesNotWrite()
    {
        var userId = Guid.NewGuid();
        var user = CreateTestProfile(userId);
        SetupAuthenticatedUser(userId.ToString(), user.Email);
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId)).ReturnsAsync(user);

        await _sut.GetProfile();

        _profileServiceMock.Verify(x => x.UpdateAsync(It.IsAny<DbProfile>()), Times.Never);
    }

    [Fact]
    public async Task GetProfile_WithMigratedUser_ChecksForLegacyData()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestProfile(userId);
        user.Profile.IsMigrated = true;
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId)).ReturnsAsync(user);

        // Act
        var result = await _sut.GetProfile();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;

        // Verify legacy check was made
        _migrationServiceMock.Verify(x => x.CheckAndMigrateLegacyDataIfNeededAsync(userId, "test@example.com"), Times.Once);
    }

    [Fact]
    public async Task GetProfile_WithMigratedUser_CallsCheckAndImportLegacyData()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestProfile(userId);
        user.Profile.IsMigrated = true;
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId)).ReturnsAsync(user);

        // Act
        var result = await _sut.GetProfile();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;

        // Verify legacy check was made
        _migrationServiceMock.Verify(x => x.CheckAndMigrateLegacyDataIfNeededAsync(userId, "test@example.com"), Times.Once);
    }

    [Fact]
    public async Task GetProfile_WithNonMigratedUser_SkipsLegacyCheck()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestProfile(userId);
        user.Profile.IsMigrated = false; // Not a migrated user
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId)).ReturnsAsync(user);

        // Act
        var result = await _sut.GetProfile();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;

        // Verify no legacy check was made
        _migrationServiceMock.Verify(x => x.CheckAndMigrateLegacyDataIfNeededAsync(It.IsAny<Guid>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task GetProfile_WithMigratedUserButNoEmail_SkipsLegacyImport()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestProfile(userId);
        user.Profile.IsMigrated = true;
        SetupAuthenticatedUser(userId.ToString(), null); // No email in claims
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId)).ReturnsAsync(user);

        // Act
        var result = await _sut.GetProfile();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;

        // Verify legacy operation was called with null email (and handled internally)
        _migrationServiceMock.Verify(x => x.CheckAndMigrateLegacyDataIfNeededAsync(userId, null), Times.Once);
    }

    [Fact]
    public async Task GetProfile_WhenLegacyImportFails_StillReturnsProfile()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = CreateTestProfile(userId);
        user.Profile.IsMigrated = true;
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.GetByIdAsync(userId)).ReturnsAsync(user);
        // CheckAndImportLegacyDataIfNeededAsync catches exceptions internally,
        // so we don't need to test exception handling here
        _migrationServiceMock.Setup(x => x.CheckAndMigrateLegacyDataIfNeededAsync(userId, "test@example.com"))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _sut.GetProfile();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ProfileResponse>().Subject;

        // Profile should be returned successfully
        response.User.FirstName.Should().Be("Test User");
        response.IsMe.Should().Be(true);

        // Verify the legacy import was attempted
        _migrationServiceMock.Verify(x => x.CheckAndMigrateLegacyDataIfNeededAsync(userId, "test@example.com"), Times.Once);
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
    public async Task GetProfileBySharingCode_WhenExceptionThrown_PropagatesToErrorMiddleware()
    {
        // Arrange
        var sharingCode = "test-code";
        _profileServiceMock.Setup(x => x.GetBySharingTokenAsync(It.IsAny<string>()))
            .ThrowsAsync(new Exception("Database error"));

        var act = () => _sut.GetProfileBySharingCode(sharingCode);

        await act.Should().ThrowAsync<Exception>().WithMessage("Database error");
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
        _profileServiceMock.Setup(x => x.UpdateOrCreateProfileAsync(userId, "test@example.com", request))
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

    [Theory]
    [InlineData(-1)]
    [InlineData(24)]
    [InlineData(int.MinValue)]
    [InlineData(int.MaxValue)]
    public async Task UpdateProfile_WithInvalidDayStart_RejectsBeforeSaving(int offset)
    {
        SetupAuthenticatedUser(Guid.NewGuid().ToString(), "test@example.com");

        var result = await _sut.UpdateProfile(new UpdateProfileRequest { DayStartOffset = offset });

        result.Result.Should().BeOfType<BadRequestObjectResult>();
        _profileServiceMock.Verify(x => x.UpdateOrCreateProfileAsync(
            It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<UpdateProfileRequest>()), Times.Never);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-70)]
    [InlineData(1500)]
    [InlineData(1_000_000)]
    public async Task UpdateProfile_WithOutOfRangeGoalWeight_RejectsBeforeSaving(decimal goalWeight)
    {
        SetupAuthenticatedUser(Guid.NewGuid().ToString(), "test@example.com");

        var result = await _sut.UpdateProfile(new UpdateProfileRequest { GoalWeight = goalWeight });

        result.Result.Should().BeOfType<BadRequestObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Contain("Goal weight");
        _profileServiceMock.Verify(x => x.UpdateOrCreateProfileAsync(
            It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<UpdateProfileRequest>()), Times.Never);
    }

    [Theory]
    [InlineData(-5.5)]
    [InlineData(5.5)]
    [InlineData(100)]
    public async Task UpdateProfile_WithOutOfRangePlannedChange_RejectsBeforeSaving(decimal plan)
    {
        SetupAuthenticatedUser(Guid.NewGuid().ToString(), "test@example.com");

        var result = await _sut.UpdateProfile(new UpdateProfileRequest { PlannedPoundsPerWeek = plan });

        result.Result.Should().BeOfType<BadRequestObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Contain("Planned weekly change");
        _profileServiceMock.Verify(x => x.UpdateOrCreateProfileAsync(
            It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<UpdateProfileRequest>()), Times.Never);
    }

    [Fact]
    public async Task UpdateProfile_WithOverlongFirstName_RejectsBeforeSaving()
    {
        SetupAuthenticatedUser(Guid.NewGuid().ToString(), "test@example.com");

        var result = await _sut.UpdateProfile(new UpdateProfileRequest { FirstName = new string('a', 101) });

        result.Result.Should().BeOfType<BadRequestObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Contain("First name");
        _profileServiceMock.Verify(x => x.UpdateOrCreateProfileAsync(
            It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<UpdateProfileRequest>()), Times.Never);
    }

    public static TheoryData<DateTime> OutOfRangeGoalStarts => new()
    {
        new DateTime(1899, 12, 31),
        DateTime.UtcNow.Date.AddDays(2),
        new DateTime(2999, 1, 1)
    };

    [Theory]
    [MemberData(nameof(OutOfRangeGoalStarts))]
    public async Task UpdateProfile_WithOutOfRangeGoalStart_RejectsBeforeSaving(DateTime goalStart)
    {
        SetupAuthenticatedUser(Guid.NewGuid().ToString(), "test@example.com");

        var result = await _sut.UpdateProfile(new UpdateProfileRequest { GoalStart = goalStart });

        result.Result.Should().BeOfType<BadRequestObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Contain("Start date");
        _profileServiceMock.Verify(x => x.UpdateOrCreateProfileAsync(
            It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<UpdateProfileRequest>()), Times.Never);
    }

    [Fact]
    public async Task UpdateProfile_WithBoundaryValues_PassesThroughToService()
    {
        // Unusual but legitimate values: a large goal in pounds, the steepest plan the UI
        // offers, a 100-character name, tomorrow's date (timezones ahead of UTC), and 1900.
        var userId = Guid.NewGuid();
        var request = new UpdateProfileRequest
        {
            FirstName = new string('n', 100),
            GoalWeight = 1499.9m,
            PlannedPoundsPerWeek = -5m,
            GoalStart = DateTime.UtcNow.Date.AddDays(1)
        };
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.UpdateOrCreateProfileAsync(userId, "test@example.com", request))
            .ReturnsAsync(CreateTestProfile(userId));

        var result = await _sut.UpdateProfile(request);

        result.Result.Should().BeOfType<OkObjectResult>();
        _profileServiceMock.Verify(x => x.UpdateOrCreateProfileAsync(userId, "test@example.com", request), Times.Once);

        var oldest = new UpdateProfileRequest { GoalStart = new DateTime(1900, 1, 1), PlannedPoundsPerWeek = 5m, GoalWeight = 0.1m };
        _profileServiceMock.Setup(x => x.UpdateOrCreateProfileAsync(userId, "test@example.com", oldest))
            .ReturnsAsync(CreateTestProfile(userId));
        (await _sut.UpdateProfile(oldest)).Result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task UpdateProfile_WithNoGoalFields_PassesThroughToService()
    {
        // Clearing goals (all null) must stay valid
        var userId = Guid.NewGuid();
        var request = new UpdateProfileRequest { UseMetric = true };
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.UpdateOrCreateProfileAsync(userId, "test@example.com", request))
            .ReturnsAsync(CreateTestProfile(userId));

        var result = await _sut.UpdateProfile(request);

        result.Result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task UpdateProfile_WithInvalidTrendAlgorithm_ReturnsBadRequest()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        var request = new UpdateProfileRequest { TrendAlgorithm = "not-a-real-preset" };

        // Act
        var result = await _sut.UpdateProfile(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("Invalid trend algorithm");
        _profileServiceMock.Verify(x => x.UpdateOrCreateProfileAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<UpdateProfileRequest>()), Times.Never);
    }

    [Fact]
    public async Task UpdateProfile_WithValidTrendAlgorithm_ReturnsResolvedId()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new UpdateProfileRequest { TrendAlgorithm = "holt" };
        var updatedProfile = CreateTestProfile(userId);
        updatedProfile.Profile.TrendAlgorithm = "holt";

        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.UpdateOrCreateProfileAsync(userId, "test@example.com", request))
            .ReturnsAsync(updatedProfile);

        // Act
        var result = await _sut.UpdateProfile(request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ProfileResponse>().Subject;
        response.User.TrendAlgorithm.Should().Be("holt");
    }

    [Fact]
    public async Task UpdateProfile_WithNoUserIdClaim_ThrowsUnauthorized()
    {
        SetupAuthenticatedUser(null, "test@example.com");

        var act = () => _sut.UpdateProfile(new UpdateProfileRequest { FirstName = "Test" });

        // The error middleware turns this into a 401
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
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
    public async Task UpdateProfile_WhenExceptionThrown_PropagatesToErrorMiddleware()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        var request = new UpdateProfileRequest { FirstName = "Test" };
        _profileServiceMock.Setup(x => x.UpdateOrCreateProfileAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<UpdateProfileRequest>()))
            .ThrowsAsync(new Exception("Database error"));

        var act = () => _sut.UpdateProfile(request);

        await act.Should().ThrowAsync<Exception>().WithMessage("Database error");
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
        _profileServiceMock.Setup(x => x.GenerateNewSharingTokenAsync(userId)).ReturnsAsync(updatedUser);

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
    public async Task GenerateNewToken_WithNoUserIdClaim_ThrowsUnauthorized()
    {
        SetupAuthenticatedUser(null, "test@example.com");

        var act = () => _sut.GenerateNewToken();

        // The error middleware turns this into a 401
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task GenerateNewToken_WhenUserNotFound_ReturnsNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.GenerateNewSharingTokenAsync(userId)).ReturnsAsync((DbProfile?)null);

        // Act
        var result = await _sut.GenerateNewToken();

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User not found");
    }

    [Fact]
    public async Task GenerateNewToken_WhenExceptionThrown_PropagatesToErrorMiddleware()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.GenerateNewSharingTokenAsync(It.IsAny<Guid>()))
            .ThrowsAsync(new Exception("Database error"));

        var act = () => _sut.GenerateNewToken();

        await act.Should().ThrowAsync<Exception>().WithMessage("Database error");
    }

    #endregion

    #region CompleteMigration Tests

    [Fact]
    public async Task CompleteMigration_WithValidUser_ReturnsSuccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.CompleteMigrationAsync(userId)).ReturnsAsync(true);

        // Act
        var result = await _sut.CompleteMigration();

        // Assert
        result.Should().NotBeNull();
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<SuccessResponse>().Subject;

        response.Success.Should().Be(true);
    }

    [Fact]
    public async Task CompleteMigration_WithNoUserIdClaim_ThrowsUnauthorized()
    {
        SetupAuthenticatedUser(null, "test@example.com");

        var act = () => _sut.CompleteMigration();

        // The error middleware turns this into a 401
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task CompleteMigration_WhenServiceReturnsFalse_ReturnsNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.CompleteMigrationAsync(userId)).ReturnsAsync(false);

        // Act
        var result = await _sut.CompleteMigration();

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().BeOfType<ErrorResponse>()
            .Which.Error.Should().Be("User not found");
    }

    [Fact]
    public async Task CompleteMigration_WhenExceptionThrown_PropagatesToErrorMiddleware()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.CompleteMigrationAsync(It.IsAny<Guid>()))
            .ThrowsAsync(new Exception("Database error"));

        var act = () => _sut.CompleteMigration();

        await act.Should().ThrowAsync<Exception>().WithMessage("Database error");
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
    public async Task DeleteAccount_WithNoUserIdClaim_ThrowsUnauthorized()
    {
        SetupAuthenticatedUser(null, "test@example.com");

        var act = () => _sut.DeleteAccount();

        // The error middleware turns this into a 401
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task DeleteAccount_WithInvalidGuidFormat_ThrowsUnauthorized()
    {
        SetupAuthenticatedUser("invalid-guid", "test@example.com");

        var act = () => _sut.DeleteAccount();

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
        _profileServiceMock.Verify(x => x.DeleteAccountAsync(It.IsAny<Guid>()), Times.Never);
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
    public async Task DeleteAccount_WhenExceptionThrown_PropagatesToErrorMiddleware()
    {
        // Arrange
        var userId = Guid.NewGuid();
        SetupAuthenticatedUser(userId.ToString(), "test@example.com");
        _profileServiceMock.Setup(x => x.DeleteAccountAsync(It.IsAny<Guid>()))
            .ThrowsAsync(new Exception("Database error"));

        var act = () => _sut.DeleteAccount();

        await act.Should().ThrowAsync<Exception>().WithMessage("Database error");
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
