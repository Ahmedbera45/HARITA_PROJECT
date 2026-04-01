using System.Security.Claims;
using ClosedXML.Excel;
using Harita.API.Entities;
using Harita.API.Services;
using Harita.Tests.Helpers;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;

namespace Harita.Tests.Services
{
    public class ImportServiceTests
    {
        private readonly Guid _userId = Guid.NewGuid();

        private IHttpContextAccessor CreateAccessor(Guid userId)
        {
            var claims = new[] { new Claim(ClaimTypes.NameIdentifier, userId.ToString()) };
            var ctx = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims)) };
            var mock = new Mock<IHttpContextAccessor>();
            mock.Setup(m => m.HttpContext).Returns(ctx);
            return mock.Object;
        }

        private IFormFile CreateExcelFile(Action<IXLWorksheet> populate, string fileName = "test.xlsx")
        {
            using var wb = new XLWorkbook();
            var ws = wb.Worksheets.Add("Veri");
            populate(ws);

            var ms = new MemoryStream();
            wb.SaveAs(ms);
            ms.Position = 0;

            var mockFile = new Mock<IFormFile>();
            mockFile.Setup(f => f.FileName).Returns(fileName);
            mockFile.Setup(f => f.Length).Returns(ms.Length);
            mockFile.Setup(f => f.CopyToAsync(It.IsAny<Stream>(), It.IsAny<CancellationToken>()))
                .Callback<Stream, CancellationToken>((dest, _) => ms.CopyTo(dest))
                .Returns(Task.CompletedTask);
            return mockFile.Object;
        }

        private void SeedUser(Harita.API.Data.AppDbContext db, Guid id)
        {
            db.Users.Add(new User { Id = id, Name = "Test", Surname = "User", Email = "t@t.com", PasswordHash = "h", Department = "Test" });
            db.SaveChanges();
        }

        // ─── ImportParcelsFromExcelAsync ─────────────────────

        [Fact]
        public async Task Import_Success_WithAllColumns()
        {
            var db = TestDbContextFactory.Create(nameof(Import_Success_WithAllColumns));
            SeedUser(db, _userId);

            var file = CreateExcelFile(ws =>
            {
                ws.Cell(1, 1).Value = "Ada";     ws.Cell(1, 2).Value = "Parsel";
                ws.Cell(1, 3).Value = "Mahalle"; ws.Cell(1, 4).Value = "Alan";
                ws.Cell(1, 5).Value = "Nitelik"; ws.Cell(1, 6).Value = "MalikAdi";

                ws.Cell(2, 1).Value = "100"; ws.Cell(2, 2).Value = "5";
                ws.Cell(2, 3).Value = "Merkez"; ws.Cell(2, 4).Value = 500.5;
                ws.Cell(2, 5).Value = "Arsa"; ws.Cell(2, 6).Value = "Ali Veli";

                ws.Cell(3, 1).Value = "101"; ws.Cell(3, 2).Value = "3";
                ws.Cell(3, 3).Value = "Kuzey"; ws.Cell(3, 4).Value = 300;
                ws.Cell(3, 5).Value = "Tarla"; ws.Cell(3, 6).Value = "Ayşe Kaya";
            });

            var service = new ImportService(db, CreateAccessor(_userId));
            var result = await service.ImportParcelsFromExcelAsync(file);

            Assert.Equal(2, result.SuccessRows);
            Assert.Equal(0, result.ErrorRows);
            Assert.Equal(2, db.Parcels.Count());
            Assert.Single(db.ImportLogs.ToList());
        }

        [Fact]
        public async Task Import_ReportsError_ForRowMissingRequiredFields()
        {
            var db = TestDbContextFactory.Create(nameof(Import_ReportsError_ForRowMissingRequiredFields));
            SeedUser(db, _userId);

            var file = CreateExcelFile(ws =>
            {
                ws.Cell(1, 1).Value = "Ada"; ws.Cell(1, 2).Value = "Parsel"; ws.Cell(1, 3).Value = "Mahalle";
                // Satır 2: Ada boş
                ws.Cell(2, 1).Value = "";   ws.Cell(2, 2).Value = "5"; ws.Cell(2, 3).Value = "Merkez";
                // Satır 3: Geçerli
                ws.Cell(3, 1).Value = "100"; ws.Cell(3, 2).Value = "1"; ws.Cell(3, 3).Value = "Güney";
            });

            var service = new ImportService(db, CreateAccessor(_userId));
            var result = await service.ImportParcelsFromExcelAsync(file);

            Assert.Equal(1, result.SuccessRows);
            Assert.Equal(1, result.ErrorRows);
            Assert.Single(result.Errors);
        }

        [Fact]
        public async Task Import_Throws_WhenRequiredColumnMissing()
        {
            var db = TestDbContextFactory.Create(nameof(Import_Throws_WhenRequiredColumnMissing));
            SeedUser(db, _userId);

            var file = CreateExcelFile(ws =>
            {
                // "Mahalle" sütunu eksik
                ws.Cell(1, 1).Value = "Ada"; ws.Cell(1, 2).Value = "Parsel";
                ws.Cell(2, 1).Value = "100"; ws.Cell(2, 2).Value = "1";
            });

            var service = new ImportService(db, CreateAccessor(_userId));
            await Assert.ThrowsAsync<Exception>(() => service.ImportParcelsFromExcelAsync(file));
        }

        [Fact]
        public async Task Import_ParsesAlanCorrectly()
        {
            var db = TestDbContextFactory.Create(nameof(Import_ParsesAlanCorrectly));
            SeedUser(db, _userId);

            var file = CreateExcelFile(ws =>
            {
                ws.Cell(1, 1).Value = "Ada"; ws.Cell(1, 2).Value = "Parsel";
                ws.Cell(1, 3).Value = "Mahalle"; ws.Cell(1, 4).Value = "Alan";
                ws.Cell(2, 1).Value = "50"; ws.Cell(2, 2).Value = "2";
                ws.Cell(2, 3).Value = "Doğu"; ws.Cell(2, 4).Value = 1250.75;
            });

            var service = new ImportService(db, CreateAccessor(_userId));
            await service.ImportParcelsFromExcelAsync(file);

            var parcel = db.Parcels.First();
            Assert.Equal(1250.75, parcel.Alan);
        }

        // ─── GetImportLogsAsync ──────────────────────────────

        [Fact]
        public async Task GetImportLogs_ReturnsEmpty_WhenNoImportsDone()
        {
            var db = TestDbContextFactory.Create(nameof(GetImportLogs_ReturnsEmpty_WhenNoImportsDone));
            SeedUser(db, _userId);

            var service = new ImportService(db, CreateAccessor(_userId));
            var result = await service.GetImportLogsAsync();

            Assert.Empty(result);
        }

        [Fact]
        public async Task GetImportLogs_ReturnsLog_AfterSuccessfulImport()
        {
            var db = TestDbContextFactory.Create(nameof(GetImportLogs_ReturnsLog_AfterSuccessfulImport));
            SeedUser(db, _userId);

            var file = CreateExcelFile(ws =>
            {
                ws.Cell(1, 1).Value = "Ada"; ws.Cell(1, 2).Value = "Parsel"; ws.Cell(1, 3).Value = "Mahalle";
                ws.Cell(2, 1).Value = "10";  ws.Cell(2, 2).Value = "1";     ws.Cell(2, 3).Value = "Merkez";
            }, "import_test.xlsx");

            var service = new ImportService(db, CreateAccessor(_userId));
            await service.ImportParcelsFromExcelAsync(file);

            var logs = await service.GetImportLogsAsync();

            Assert.Single(logs);
            Assert.Equal("import_test.xlsx", logs[0].FileName);
            Assert.Equal(1, logs[0].SuccessRows);
            Assert.Equal(0, logs[0].ErrorRows);
        }

        [Fact]
        public async Task GetImportLogs_ReturnsMultipleLogs_OrderedByDateDesc()
        {
            var db = TestDbContextFactory.Create(nameof(GetImportLogs_ReturnsMultipleLogs_OrderedByDateDesc));
            SeedUser(db, _userId);

            // İki import yap
            for (int i = 1; i <= 2; i++)
            {
                var f = CreateExcelFile(ws =>
                {
                    ws.Cell(1, 1).Value = "Ada"; ws.Cell(1, 2).Value = "Parsel"; ws.Cell(1, 3).Value = "Mahalle";
                    ws.Cell(2, 1).Value = "1";   ws.Cell(2, 2).Value = "1";     ws.Cell(2, 3).Value = "Test";
                }, $"dosya_{i}.xlsx");

                var svc = new ImportService(db, CreateAccessor(_userId));
                await svc.ImportParcelsFromExcelAsync(f);
            }

            var service = new ImportService(db, CreateAccessor(_userId));
            var logs = await service.GetImportLogsAsync();

            Assert.Equal(2, logs.Count);
            // En yeni log önce gelmeli
            Assert.True(logs[0].CreatedAt >= logs[1].CreatedAt);
        }

        // ─── GetParcelsAsync ─────────────────────────────────

        [Fact]
        public async Task GetParcels_FiltersByMahalle()
        {
            var db = TestDbContextFactory.Create(nameof(GetParcels_FiltersByMahalle));
            SeedUser(db, _userId);
            db.Parcels.Add(new Parcel { Ada = "1", Parsel = "1", Mahalle = "Merkez", ImportBatchId = "AAA" });
            db.Parcels.Add(new Parcel { Ada = "2", Parsel = "2", Mahalle = "Kuzey", ImportBatchId = "BBB" });
            db.SaveChanges();

            var service = new ImportService(db, CreateAccessor(_userId));
            var result = await service.GetParcelsAsync(mahalle: "Merkez");

            Assert.Single(result);
            Assert.Equal("Merkez", result[0].Mahalle);
        }

        [Fact]
        public async Task GetParcels_FiltersByBatchId()
        {
            var db = TestDbContextFactory.Create(nameof(GetParcels_FiltersByBatchId));
            SeedUser(db, _userId);
            db.Parcels.Add(new Parcel { Ada = "1", Parsel = "1", Mahalle = "Merkez", ImportBatchId = "BATCH1" });
            db.Parcels.Add(new Parcel { Ada = "2", Parsel = "2", Mahalle = "Güney", ImportBatchId = "BATCH2" });
            db.SaveChanges();

            var service = new ImportService(db, CreateAccessor(_userId));
            var result = await service.GetParcelsAsync(batchId: "BATCH1");

            Assert.Single(result);
            Assert.Equal("BATCH1", result[0].ImportBatchId);
        }
    }
}
