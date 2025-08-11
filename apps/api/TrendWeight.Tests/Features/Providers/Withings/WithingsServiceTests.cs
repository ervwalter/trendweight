using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using System.Net;
using System.Text;
using System.Text.Json;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Features.Providers.Exceptions;
using TrendWeight.Features.Providers.Withings;
using TrendWeight.Features.Providers.Withings.Models;
using TrendWeight.Features.ProviderLinks.Services;
using TrendWeight.Infrastructure.Configuration;
using TrendWeight.Infrastructure.DataAccess.Models;
using TrendWeight.Tests.Fixtures;
using Xunit;

namespace TrendWeight.Tests.Features.Providers.Withings;

public class WithingsServiceTests : TestBase
{
    private readonly Mock<HttpMessageHandler> _httpMessageHandlerMock;
    private readonly HttpClient _httpClient;
    private readonly Mock<IOptions<AppOptions>> _appOptionsMock;
    private readonly Mock<IProviderLinkService> _providerLinkServiceMock;
    private readonly Mock<IProfileService> _profileServiceMock;
    private readonly Mock<ILogger<WithingsService>> _loggerMock;
    private readonly WithingsService _sut;
    private readonly WithingsConfig _withingsConfig;

    public WithingsServiceTests()
    {
        _httpMessageHandlerMock = new Mock<HttpMessageHandler>();
        _httpClient = new HttpClient(_httpMessageHandlerMock.Object)
        {
            BaseAddress = new Uri("https://api.withings.com")
        };

        _withingsConfig = new WithingsConfig
        {
            ClientId = "test-client-id",
            ClientSecret = "test-client-secret"
        };

        var appOptions = new AppOptions
        {
            Withings = _withingsConfig
        };

        _appOptionsMock = new Mock<IOptions<AppOptions>>();
        _appOptionsMock.Setup(x => x.Value).Returns(appOptions);

        _providerLinkServiceMock = new Mock<IProviderLinkService>();
        _profileServiceMock = new Mock<IProfileService>();
        _loggerMock = new Mock<ILogger<WithingsService>>();

        _sut = new WithingsService(
            _httpClient,
            _appOptionsMock.Object,
            _providerLinkServiceMock.Object,
            _profileServiceMock.Object,
            null, // ISyncProgressReporter
            _loggerMock.Object);
    }

    #region Pagination Tests - Critical for Withings

    [Fact]
    public async Task GetMeasurementsAsync_WithMultiplePages_CorrectlyCombinesAllPages()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var token = CreateValidToken();
        var providerLink = new DbProviderLink
        {
            Provider = "withings",
            Token = token
        };

        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, "withings"))
            .ReturnsAsync(providerLink);

        // Setup first page response with more=1 and offset
        var firstPageResponse = new WithingsResponse<WithingsGetMeasuresResponse>
        {
            Status = 0,
            Body = new WithingsGetMeasuresResponse
            {
                UpdateTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                More = 1, // Indicates there are more pages
                Offset = 12345, // Offset for next page
                Timezone = "America/New_York",
                MeasureGroups = new List<WithingsMeasureGroup>
                {
                    CreateMeasureGroup(1, DateTimeOffset.UtcNow.AddDays(-1), 75.0m),
                    CreateMeasureGroup(2, DateTimeOffset.UtcNow.AddDays(-2), 75.5m)
                }
            }
        };

        // Setup second page response with more=1 and new offset
        var secondPageResponse = new WithingsResponse<WithingsGetMeasuresResponse>
        {
            Status = 0,
            Body = new WithingsGetMeasuresResponse
            {
                UpdateTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                More = 1, // Still more pages
                Offset = 67890,
                Timezone = "America/New_York",
                MeasureGroups = new List<WithingsMeasureGroup>
                {
                    CreateMeasureGroup(3, DateTimeOffset.UtcNow.AddDays(-3), 76.0m),
                    CreateMeasureGroup(4, DateTimeOffset.UtcNow.AddDays(-4), 76.5m)
                }
            }
        };

        // Setup third (final) page response with more=0
        var thirdPageResponse = new WithingsResponse<WithingsGetMeasuresResponse>
        {
            Status = 0,
            Body = new WithingsGetMeasuresResponse
            {
                UpdateTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                More = 0, // No more pages
                Offset = 0,
                Timezone = "America/New_York",
                MeasureGroups = new List<WithingsMeasureGroup>
                {
                    CreateMeasureGroup(5, DateTimeOffset.UtcNow.AddDays(-5), 77.0m)
                }
            }
        };

        // Setup HTTP responses based on offset parameter
        SetupPaginatedHttpResponses(firstPageResponse, secondPageResponse, thirdPageResponse);

        // Act
        var result = await _sut.GetMeasurementsAsync(userId, true);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(5); // All measurements from all pages
        result![0].Weight.Should().Be(75.0m);
        result[1].Weight.Should().Be(75.5m);
        result[2].Weight.Should().Be(76.0m);
        result[3].Weight.Should().Be(76.5m);
        result[4].Weight.Should().Be(77.0m);

        // Verify that exactly 3 API calls were made
        _httpMessageHandlerMock.Protected().Verify(
            "SendAsync",
            Times.Exactly(3),
            ItExpr.Is<HttpRequestMessage>(req =>
                req.RequestUri!.ToString().Contains("wbsapi.withings.net/measure")),
            ItExpr.IsAny<CancellationToken>());

        // Verify offset was passed correctly
        _httpMessageHandlerMock.Protected().Verify(
            "SendAsync",
            Times.Once(),
            ItExpr.Is<HttpRequestMessage>(req =>
                req.RequestUri!.ToString().Contains("offset=12345")),
            ItExpr.IsAny<CancellationToken>());

        _httpMessageHandlerMock.Protected().Verify(
            "SendAsync",
            Times.Once(),
            ItExpr.Is<HttpRequestMessage>(req =>
                req.RequestUri!.ToString().Contains("offset=67890")),
            ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task GetMeasurementsAsync_WithEmptyMiddlePage_ContinuesPagination()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var token = CreateValidToken();
        var providerLink = new DbProviderLink
        {
            Provider = "withings",
            Token = token
        };

        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, "withings"))
            .ReturnsAsync(providerLink);

        // First page has data
        var firstPageResponse = new WithingsResponse<WithingsGetMeasuresResponse>
        {
            Status = 0,
            Body = new WithingsGetMeasuresResponse
            {
                UpdateTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                More = 1,
                Offset = 12345,
                Timezone = "UTC",
                MeasureGroups = new List<WithingsMeasureGroup>
                {
                    CreateMeasureGroup(1, DateTimeOffset.UtcNow.AddDays(-1), 75.0m)
                }
            }
        };

        // Second page is empty but indicates more pages
        var emptyPageResponse = new WithingsResponse<WithingsGetMeasuresResponse>
        {
            Status = 0,
            Body = new WithingsGetMeasuresResponse
            {
                UpdateTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                More = 1,
                Offset = 67890,
                Timezone = "UTC",
                MeasureGroups = new List<WithingsMeasureGroup>()
            }
        };

        // Third page has data and is final
        var thirdPageResponse = new WithingsResponse<WithingsGetMeasuresResponse>
        {
            Status = 0,
            Body = new WithingsGetMeasuresResponse
            {
                UpdateTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                More = 0,
                Offset = 0,
                Timezone = "UTC",
                MeasureGroups = new List<WithingsMeasureGroup>
                {
                    CreateMeasureGroup(2, DateTimeOffset.UtcNow.AddDays(-5), 77.0m)
                }
            }
        };

        SetupPaginatedHttpResponses(firstPageResponse, emptyPageResponse, thirdPageResponse);

        // Act
        var result = await _sut.GetMeasurementsAsync(userId, true);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(2); // Only non-empty measurements
        result![0].Weight.Should().Be(75.0m);
        result[1].Weight.Should().Be(77.0m);

        // Verify all 3 pages were fetched despite empty middle page
        _httpMessageHandlerMock.Protected().Verify(
            "SendAsync",
            Times.Exactly(3),
            ItExpr.Is<HttpRequestMessage>(req =>
                req.RequestUri!.ToString().Contains("wbsapi.withings.net/measure")),
            ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task GetMeasurementsAsync_WithLargePaginatedDataset_HandlesCorrectly()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var token = CreateValidToken();
        var providerLink = new DbProviderLink
        {
            Provider = "withings",
            Token = token
        };

        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, "withings"))
            .ReturnsAsync(providerLink);

        // Simulate 10 pages of data
        var pageCount = 0;
        _httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req =>
                    req.RequestUri!.ToString().Contains("wbsapi.withings.net/measure")),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() =>
            {
                pageCount++;
                var isLastPage = pageCount >= 10;
                var measurements = new List<WithingsMeasureGroup>();

                // Each page has 5 measurements
                for (int i = 0; i < 5; i++)
                {
                    var dayOffset = -((pageCount - 1) * 5 + i + 1);
                    measurements.Add(CreateMeasureGroup(
                        pageCount * 100 + i,
                        DateTimeOffset.UtcNow.AddDays(dayOffset),
                        70.0m + pageCount + (i * 0.1m)));
                }

                var response = new WithingsResponse<WithingsGetMeasuresResponse>
                {
                    Status = 0,
                    Body = new WithingsGetMeasuresResponse
                    {
                        UpdateTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                        More = isLastPage ? 0 : 1,
                        Offset = isLastPage ? 0 : pageCount * 1000,
                        Timezone = "UTC",
                        MeasureGroups = measurements
                    }
                };

                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(JsonSerializer.Serialize(response), Encoding.UTF8, "application/json")
                };
            });

        // Act
        var result = await _sut.GetMeasurementsAsync(userId, true);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(50); // 10 pages × 5 measurements each

        // Verify exactly 10 API calls were made
        _httpMessageHandlerMock.Protected().Verify(
            "SendAsync",
            Times.Exactly(10),
            ItExpr.Is<HttpRequestMessage>(req =>
                req.RequestUri!.ToString().Contains("wbsapi.withings.net/measure")),
            ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task GetMeasurementsAsync_VerifiesFollowsAllPagesUntilMoreIsZero()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var token = CreateValidToken();
        var providerLink = new DbProviderLink
        {
            Provider = "withings",
            Token = token
        };

        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, "withings"))
            .ReturnsAsync(providerLink);

        // Track all offset values requested to ensure proper pagination
        var requestedOffsets = new List<int?>();
        var pageCount = 0;

        _httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req =>
                    req.RequestUri!.ToString().Contains("wbsapi.withings.net/measure")),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync((HttpRequestMessage request, CancellationToken ct) =>
            {
                pageCount++;

                // Extract offset from query string
                var uri = request.RequestUri!;
                var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
                var offsetStr = query["offset"];
                var offset = string.IsNullOrEmpty(offsetStr) ? (int?)null : int.Parse(offsetStr);
                requestedOffsets.Add(offset);

                // Create response based on page number
                WithingsResponse<WithingsGetMeasuresResponse> response;

                if (pageCount == 1)
                {
                    // First page - no offset should be provided
                    response = new WithingsResponse<WithingsGetMeasuresResponse>
                    {
                        Status = 0,
                        Body = new WithingsGetMeasuresResponse
                        {
                            UpdateTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                            More = 1,
                            Offset = 12345, // Next offset
                            Timezone = "UTC",
                            MeasureGroups = new List<WithingsMeasureGroup>
                            {
                                CreateMeasureGroup(1, DateTimeOffset.UtcNow.AddDays(-1), 75.0m)
                            }
                        }
                    };
                }
                else if (pageCount == 2)
                {
                    // Second page - should use offset 12345
                    response = new WithingsResponse<WithingsGetMeasuresResponse>
                    {
                        Status = 0,
                        Body = new WithingsGetMeasuresResponse
                        {
                            UpdateTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                            More = 1,
                            Offset = 67890, // Next offset
                            Timezone = "UTC",
                            MeasureGroups = new List<WithingsMeasureGroup>
                            {
                                CreateMeasureGroup(2, DateTimeOffset.UtcNow.AddDays(-2), 76.0m)
                            }
                        }
                    };
                }
                else
                {
                    // Third page - should use offset 67890 and indicate no more pages
                    response = new WithingsResponse<WithingsGetMeasuresResponse>
                    {
                        Status = 0,
                        Body = new WithingsGetMeasuresResponse
                        {
                            UpdateTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                            More = 0, // No more pages
                            Offset = 0,
                            Timezone = "UTC",
                            MeasureGroups = new List<WithingsMeasureGroup>
                            {
                                CreateMeasureGroup(3, DateTimeOffset.UtcNow.AddDays(-3), 77.0m)
                            }
                        }
                    };
                }

                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(JsonSerializer.Serialize(response), Encoding.UTF8, "application/json")
                };
            });

        // Act
        var result = await _sut.GetMeasurementsAsync(userId, true);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(3);

        // Verify correct sequence of offset values
        requestedOffsets.Should().HaveCount(3);
        requestedOffsets[0].Should().BeNull(); // First request has no offset
        requestedOffsets[1].Should().Be(12345); // Second request uses first page's offset
        requestedOffsets[2].Should().Be(67890); // Third request uses second page's offset

        // Verify exactly 3 API calls were made (stopped when more=0)
        pageCount.Should().Be(3);
    }

    [Fact]
    public async Task GetMeasurementsAsync_WithManyPages_HandlesLargeDatasets()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var token = CreateValidToken();
        var providerLink = new DbProviderLink
        {
            Provider = "withings",
            Token = token
        };

        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, "withings"))
            .ReturnsAsync(providerLink);

        var pageCount = 0;
        const int maxPages = 20; // Simulate 20 pages of data

        _httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req =>
                    req.RequestUri!.ToString().Contains("wbsapi.withings.net/measure")),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() =>
            {
                pageCount++;

                // Return more=0 on the last page
                var isLastPage = pageCount >= maxPages;
                var response = new WithingsResponse<WithingsGetMeasuresResponse>
                {
                    Status = 0,
                    Body = new WithingsGetMeasuresResponse
                    {
                        UpdateTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                        More = isLastPage ? 0 : 1,
                        Offset = isLastPage ? 0 : pageCount * 1000,
                        Timezone = "UTC",
                        MeasureGroups = new List<WithingsMeasureGroup>
                        {
                            CreateMeasureGroup(pageCount, DateTimeOffset.UtcNow.AddDays(-pageCount), 70.0m + pageCount)
                        }
                    }
                };

                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(JsonSerializer.Serialize(response), Encoding.UTF8, "application/json")
                };
            });

        // Act
        var result = await _sut.GetMeasurementsAsync(userId, true);

        // Assert
        result.Should().NotBeNull();
        result!.Count.Should().Be(maxPages);
        pageCount.Should().Be(maxPages);
    }

    [Fact]
    public async Task GetMeasurementsAsync_WhenPageFailsPartway_ThrowsException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var token = CreateValidToken();
        var providerLink = new DbProviderLink
        {
            Provider = "withings",
            Token = token
        };

        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, "withings"))
            .ReturnsAsync(providerLink);

        var callCount = 0;

        _httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req =>
                    req.RequestUri!.ToString().Contains("wbsapi.withings.net/measure")),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() =>
            {
                callCount++;

                if (callCount == 1)
                {
                    // First page succeeds
                    var response = new WithingsResponse<WithingsGetMeasuresResponse>
                    {
                        Status = 0,
                        Body = new WithingsGetMeasuresResponse
                        {
                            UpdateTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                            More = 1,
                            Offset = 12345,
                            Timezone = "UTC",
                            MeasureGroups = new List<WithingsMeasureGroup>
                            {
                                CreateMeasureGroup(1, DateTimeOffset.UtcNow.AddDays(-1), 75.0m)
                            }
                        }
                    };

                    return new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent(JsonSerializer.Serialize(response), Encoding.UTF8, "application/json")
                    };
                }

                // Second page fails with auth error
                var errorResponse = new WithingsResponse<WithingsGetMeasuresResponse>
                {
                    Status = 401,
                    Error = "Invalid access token"
                };

                return new HttpResponseMessage(HttpStatusCode.OK) // Withings returns 200 with error in body
                {
                    Content = new StringContent(JsonSerializer.Serialize(errorResponse), Encoding.UTF8, "application/json")
                };
            });

        // Act & Assert
        await _sut.Invoking(x => x.GetMeasurementsAsync(userId, true))
            .Should().ThrowAsync<ProviderAuthException>();

        // Verify we made exactly 2 calls
        callCount.Should().Be(2);
    }

    [Fact]
    public async Task GetMeasurementsAsync_With503InvalidRefreshToken_ThrowsProviderAuthException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var token = CreateValidToken();
        var providerLink = new DbProviderLink
        {
            Provider = "withings",
            Token = token
        };

        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, "withings"))
            .ReturnsAsync(providerLink);

        // Setup response with 503 status and "invalid refresh_token" message
        var errorResponse = new WithingsResponse<WithingsGetMeasuresResponse>
        {
            Status = 503,
            Error = "Invalid Params: invalid refresh_token"
        };

        _httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK) // Withings returns 200 with error in body
            {
                Content = new StringContent(JsonSerializer.Serialize(errorResponse), Encoding.UTF8, "application/json")
            });

        // Act & Assert
        await _sut.Invoking(x => x.GetMeasurementsAsync(userId, true))
            .Should().ThrowAsync<ProviderAuthException>()
            .WithMessage("*invalid refresh_token*");
    }

    [Fact]
    public async Task GetMeasurementsAsync_WithDateRange_PassesCorrectStartTimestamp()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var token = CreateValidToken();
        var providerLink = new DbProviderLink
        {
            Provider = "withings",
            Token = token
        };

        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, "withings"))
            .ReturnsAsync(providerLink);

        var startDate = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var expectedStartTimestamp = ((DateTimeOffset)startDate).ToUnixTimeSeconds();

        long? capturedStartTime = null;

        _httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req =>
                    req.RequestUri!.ToString().Contains("wbsapi.withings.net/measure")),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync((HttpRequestMessage request, CancellationToken ct) =>
            {
                // Capture the startdate from the request
                var uri = request.RequestUri!;
                var query = System.Web.HttpUtility.ParseQueryString(uri.Query);

                if (query["startdate"] != null)
                    capturedStartTime = long.Parse(query["startdate"]!);

                var response = new WithingsResponse<WithingsGetMeasuresResponse>
                {
                    Status = 0,
                    Body = new WithingsGetMeasuresResponse
                    {
                        UpdateTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                        More = 0,
                        Offset = 0,
                        Timezone = "UTC",
                        MeasureGroups = new List<WithingsMeasureGroup>
                        {
                            CreateMeasureGroup(1, DateTimeOffset.UtcNow.AddDays(-1), 75.0m)
                        }
                    }
                };

                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(JsonSerializer.Serialize(response), Encoding.UTF8, "application/json")
                };
            });

        // Act
        await _sut.GetMeasurementsAsync(userId, true, startDate);

        // Assert
        capturedStartTime.Should().NotBeNull();
        capturedStartTime.Should().Be(expectedStartTimestamp);
    }

    #endregion

    #region Other Important Tests

    [Fact]
    public void ProviderName_ReturnsWithings()
    {
        // Assert
        _sut.ProviderName.Should().Be("withings");
    }

    [Fact]
    public void GetAuthorizationUrl_ReturnsCorrectUrl()
    {
        // Arrange
        var state = "test-state";
        var callbackUrl = "https://example.com/callback";

        // Act
        var result = _sut.GetAuthorizationUrl(state, callbackUrl);

        // Assert
        result.Should().StartWith("https://account.withings.com/oauth2_user/authorize2");
        result.Should().Contain($"client_id={_withingsConfig.ClientId}");
        result.Should().Contain("response_type=code");
        result.Should().Contain("scope=user.metrics");
        result.Should().Contain($"state={state}");
        result.Should().Contain("redirect_uri=");
        // Verify the callback URL is encoded (case-insensitive check)
        result.ToLower().Should().Contain(Uri.EscapeDataString(callbackUrl).ToLower());
    }

    [Fact]
    public async Task ExchangeAuthorizationCodeAsync_WithValidCode_ReturnsTrue()
    {
        // Arrange
        var code = "test-code";
        var callbackUrl = "https://example.com/callback";
        var userId = Guid.NewGuid();

        var tokenResponse = new WithingsResponse<WithingsTokenResponse>
        {
            Status = 0,
            Body = new WithingsTokenResponse
            {
                AccessToken = "test-access-token",
                RefreshToken = "test-refresh-token",
                TokenType = "Bearer",
                ExpiresIn = 10800,
                Scope = "user.metrics"
            }
        };

        SetupHttpResponse("https://wbsapi.withings.net/v2/oauth2", tokenResponse);

        // Act
        var result = await _sut.ExchangeAuthorizationCodeAsync(code, callbackUrl, userId);

        // Assert
        result.Should().BeTrue();

        _providerLinkServiceMock.Verify(x => x.StoreProviderLinkAsync(
            userId,
            "withings",
            It.Is<Dictionary<string, object>>(d =>
                d["access_token"].ToString() == "test-access-token" &&
                d["refresh_token"].ToString() == "test-refresh-token" &&
                d["token_type"].ToString() == "Bearer" &&
                d["scope"].ToString() == "user.metrics" &&
                d.ContainsKey("received_at") &&
                d["expires_in"].ToString() == "10800"),
            null),
            Times.Once);
    }

    [Fact]
    public async Task GetMeasurementsAsync_HandlesTimezoneProperly()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var token = CreateValidToken();
        var providerLink = new DbProviderLink
        {
            Provider = "withings",
            Token = token
        };

        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, "withings"))
            .ReturnsAsync(providerLink);

        // Create a measurement at a specific UTC time
        var utcTimestamp = new DateTimeOffset(2024, 1, 1, 12, 0, 0, TimeSpan.Zero).ToUnixTimeSeconds();

        var measurementResponse = new WithingsResponse<WithingsGetMeasuresResponse>
        {
            Status = 0,
            Body = new WithingsGetMeasuresResponse
            {
                UpdateTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                More = 0,
                Offset = 0,
                Timezone = "America/New_York", // UTC-5 in January
                MeasureGroups = new List<WithingsMeasureGroup>
                {
                    new WithingsMeasureGroup
                    {
                        GroupId = 123456,
                        Attribute = 0,
                        Date = utcTimestamp,
                        Created = utcTimestamp,
                        Category = 1,
                        Measures = new List<WithingsMeasure>
                        {
                            new WithingsMeasure
                            {
                                Value = 75000,
                                Type = 1,
                                Unit = -3
                            }
                        }
                    }
                }
            }
        };

        SetupHttpResponse("https://wbsapi.withings.net/measure", measurementResponse);

        // Act
        var result = await _sut.GetMeasurementsAsync(userId, true);

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(1);

        // The measurement should be converted to New York time
        // 2024-01-01 12:00 UTC = 2024-01-01 07:00 EST
        result![0].Date.Should().Be("2024-01-01");
        result[0].Time.Should().Be("07:00:00");
    }

    [Fact]
    public async Task SyncMeasurementsAsync_WithPaginatedData_SyncsAllPages()
    {
        // Arrange
        var userId = Guid.NewGuid();
        // Profile service is not used in sync

        var token = CreateValidToken();
        var providerLink = new DbProviderLink
        {
            Provider = "withings",
            Token = token
        };

        _providerLinkServiceMock.Setup(x => x.GetProviderLinkAsync(userId, "withings"))
            .ReturnsAsync(providerLink);

        // Setup paginated responses
        var firstPageResponse = new WithingsResponse<WithingsGetMeasuresResponse>
        {
            Status = 0,
            Body = new WithingsGetMeasuresResponse
            {
                UpdateTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                More = 1,
                Offset = 12345,
                Timezone = "UTC",
                MeasureGroups = CreateMeasureGroups(10) // 10 measurements
            }
        };

        var secondPageResponse = new WithingsResponse<WithingsGetMeasuresResponse>
        {
            Status = 0,
            Body = new WithingsGetMeasuresResponse
            {
                UpdateTime = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                More = 0,
                Offset = 0,
                Timezone = "UTC",
                MeasureGroups = CreateMeasureGroups(5) // 5 measurements
            }
        };

        SetupPaginatedHttpResponses(firstPageResponse, secondPageResponse);

        // Act
        var result = await _sut.SyncMeasurementsAsync(userId, true);

        // Assert
        result.Success.Should().BeTrue();
        result.Provider.Should().Be("withings");
        result.Measurements.Should().NotBeNull();
        result.Measurements!.Count.Should().Be(15); // 10 from first page + 5 from second page
    }

    #endregion

    #region Helper Methods

    private Dictionary<string, object> CreateValidToken()
    {
        return new Dictionary<string, object>
        {
            ["access_token"] = "test-access-token",
            ["refresh_token"] = "test-refresh-token",
            ["received_at"] = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
            ["expires_in"] = 10800
        };
    }

    private WithingsMeasureGroup CreateMeasureGroup(long groupId, DateTimeOffset date, decimal weightKg)
    {
        return new WithingsMeasureGroup
        {
            GroupId = groupId,
            Attribute = 0,
            Date = date.ToUnixTimeSeconds(),
            Created = date.ToUnixTimeSeconds(),
            Category = 1,
            Measures = new List<WithingsMeasure>
            {
                new WithingsMeasure
                {
                    Value = (int)(weightKg * 1000), // Convert kg to mg
                    Type = 1, // Weight
                    Unit = -3 // kg
                }
            }
        };
    }

    private List<WithingsMeasureGroup> CreateMeasureGroups(int count)
    {
        var groups = new List<WithingsMeasureGroup>();
        for (int i = 0; i < count; i++)
        {
            groups.Add(CreateMeasureGroup(
                i + 1,
                DateTimeOffset.UtcNow.AddDays(-(i + 1)),
                70.0m + i * 0.5m));
        }
        return groups;
    }

    private void SetupHttpResponse<T>(string urlContains, T responseContent, HttpStatusCode statusCode = HttpStatusCode.OK)
    {
        var json = JsonSerializer.Serialize(responseContent);
        var response = new HttpResponseMessage(statusCode)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

        _httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req => req.RequestUri!.ToString().Contains(urlContains)),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(response);
    }

    private void SetupPaginatedHttpResponses(params WithingsResponse<WithingsGetMeasuresResponse>[] responses)
    {
        var callCount = 0;
        _httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req =>
                    req.RequestUri!.ToString().Contains("wbsapi.withings.net/measure")),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(() =>
            {
                var response = responses[callCount];
                callCount = Math.Min(callCount + 1, responses.Length - 1);

                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(
                        JsonSerializer.Serialize(response),
                        Encoding.UTF8,
                        "application/json")
                };
            });
    }

    #endregion
}
