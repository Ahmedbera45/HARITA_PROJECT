using System.Collections.Generic;

namespace Harita.API.Entities
{
    public class Role : BaseEntity
    {
        public string Name { get; set; } // Bu alan EKSİKTİ veya adı farklıydı (örn: RoleName)

        public ICollection<UserRole> UserRoles { get; set; }

        public Role()
        {
            UserRoles = new List<UserRole>();
        }
    }
}