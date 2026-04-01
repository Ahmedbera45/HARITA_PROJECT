using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Harita.API.Migrations
{
    /// <inheritdoc />
    public partial class AddYolGenlisgiAndSaatlikIzin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "YolGenisligi",
                table: "Parcels",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BaslangicSaati",
                table: "LeaveRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BitisSaati",
                table: "LeaveRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsSaatlik",
                table: "LeaveRequests",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "YolGenisligi",
                table: "Parcels");

            migrationBuilder.DropColumn(
                name: "BaslangicSaati",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "BitisSaati",
                table: "LeaveRequests");

            migrationBuilder.DropColumn(
                name: "IsSaatlik",
                table: "LeaveRequests");
        }
    }
}
