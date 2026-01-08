using Harita.API.Entities;
using Microsoft.EntityFrameworkCore;

namespace Harita.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    // Tablolar
    public DbSet<User> Users { get; set; }
    public DbSet<Role> Roles { get; set; }
    public DbSet<UserRole> UserRoles { get; set; }
    public DbSet<Directory> Directories { get; set; }
    
    // Task ismi System.Threading.Tasks ile çakışmasın diye Entity tipini AppTask yaptık.
    // Veritabanında tablo adı "Tasks" olarak kalabilir.
    public DbSet<AppTask> AppTasks { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // UserRole için Birleşik Anahtar (Composite Key) Tanımı
        modelBuilder.Entity<UserRole>()
            .HasKey(ur => new { ur.UserId, ur.RoleId });

        // ---------------------------------------------------------
        // AppTask İlişkileri
        // ---------------------------------------------------------

        // 1. İlişki: Görevi Üstlenen (AssignedTo)
        modelBuilder.Entity<AppTask>()
            .HasOne(t => t.AssignedToUser)
            .WithMany(u => u.AssignedAppTasks) // Parantez hatası düzeltildi
            .HasForeignKey(t => t.AssignedToUserId)
            .OnDelete(DeleteBehavior.Restrict); // Kullanıcı silinirse görev silinmesin, hata versin.

        // 2. İlişki: Görevi Oluşturan (CreatedBy)
        modelBuilder.Entity<AppTask>()
            .HasOne(t => t.CreatedByUser)
            .WithMany(u => u.CreatedAppTasks) // User entity'sindeki isimle aynı olmalı
            .HasForeignKey(t => t.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        base.OnModelCreating(modelBuilder);
    }
}