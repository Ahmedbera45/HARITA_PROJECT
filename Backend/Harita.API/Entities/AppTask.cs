using System.ComponentModel.DataAnnotations.Schema;

namespace Harita.API.Entities
{
    public class AppTask : BaseEntity
    {
        public required string Title { get; set; }
        public string? Description { get; set; }
        public string Status { get; set; } = "Bekliyor";
        public string Priority { get; set; } = "Orta";
        public DateTime? DueDate { get; set; }

        // --- YENİ EKLENEN ALANLAR ---
        
        // Görevi kime atadık? (Boşsa havuza düşmüş demektir)
        public Guid? AssignedUserId { get; set; }
        
        // Veritabanı ilişkisi (User tablosuyla bağlantı)
        [ForeignKey("AssignedUserId")]
        public User? AssignedUser { get; set; }

        // Görevi kim oluşturdu? (Şef mi, kendisi mi?)
        public Guid CreatedByUserId { get; set; }
    }
}