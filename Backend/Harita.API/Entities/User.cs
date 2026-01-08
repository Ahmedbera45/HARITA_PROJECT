using System.Collections.Generic;

namespace Harita.API.Entities
{
    public class User : BaseEntity
    {
        public string Name { get; set; }
        public string Surname { get; set; }
        public string Email { get; set; } // Username yerine Email kullanacağız
        public string PasswordHash { get; set; }
        
        // --- EKLENEN KISIMLAR ---
        public string Department { get; set; } // Hata veren Department alanı
        public bool IsActive { get; set; } = true; // Hata veren IsActive alanı (Varsayılan true)

        // İlişkiler
        public ICollection<UserRole> UserRoles { get; set; }
        public ICollection<AppTask> AssignedAppTasks { get; set; }
        public ICollection<AppTask> CreatedAppTasks { get; set; }

        public User()
        {
            UserRoles = new List<UserRole>();
            AssignedAppTasks = new List<AppTask>();
            CreatedAppTasks = new List<AppTask>();
        }
    }
}