using Domain.Entities;
using Infrastructure.Persistence;
using Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace Domain.Tests.Services;

/// <summary>
/// Unit tests for TokenService to verify token generation and validation logic.
/// </summary>
public class TokenServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly TokenService _tokenService;

    public TokenServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"TestDb_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _tokenService = new TokenService(_context);
    }

    [Fact]
    public async Task GenerateTokenForDollAsync_ShouldGenerateUnique16CharToken()
    {
        // Arrange
        var dollId = Guid.NewGuid();

        // Act
        var result = await _tokenService.GenerateTokenForDollAsync(dollId);

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result.Token);
        Assert.Equal(16, result.Token.Length);
        Assert.All(result.Token, c => Assert.True(char.IsLetterOrDigit(c)));
        Assert.True(result.ExpiresAt > DateTime.UtcNow);
        Assert.True(result.ExpiresAt <= DateTime.UtcNow.AddYears(1).AddSeconds(5)); // Allow 5 sec tolerance
    }

    [Fact]
    public async Task GenerateTokenForDollAsync_ShouldCreateUniqueTokens()
    {
        // Arrange
        var dollId1 = Guid.NewGuid();
        var dollId2 = Guid.NewGuid();

        // Act
        var result1 = await _tokenService.GenerateTokenForDollAsync(dollId1);
        var result2 = await _tokenService.GenerateTokenForDollAsync(dollId2);

        // Assert
        Assert.NotEqual(result1.Token, result2.Token);
    }

    [Fact]
    public async Task ValidateTokenAsync_ShouldSucceedForValidToken()
    {
        // Arrange
        var dollId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var tokenResult = await _tokenService.GenerateTokenForDollAsync(dollId);

        // Act
        var validationResult = await _tokenService.ValidateTokenAsync(tokenResult.Token, userId);

        // Assert
        Assert.True(validationResult.IsValid);
        Assert.Equal(dollId, validationResult.DollId);
        Assert.Null(validationResult.ErrorMessage);
    }

    [Fact]
    public async Task ValidateTokenAsync_ShouldFailForInvalidTokenFormat()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var invalidToken = "short";

        // Act
        var validationResult = await _tokenService.ValidateTokenAsync(invalidToken, userId);

        // Assert
        Assert.False(validationResult.IsValid);
        Assert.Equal("Invalid token format", validationResult.ErrorMessage);
    }

    [Fact]
    public async Task ValidateTokenAsync_ShouldFailForNonExistentToken()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var nonExistentToken = "1234567890ABCDEF";

        // Act
        var validationResult = await _tokenService.ValidateTokenAsync(nonExistentToken, userId);

        // Assert
        Assert.False(validationResult.IsValid);
        Assert.Equal("Token not found or expired", validationResult.ErrorMessage);
    }

    [Fact]
    public async Task ValidateTokenAsync_ShouldFailForExpiredToken()
    {
        // Arrange
        var dollId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var token = "EXPIREDTOKEN1234";
        var expiredToken = new DollToken(dollId, token, DateTime.UtcNow.AddDays(-1));
        
        _context.DollTokens.Add(expiredToken);
        await _context.SaveChangesAsync();

        // Act
        var validationResult = await _tokenService.ValidateTokenAsync(token, userId);

        // Assert
        Assert.False(validationResult.IsValid);
        Assert.Equal("Token not found or expired", validationResult.ErrorMessage);
    }

    [Fact]
    public async Task ValidateTokenAsync_ShouldFailForAlreadyUsedToken()
    {
        // Arrange
        var dollId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var tokenResult = await _tokenService.GenerateTokenForDollAsync(dollId);
        
        // First validation claims it
        await _tokenService.ValidateTokenAsync(tokenResult.Token, userId);
        
        // Mark as used
        var tokenEntity = await _context.DollTokens.FirstAsync(t => t.Token == tokenResult.Token);
        tokenEntity.MarkAsUsed();
        await _context.SaveChangesAsync();

        // Act - try to validate again
        var validationResult = await _tokenService.ValidateTokenAsync(tokenResult.Token, Guid.NewGuid());

        // Assert
        Assert.False(validationResult.IsValid);
        Assert.Equal("Token already used", validationResult.ErrorMessage);
    }

    [Fact]
    public async Task ValidateTokenAsync_ShouldPreventRaceCondition()
    {
        // Arrange
        var dollId = Guid.NewGuid();
        var userId1 = Guid.NewGuid();
        var userId2 = Guid.NewGuid();
        var tokenResult = await _tokenService.GenerateTokenForDollAsync(dollId);

        // Act - First user claims successfully
        var validation1 = await _tokenService.ValidateTokenAsync(tokenResult.Token, userId1);

        // Clear change tracker to simulate fresh query in new request context
        _context.ChangeTracker.Clear();

        // Act - Second user tries to claim the same token
        var validation2 = await _tokenService.ValidateTokenAsync(tokenResult.Token, userId2);

        // Assert
        Assert.True(validation1.IsValid);
        Assert.False(validation2.IsValid);
        Assert.Equal("Token already claimed by another user", validation2.ErrorMessage);
    }

    [Fact]
    public async Task GetUserTokenInventoryAsync_ShouldReturnUserTokens()
    {
        // Arrange
        var dollId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var tokenResult = await _tokenService.GenerateTokenForDollAsync(dollId);
        await _tokenService.ValidateTokenAsync(tokenResult.Token, userId);

        // Act
        var inventory = await _tokenService.GetUserTokenInventoryAsync(userId);

        // Assert
        Assert.NotNull(inventory);
        Assert.Single(inventory.Tokens);
        Assert.Equal(tokenResult.Token, inventory.Tokens[0].Token);
        Assert.Equal(dollId, inventory.Tokens[0].DollId);
    }

    [Fact]
    public async Task RevokeTokenAsync_ShouldRevokeUnusedToken()
    {
        // Arrange
        var dollId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var tokenResult = await _tokenService.GenerateTokenForDollAsync(dollId);
        await _tokenService.ValidateTokenAsync(tokenResult.Token, userId);

        // Act
        var revokeResult = await _tokenService.RevokeTokenAsync(tokenResult.Token, userId);

        // Assert
        Assert.True(revokeResult);
        
        // Verify token is marked as used
        var tokenEntity = await _context.DollTokens.FirstAsync(t => t.Token == tokenResult.Token);
        Assert.True(tokenEntity.IsUsed);
    }

    [Fact]
    public async Task RevokeTokenAsync_ShouldFailForNonOwnedToken()
    {
        // Arrange
        var dollId = Guid.NewGuid();
        var userId1 = Guid.NewGuid();
        var userId2 = Guid.NewGuid();
        var tokenResult = await _tokenService.GenerateTokenForDollAsync(dollId);
        await _tokenService.ValidateTokenAsync(tokenResult.Token, userId1);

        // Act - Different user tries to revoke
        var revokeResult = await _tokenService.RevokeTokenAsync(tokenResult.Token, userId2);

        // Assert
        Assert.False(revokeResult);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }
}
