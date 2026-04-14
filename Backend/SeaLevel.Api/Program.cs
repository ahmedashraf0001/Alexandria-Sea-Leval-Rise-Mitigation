using System.Text;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SeaLevel.Api.Middleware;
using SeaLevel.Application;
using SeaLevel.Application.Validators;
using SeaLevel.Infrastructure.Extensions;
using SeaLevel.Infrastructure.Persistence;
using Serilog;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, loggerConfiguration) =>
{
    loggerConfiguration
        .ReadFrom.Configuration(context.Configuration)
        .Enrich.FromLogContext()
        .WriteTo.Console()
        .WriteTo.File("logs/sealevel-.log", rollingInterval: RollingInterval.Day);
});

builder.Services.AddControllers();

string connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is required.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

builder.Services.AddIdentityInfrastructure(builder.Configuration);

string jwtSecret = Environment.GetEnvironmentVariable("ASL_JWT_KEY") ?? builder.Configuration["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret is required.");
string jwtIssuer = builder.Configuration["Jwt:Issuer"]
    ?? throw new InvalidOperationException("Jwt:Issuer is required.");
string jwtAudience = builder.Configuration["Jwt:Audience"]
    ?? throw new InvalidOperationException("Jwt:Audience is required.");

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddMemoryCache();

string mlApiBaseUrl = builder.Configuration["MlApi:BaseUrl"] ?? "http://ml-api:8000";
builder.Services.AddHttpClient("MlApi", client =>
{
    client.BaseAddress = new Uri(mlApiBaseUrl);
    client.Timeout = TimeSpan.FromSeconds(10);
});

string nasaPowerBaseUrl = builder.Configuration["NasaPower:BaseUrl"] ?? "https://power.larc.nasa.gov";
builder.Services.AddHttpClient("NasaPower", client =>
{
    client.BaseAddress = new Uri(nasaPowerBaseUrl);
    client.Timeout = TimeSpan.FromSeconds(30);
});

string groqBaseUrl = builder.Configuration["Groq:BaseUrl"] ?? "https://api.groq.com/openai/v1/";
if (!groqBaseUrl.EndsWith('/'))
{
    groqBaseUrl += "/";
}

builder.Services.AddHttpClient("Groq", client =>
{
    client.BaseAddress = new Uri(groqBaseUrl);
    client.Timeout = TimeSpan.FromSeconds(45);
});

builder.Services.AddInfrastructureServices();
builder.Services.AddApplicationServices();

builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Sea Level API",
        Version = "v1"
    });

    OpenApiSecurityScheme securityScheme = new()
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter a valid JWT token."
    };

    options.AddSecurityDefinition("Bearer", securityScheme);

    OpenApiSecurityRequirement securityRequirement = new()
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Id = "Bearer",
                    Type = ReferenceType.SecurityScheme
                }
            },
            Array.Empty<string>()
        }
    };

    options.AddSecurityRequirement(securityRequirement);
});

string[] allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

WebApplication app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("CorsPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

