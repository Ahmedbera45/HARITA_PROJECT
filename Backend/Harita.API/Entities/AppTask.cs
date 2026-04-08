namespace Harita.API.Entities
{
    public class AppTask : BaseEntity
    {
        public required string Title { get; set; }
        public string? Description { get; set; }
        public string Status { get; set; } = "Bekliyor";
        public string Priority { get; set; } = "Orta";
        public DateTime? DueDate { get; set; }

        // Görevi kim oluşturdu?
        public Guid CreatedByUserId { get; set; }
        public User? CreatedByUser { get; set; }

        // Herkes görebilir mi? (atanan kişi yerine "Herkes" seçildi)
        public bool IsHerkes { get; set; } = false;

        // Çoklu atama — TaskAssignment join tablosu üzerinden
        public ICollection<TaskAssignment> Assignments { get; set; } = new List<TaskAssignment>();
    }
}
