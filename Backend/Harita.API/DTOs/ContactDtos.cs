namespace Harita.API.DTOs
{
    // Listeleme için
    public class ContactDto
    {
        public Guid Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? Title { get; set; }
        public string? Institution { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Email { get; set; }
        public string? Description { get; set; }
    }

    // Ekleme ve Güncelleme için
    public class CreateContactDto
    {
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public string? Title { get; set; }
        public string? Institution { get; set; }
        public string? Department { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Email { get; set; }
        public string? Description { get; set; }
    }

    public class UpdateContactDto : CreateContactDto
    {
    // CreateContactDto'daki her şey burada da geçerli olur (Ad, Soyad vb.)
    // Ekstra bir şeye gerek yok şimdilik.
    }
}