using Microsoft.Extensions.DependencyInjection;
using SeaLevel.Application.Services.Implementations;
using SeaLevel.Application.Services.Interfaces;

namespace SeaLevel.Application;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IMapRiskService, MapRiskService>();
        services.AddScoped<IPopulationService, PopulationService>();
        services.AddScoped<IInfrastructureService, InfrastructureService>();
        services.AddScoped<IAnalyticsService, AnalyticsService>();
        services.AddScoped<IChatService, ChatService>();
        services.AddScoped<IReportService, ReportService>();
        services.AddScoped<IScenariosService, ScenariosService>();

        return services;
    }
}
