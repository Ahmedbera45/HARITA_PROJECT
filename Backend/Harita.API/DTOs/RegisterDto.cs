namespace Harita.API.DTOs
{
    public class RegisterDto
    {
        public string Email { get; set; }
        public string Password { get; set; }
        
        // --- EKSİK OLAN ALANLAR BUNLAR ---
        public string Name { get; set; }
        public string Surname { get; set; }
        public string Department { get; set; }
    }
}