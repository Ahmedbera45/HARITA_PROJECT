using Harita.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Harita.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<UserRole> UserRoles { get; set; }
        
        // İŞTE EKSİK OLAN SATIR BU:
        public DbSet<AppTask> Tasks { get; set; }
        
        public DbSet<Contact> Contacts { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Kullanıcı İlişkileri (Çoka-çok)
            modelBuilder.Entity<UserRole>()
                .HasKey(ur => new { ur.UserId, ur.RoleId });

            modelBuilder.Entity<UserRole>()
                .HasOne(ur => ur.User)
                .WithMany(u => u.UserRoles)
                .HasForeignKey(ur => ur.UserId);

            modelBuilder.Entity<UserRole>()
                .HasOne(ur => ur.Role)
                .WithMany(r => r.UserRoles)
                .HasForeignKey(ur => ur.RoleId);

            // GÖREV İLİŞKİLERİ (Hata veren yer burasıydı, düzelttik)
            modelBuilder.Entity<AppTask>()
                .HasOne(t => t.AssignedUser) // Entity'de AssignedUser demiştik
                .WithMany()
                .HasForeignKey(t => t.AssignedUserId)
                .OnDelete(DeleteBehavior.Restrict); // Kullanıcı silinirse görevi silme
        }
    }
}