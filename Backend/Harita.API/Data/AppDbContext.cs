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
        public DbSet<FeeCategory> FeeCategories { get; set; }
        public DbSet<TevhidCalculation> TevhidCalculations { get; set; }
        public DbSet<DynamicPage> DynamicPages { get; set; }
        public DbSet<DynamicColumn> DynamicColumns { get; set; }
        public DbSet<DynamicRow> DynamicRows { get; set; }
        public DbSet<PermissionGroup> PermissionGroups { get; set; }
        public DbSet<UserPermissionGroup> UserPermissionGroups { get; set; }
        public DbSet<ImarPlan> ImarPlanlar { get; set; }
        public DbSet<ImarPlanEk> ImarPlanEkler { get; set; }
        public DbSet<HourlyLeaveCompensation> HourlyLeaveCompensations { get; set; }
        public DbSet<MapLayer> MapLayers { get; set; }
        public DbSet<SystemSetting> SystemSettings { get; set; }
        public DbSet<ParcelCustomField> ParcelCustomFields { get; set; }
        public DbSet<TevhidParsel> TevhidParseller { get; set; }

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

            // Görev oluşturan kullanıcı (CreatedByUser navigation ile)
            modelBuilder.Entity<AppTask>()
                .HasOne(t => t.CreatedByUser)
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

            // Harç kategorisi
            modelBuilder.Entity<FeeRate>()
                .HasOne(r => r.Category).WithMany(c => c.FeeRates)
                .HasForeignKey(r => r.CategoryId).OnDelete(DeleteBehavior.SetNull);

            // Harç hesaplama
            modelBuilder.Entity<FeeCalculation>()
                .HasOne(f => f.User).WithMany()
                .HasForeignKey(f => f.UserId).OnDelete(DeleteBehavior.Restrict);

            // Tevhid hesaplama
            modelBuilder.Entity<TevhidCalculation>()
                .HasOne(t => t.CreatedByUser).WithMany()
                .HasForeignKey(t => t.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<TevhidCalculation>()
                .HasOne(t => t.ReviewedByUser).WithMany()
                .HasForeignKey(t => t.ReviewedByUserId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<TevhidCalculation>()
                .HasOne(t => t.Parcel).WithMany()
                .HasForeignKey(t => t.ParcelId).OnDelete(DeleteBehavior.SetNull);
            modelBuilder.Entity<TevhidParsel>()
                .HasOne(p => p.TevhidCalculation).WithMany(t => t.Parseller)
                .HasForeignKey(p => p.TevhidCalculationId).OnDelete(DeleteBehavior.Cascade);

            // Yetki Grupları
            modelBuilder.Entity<UserPermissionGroup>()
                .HasOne(upg => upg.User)
                .WithMany(u => u.UserPermissionGroups)
                .HasForeignKey(upg => upg.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<UserPermissionGroup>()
                .HasOne(upg => upg.PermissionGroup)
                .WithMany(pg => pg.UserPermissionGroups)
                .HasForeignKey(upg => upg.PermissionGroupId)
                .OnDelete(DeleteBehavior.Cascade);

            // Dinamik sayfalar
            modelBuilder.Entity<DynamicPage>()
                .HasOne(p => p.CreatedByUser).WithMany()
                .HasForeignKey(p => p.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<DynamicColumn>()
                .HasOne(c => c.Page).WithMany(p => p.Columns)
                .HasForeignKey(c => c.PageId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<DynamicRow>()
                .HasOne(r => r.Page).WithMany(p => p.Rows)
                .HasForeignKey(r => r.PageId).OnDelete(DeleteBehavior.Cascade);

            // Saatlik izin telafisi
            modelBuilder.Entity<HourlyLeaveCompensation>()
                .HasOne(h => h.User).WithMany()
                .HasForeignKey(h => h.UserId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<HourlyLeaveCompensation>()
                .HasOne(h => h.Ekleyen).WithMany()
                .HasForeignKey(h => h.EkleyenId).OnDelete(DeleteBehavior.Restrict);

            // Harita katmanları
            modelBuilder.Entity<MapLayer>()
                .HasOne(m => m.CreatedByUser).WithMany()
                .HasForeignKey(m => m.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);

            // İmar Planları
            modelBuilder.Entity<ImarPlan>()
                .HasOne(p => p.CreatedByUser).WithMany()
                .HasForeignKey(p => p.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<ImarPlanEk>()
                .HasOne(e => e.ImarPlan).WithMany(p => p.Ekler)
                .HasForeignKey(e => e.ImarPlanId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<ImarPlanEk>()
                .HasOne(e => e.Ekleyen).WithMany()
                .HasForeignKey(e => e.EkleyenId).OnDelete(DeleteBehavior.Restrict);
        }
    }
}
