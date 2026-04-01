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
        public DbSet<AppTask> Tasks { get; set; }
        public DbSet<TaskAssignment> TaskAssignments { get; set; }
        public DbSet<Contact> Contacts { get; set; }
        public DbSet<LeaveRequest> LeaveRequests { get; set; }
        public DbSet<Parcel> Parcels { get; set; }
        public DbSet<ImportLog> ImportLogs { get; set; }
        public DbSet<FeeCalculation> FeeCalculations { get; set; }
        public DbSet<FeeRate> FeeRates { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Kullanıcı-Rol (çoka-çok)
            modelBuilder.Entity<UserRole>()
                .HasKey(ur => new { ur.UserId, ur.RoleId });
            modelBuilder.Entity<UserRole>()
                .HasOne(ur => ur.User).WithMany(u => u.UserRoles).HasForeignKey(ur => ur.UserId);
            modelBuilder.Entity<UserRole>()
                .HasOne(ur => ur.Role).WithMany(r => r.UserRoles).HasForeignKey(ur => ur.RoleId);

            // Görev-Kullanıcı çoklu atama (çoka-çok)
            modelBuilder.Entity<TaskAssignment>()
                .HasKey(ta => new { ta.TaskId, ta.UserId });
            modelBuilder.Entity<TaskAssignment>()
                .HasOne(ta => ta.Task)
                .WithMany(t => t.Assignments)
                .HasForeignKey(ta => ta.TaskId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<TaskAssignment>()
                .HasOne(ta => ta.User)
                .WithMany()
                .HasForeignKey(ta => ta.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            // Görev oluşturan kullanıcı
            modelBuilder.Entity<AppTask>()
                .HasOne<User>()
                .WithMany(u => u.CreatedAppTasks)
                .HasForeignKey(t => t.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            // İzin talepleri
            modelBuilder.Entity<LeaveRequest>()
                .HasOne(l => l.User).WithMany()
                .HasForeignKey(l => l.UserId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<LeaveRequest>()
                .HasOne(l => l.ReviewedByUser).WithMany()
                .HasForeignKey(l => l.ReviewedByUserId).OnDelete(DeleteBehavior.Restrict);

            // Import log
            modelBuilder.Entity<ImportLog>()
                .HasOne(i => i.ImportedByUser).WithMany()
                .HasForeignKey(i => i.ImportedByUserId).OnDelete(DeleteBehavior.Restrict);

            // Harç hesaplama
            modelBuilder.Entity<FeeCalculation>()
                .HasOne(f => f.User).WithMany()
                .HasForeignKey(f => f.UserId).OnDelete(DeleteBehavior.Restrict);
        }
    }
}
