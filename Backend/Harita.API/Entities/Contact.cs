namespace Harita.API.Entities
{
    public class Contact : BaseEntity
    {
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public string? Title { get; set; } // Unvan (Örn: Şube Müdürü)
        public string? Institution { get; set; } // Kurum (Örn: Kocaeli Büyükşehir Bel.)
        public string? Department { get; set; } // Birim (Örn: Fen İşleri)
        public string? PhoneNumber { get; set; }
        public string? Email { get; set; }
        public string? Description { get; set; } // Notlar
    }
}