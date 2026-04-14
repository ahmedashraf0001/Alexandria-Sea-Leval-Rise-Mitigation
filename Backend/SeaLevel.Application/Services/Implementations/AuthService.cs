using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FluentValidation;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SeaLevel.Application.DTOs.Auth;
using SeaLevel.Application.Services.Interfaces;
using SeaLevel.Core.Entities;

namespace SeaLevel.Application.Services.Implementations;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IConfiguration _configuration;

    public AuthService(UserManager<ApplicationUser> userManager, IConfiguration configuration)
    {
        _userManager = userManager;
        _configuration = configuration;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        ApplicationUser? existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser is not null)
        {
            throw new ValidationException("Email is already registered.");
        }

        ApplicationUser user = new()
        {
            Email = request.Email,
            UserName = request.Username
        };

        IdentityResult createResult = await _userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            string errors = string.Join("; ", createResult.Errors.Select(error => error.Description));
            throw new ValidationException(errors);
        }

        return BuildAuthResponse(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        ApplicationUser? user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null)
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        bool passwordValid = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!passwordValid)
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        return BuildAuthResponse(user);
    }

    private AuthResponse BuildAuthResponse(ApplicationUser user)
    {
        string secret = _configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("JWT secret is missing from configuration.");

        string issuer = _configuration["Jwt:Issuer"]
            ?? throw new InvalidOperationException("JWT issuer is missing from configuration.");

        string audience = _configuration["Jwt:Audience"]
            ?? throw new InvalidOperationException("JWT audience is missing from configuration.");

        int expiryDays = _configuration.GetValue<int?>("Jwt:ExpiryDays") ?? 7;
        DateTime expiresAtUtc = DateTime.UtcNow.AddDays(expiryDays);

        List<Claim> claims = new()
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
            new Claim(ClaimTypes.Name, user.UserName ?? string.Empty),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N"))
        };

        SymmetricSecurityKey securityKey = new(Encoding.UTF8.GetBytes(secret));
        SigningCredentials credentials = new(securityKey, SecurityAlgorithms.HmacSha256);

        JwtSecurityToken jwtToken = new(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiresAtUtc,
            signingCredentials: credentials);

        string token = new JwtSecurityTokenHandler().WriteToken(jwtToken);

        return new AuthResponse
        {
            Token = token,
            Email = user.Email ?? string.Empty,
            Username = user.UserName ?? string.Empty,
            ExpiresAtUtc = expiresAtUtc
        };
    }
}
