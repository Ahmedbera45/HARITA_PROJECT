using Harita.API.Data;
using Microsoft.EntityFrameworkCore;

namespace Harita.Tests.Helpers
{
    public static class TestDbContextFactory
    {
        public static AppDbContext Create(string dbName = "")
        {
            var name = string.IsNullOrEmpty(dbName) ? Guid.NewGuid().ToString() : dbName;
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: name)
                .Options;
            var context = new AppDbContext(options);
            context.Database.EnsureCreated();
            return context;
        }
    }
}
