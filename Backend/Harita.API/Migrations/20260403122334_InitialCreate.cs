using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Harita.API.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Contacts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FirstName = table.Column<string>(type: "text", nullable: false),
                    LastName = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: true),
                    Institution = table.Column<string>(type: "text", nullable: true),
                    Department = table.Column<string>(type: "text", nullable: true),
                    PhoneNumber = table.Column<string>(type: "text", nullable: true),
                    Email = table.Column<string>(type: "text", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Contacts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FeeCategories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    SiraNo = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeeCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Parcels",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Ada = table.Column<string>(type: "text", nullable: false),
                    Parsel = table.Column<string>(type: "text", nullable: false),
                    Mahalle = table.Column<string>(type: "text", nullable: false),
                    Mevkii = table.Column<string>(type: "text", nullable: true),
                    Alan = table.Column<double>(type: "double precision", nullable: true),
                    Nitelik = table.Column<string>(type: "text", nullable: true),
                    MalikAdi = table.Column<string>(type: "text", nullable: true),
                    PaftaNo = table.Column<string>(type: "text", nullable: true),
                    RayicBedel = table.Column<decimal>(type: "numeric", nullable: true),
                    YolGenisligi = table.Column<string>(type: "text", nullable: true),
                    EskiAda = table.Column<string>(type: "text", nullable: true),
                    EskiParsel = table.Column<string>(type: "text", nullable: true),
                    PlanFonksiyonu = table.Column<string>(type: "text", nullable: true),
                    Geometry = table.Column<string>(type: "text", nullable: true),
                    ImportBatchId = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Parcels", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PermissionGroups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Permissions = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PermissionGroups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: true),
                    Surname = table.Column<string>(type: "text", nullable: true),
                    Email = table.Column<string>(type: "text", nullable: true),
                    PasswordHash = table.Column<string>(type: "text", nullable: true),
                    Department = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FeeRates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CategoryId = table.Column<Guid>(type: "uuid", nullable: true),
                    HarcTuru = table.Column<string>(type: "text", nullable: false),
                    BirimHarc = table.Column<double>(type: "double precision", nullable: false),
                    Katsayi = table.Column<double>(type: "double precision", nullable: true),
                    Aciklama = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    SiraNo = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeeRates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FeeRates_FeeCategories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "FeeCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "DynamicPages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Slug = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    ParcelMatching = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DynamicPages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DynamicPages_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "FeeCalculations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    HarcTuru = table.Column<string>(type: "text", nullable: false),
                    AlanM2 = table.Column<double>(type: "double precision", nullable: false),
                    BirimHarc = table.Column<double>(type: "double precision", nullable: false),
                    ToplamHarc = table.Column<double>(type: "double precision", nullable: false),
                    Ada = table.Column<string>(type: "text", nullable: false),
                    Parsel = table.Column<string>(type: "text", nullable: false),
                    Mahalle = table.Column<string>(type: "text", nullable: false),
                    MalikAdi = table.Column<string>(type: "text", nullable: true),
                    PlanFonksiyonu = table.Column<string>(type: "text", nullable: true),
                    Notlar = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeeCalculations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FeeCalculations_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ImportLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BatchId = table.Column<string>(type: "text", nullable: false),
                    FileName = table.Column<string>(type: "text", nullable: false),
                    TotalRows = table.Column<int>(type: "integer", nullable: false),
                    SuccessRows = table.Column<int>(type: "integer", nullable: false),
                    ErrorRows = table.Column<int>(type: "integer", nullable: false),
                    ErrorDetails = table.Column<string>(type: "text", nullable: true),
                    ImportedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ImportLogs_Users_ImportedByUserId",
                        column: x => x.ImportedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "LeaveRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    LeaveType = table.Column<string>(type: "text", nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    EndDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    DaysCount = table.Column<int>(type: "integer", nullable: false),
                    IsSaatlik = table.Column<bool>(type: "boolean", nullable: false),
                    BaslangicSaati = table.Column<string>(type: "text", nullable: true),
                    BitisSaati = table.Column<string>(type: "text", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ReviewedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    ReviewNote = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LeaveRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LeaveRequests_Users_ReviewedByUserId",
                        column: x => x.ReviewedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LeaveRequests_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Tasks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    Priority = table.Column<string>(type: "text", nullable: false),
                    DueDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tasks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Tasks_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TevhidCalculations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ParcelId = table.Column<Guid>(type: "uuid", nullable: true),
                    Ada = table.Column<string>(type: "text", nullable: false),
                    ParselNo = table.Column<string>(type: "text", nullable: false),
                    Mahalle = table.Column<string>(type: "text", nullable: false),
                    EskiAda = table.Column<string>(type: "text", nullable: true),
                    EskiParsel = table.Column<string>(type: "text", nullable: true),
                    MalikAdi = table.Column<string>(type: "text", nullable: true),
                    PlanFonksiyonu = table.Column<string>(type: "text", nullable: true),
                    Katsayi = table.Column<double>(type: "double precision", nullable: false),
                    RayicBedel = table.Column<decimal>(type: "numeric", nullable: false),
                    ArsaM2 = table.Column<double>(type: "double precision", nullable: false),
                    TaksM2 = table.Column<double>(type: "double precision", nullable: false),
                    CekmelerM2 = table.Column<double>(type: "double precision", nullable: false),
                    ArsaHarc = table.Column<double>(type: "double precision", nullable: false),
                    TaksHarc = table.Column<double>(type: "double precision", nullable: false),
                    CekmelerHarc = table.Column<double>(type: "double precision", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    OnaylananSenaryo = table.Column<int>(type: "integer", nullable: true),
                    OnaylananHarc = table.Column<double>(type: "double precision", nullable: true),
                    ReviewNote = table.Column<string>(type: "text", nullable: true),
                    Notlar = table.Column<string>(type: "text", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ReviewedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TevhidCalculations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TevhidCalculations_Parcels_ParcelId",
                        column: x => x.ParcelId,
                        principalTable: "Parcels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_TevhidCalculations_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TevhidCalculations_Users_ReviewedByUserId",
                        column: x => x.ReviewedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserPermissionGroups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    PermissionGroupId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserPermissionGroups", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserPermissionGroups_PermissionGroups_PermissionGroupId",
                        column: x => x.PermissionGroupId,
                        principalTable: "PermissionGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserPermissionGroups_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UserRoles",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    RoleId = table.Column<Guid>(type: "uuid", nullable: false),
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserRoles", x => new { x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_UserRoles_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserRoles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DynamicColumns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PageId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DynamicColumns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DynamicColumns_DynamicPages_PageId",
                        column: x => x.PageId,
                        principalTable: "DynamicPages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DynamicRows",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PageId = table.Column<Guid>(type: "uuid", nullable: false),
                    Data = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DynamicRows", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DynamicRows_DynamicPages_PageId",
                        column: x => x.PageId,
                        principalTable: "DynamicPages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TaskAssignments",
                columns: table => new
                {
                    TaskId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskAssignments", x => new { x.TaskId, x.UserId });
                    table.ForeignKey(
                        name: "FK_TaskAssignments_Tasks_TaskId",
                        column: x => x.TaskId,
                        principalTable: "Tasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TaskAssignments_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DynamicColumns_PageId",
                table: "DynamicColumns",
                column: "PageId");

            migrationBuilder.CreateIndex(
                name: "IX_DynamicPages_CreatedByUserId",
                table: "DynamicPages",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_DynamicRows_PageId",
                table: "DynamicRows",
                column: "PageId");

            migrationBuilder.CreateIndex(
                name: "IX_FeeCalculations_UserId",
                table: "FeeCalculations",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_FeeRates_CategoryId",
                table: "FeeRates",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_ImportLogs_ImportedByUserId",
                table: "ImportLogs",
                column: "ImportedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_LeaveRequests_ReviewedByUserId",
                table: "LeaveRequests",
                column: "ReviewedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_LeaveRequests_UserId",
                table: "LeaveRequests",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskAssignments_UserId",
                table: "TaskAssignments",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_CreatedByUserId",
                table: "Tasks",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TevhidCalculations_CreatedByUserId",
                table: "TevhidCalculations",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TevhidCalculations_ParcelId",
                table: "TevhidCalculations",
                column: "ParcelId");

            migrationBuilder.CreateIndex(
                name: "IX_TevhidCalculations_ReviewedByUserId",
                table: "TevhidCalculations",
                column: "ReviewedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserPermissionGroups_PermissionGroupId",
                table: "UserPermissionGroups",
                column: "PermissionGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_UserPermissionGroups_UserId",
                table: "UserPermissionGroups",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserRoles_RoleId",
                table: "UserRoles",
                column: "RoleId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Contacts");

            migrationBuilder.DropTable(
                name: "DynamicColumns");

            migrationBuilder.DropTable(
                name: "DynamicRows");

            migrationBuilder.DropTable(
                name: "FeeCalculations");

            migrationBuilder.DropTable(
                name: "FeeRates");

            migrationBuilder.DropTable(
                name: "ImportLogs");

            migrationBuilder.DropTable(
                name: "LeaveRequests");

            migrationBuilder.DropTable(
                name: "TaskAssignments");

            migrationBuilder.DropTable(
                name: "TevhidCalculations");

            migrationBuilder.DropTable(
                name: "UserPermissionGroups");

            migrationBuilder.DropTable(
                name: "UserRoles");

            migrationBuilder.DropTable(
                name: "DynamicPages");

            migrationBuilder.DropTable(
                name: "FeeCategories");

            migrationBuilder.DropTable(
                name: "Tasks");

            migrationBuilder.DropTable(
                name: "Parcels");

            migrationBuilder.DropTable(
                name: "PermissionGroups");

            migrationBuilder.DropTable(
                name: "Roles");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
