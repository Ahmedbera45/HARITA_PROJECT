using Harita.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Harita.API.Data
{
    public static class DbSeeder
    {
        public static async Task SeedAsync(AppDbContext context)
        {
            // Rolleri seed et (yoksa ekle)
            var roleNames = new[] { "Admin", "Manager", "Staff" };
            foreach (var name in roleNames)
            {
                if (!await context.Roles.AnyAsync(r => r.Name == name))
                {
                    context.Roles.Add(new Role { Name = name });
                }
            }
            await context.SaveChangesAsync();
        }
    }
}
