using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Harita.API.Migrations
{
    /// <inheritdoc />
    public partial class AddImarPlanlar : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ImarPlanlar",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PlanNo = table.Column<string>(type: "text", nullable: false),
                    PlanAdi = table.Column<string>(type: "text", nullable: false),
                    PlanTuru = table.Column<string>(type: "text", nullable: false),
                    Mahalle = table.Column<string>(type: "text", nullable: true),
                    Ada = table.Column<string>(type: "text", nullable: true),
                    Parsel = table.Column<string>(type: "text", nullable: true),
                    YuzolcumHa = table.Column<decimal>(type: "numeric", nullable: true),
                    Konu = table.Column<string>(type: "text", nullable: true),
                    OnayTarihi = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    OnayMakami = table.Column<string>(type: "text", nullable: true),
                    Durum = table.Column<string>(type: "text", nullable: false),
                    Aciklama = table.Column<string>(type: "text", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImarPlanlar", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ImarPlanlar_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ImarPlanEkler",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ImarPlanId = table.Column<Guid>(type: "uuid", nullable: false),
                    DosyaAdi = table.Column<string>(type: "text", nullable: false),
                    DosyaYolu = table.Column<string>(type: "text", nullable: false),
                    DosyaTuru = table.Column<string>(type: "text", nullable: true),
                    Aciklama = table.Column<string>(type: "text", nullable: true),
                    EkleyenId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImarPlanEkler", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ImarPlanEkler_ImarPlanlar_ImarPlanId",
                        column: x => x.ImarPlanId,
                        principalTable: "ImarPlanlar",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ImarPlanEkler_Users_EkleyenId",
                        column: x => x.EkleyenId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ImarPlanEkler_EkleyenId",
                table: "ImarPlanEkler",
                column: "EkleyenId");

            migrationBuilder.CreateIndex(
                name: "IX_ImarPlanEkler_ImarPlanId",
                table: "ImarPlanEkler",
                column: "ImarPlanId");

            migrationBuilder.CreateIndex(
                name: "IX_ImarPlanlar_CreatedByUserId",
                table: "ImarPlanlar",
                column: "CreatedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ImarPlanEkler");

            migrationBuilder.DropTable(
                name: "ImarPlanlar");
        }
    }
}
