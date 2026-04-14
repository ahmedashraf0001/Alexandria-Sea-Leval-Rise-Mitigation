using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SeaLevel.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateForecastLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "PredictedSeaLevel",
                table: "ForecastLogs",
                newName: "ProjectedSeaLevel");

            migrationBuilder.AddColumn<double>(
                name: "BaselineSeaLevel",
                table: "ForecastLogs",
                type: "float",
                nullable: false,
                defaultValue: 0.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BaselineSeaLevel",
                table: "ForecastLogs");

            migrationBuilder.RenameColumn(
                name: "ProjectedSeaLevel",
                table: "ForecastLogs",
                newName: "PredictedSeaLevel");
        }
    }
}
